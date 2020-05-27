import debug from './lib/debug.js'
import { emit, on, once, pipe } from './lib/events.js'
import randomId from './lib/random-id.js'
import findBy from './lib/find-by.js'
import now from './lib/monotonic-timestamp.js'
import Peer from './peer.js'
import Message from './message.js'
import HttpChannel from './http-channel.js'
import ChannelMux from './channel-mux.js'

export default class Swarm extends EventTarget {
  constructor (options) {
    super()

    this.userId = options.userId
    this.origin = options.origin
    this.peers = new Set()
    this.http = new HttpChannel(`${this.origin}/?user_id=${this.userId}`)
    this.mux = new ChannelMux()
    this.mux.userId = this.userId
    this.mux.add(this.http)
    this.format = this.format.bind(this)

    on(this.mux, 'message', message => {
      // message = new Message(message)

      // if (message.type === 'gossip') { // unwrap gossip
      //   message = new Message(message.data)
      // }

      const { to, type } = message

      // // emit message for external observers
      // emit(this, 'message', { channel, message })

      // // sugar for personal message observers
      // if (to === this.userId) emit(this, type, { channel, ...message })

      // internal handler, prevent further handling when it returns `false`
      if (this.handler(message) === false) return

      // delegate handler, prevent gossip when it returns `false`
      if (options.handler && options.handler(message) === false) return

      // if we reach here and it's not me, it's gossip
      if (to !== this.userId)
        this.mux.send(message) //: this.format({ type: 'gossip', text: `${message}` })})
    })
  }

  handler (message) {
// console.log(this.userId, 'receive', message)
    const { channel, time, id, to, from, type, peerId, ...data } = message
// if (from === this.userId) return
if (channel.userId === this.userId) return
    switch (type) {
      case 'offer':
        if ((!to && from !== this.userId) || to === this.userId) { // no "to", assume offer is from private channel
          // discard negotiation if already negotiating (or connected) with peer
          // TODO: this terminates early so the remote stays with hanged peers
          // maybe we can republish on the incoming channel or p2p ?
          if (this.maybeDiscardNegotiation(message)) return false
          debug(this.userId, 'receive offer from', from, [peerId])
          const peer = new Peer()
          peer.peerId = peerId // set local peer id to match remote's so they can match
          peer.userId = this.userId
          peer.remoteUserId = from // match peer with remote user id
          // peer.channel = channel
          // send first message over originating channel back to the initiator
          // pipe(peer, 'message', channel, message => ({ channel, message: this.format({ from: this.userId, to: from, ...message }) }), { once: true })
          // once(peer, 'message', message => channel.send(this.format(message)))
          once(peer, 'datachannel', channel => {
            channel.isData = true
            // if (this.maybeDropPeer(peer)) return
            debug(this.userId, 'connected', peer.remoteUserId, '(via offer)', [peer.peerId])
            this.mux.add(channel)
            peer.connected = true
            // peer.channel = channel
            // on(peer, 'message', message => emit(channel, 'message', message))
            // pipe(peer, 'message', this.mux, message => ({ channel, message: this.format(message) })) // pipe rest of internal peer messages over mux
            emit(this, 'peer', peer) // emit new peer for external observers
          })
          once(peer, 'close', () => this.peers.delete(peer))
          // emit(peer, 'offer', message)
          this.mux.add(peer, true)
          this.peers.add(peer)
          peer.send(message)
          return false // prevent further handling
        } else if (to && from === this.userId) {
          if (this.maybeDiscardNegotiation(message)) return false
          const peer = findBy('peerId', this.peers, peerId)
          if (channel !== peer) {
            peer.send(message)
            return false
          }
        }
        break

      case 'answer':
        if (to === this.userId) {
          // discard negotiation if already negotiating (or connected) with peer
          // TODO: this terminates early so the remote stays with hanged peers
          // maybe we can republish on the incoming channel or p2p ?
          if (this.maybeDiscardNegotiation(message)) return false
          debug(this.userId, 'receive answer from', from, [peerId])
          const peer = findBy('peerId', this.peers, peerId)
          if (peer) {
            peer.remoteUserId = from
            peer.send(message)
            return false // prevent further handling
          }
        } else if (from === this.userId) {
          if (this.maybeDiscardNegotiation(message)) return false
          // return false
          const peer = findBy('peerId', this.peers, peerId)
          if (channel !== peer) {
            peer.send(message)
            return false
          }

        }
        break
    }
  }

  discover (to) {
    const peer = new Peer()
    peer.userId = this.userId
    if (to) {
      peer.remoteUserId = to
      // peer.channel = this.mux
      // once(peer, 'message', message => this.mux.send({ message: this.format(message) })) //message => ({ channel, message: this.format({ to, ...message }) }), { once: true })
    } else {
      // peer.channel = this.http
      // once(peer, 'message', message => this.http.send(this.format(message)))
    }
    const channel = peer.createDataChannel('data')
    channel.isData = true
    once(channel, 'open', () => {
      // if (this.maybeDropPeer(peer)) return
      debug(this.userId, 'connected', peer.remoteUserId, '(via answer)', [peer.peerId])
      peer.connected = true
      emit(this, 'peer', peer) // emit new peer for external observers
    })
    once(peer, 'close', () => this.peers.delete(peer))

    //TODO: attach(peer, this.mux)
    // so makes possible: attach(peer, this.http)
    // or pipe(peer, ?)
    // or proxy?

    this.mux.add(channel)
    this.mux.add(peer, true)
    this.peers.add(peer)
  }

  format (message) {
    return new Message({
      time: now(),
      id: randomId(),
      from: this.userId,
      ...message
    })
  }

  get connectedPeers () {
    return new Set([...this.peers].filter(peer => peer.connected))
  }

  destroy () {
    [...this.peers].forEach(peer => peer.close())
    this.http.close()
    // TODO: remove handlers
  }

  maybeDiscardNegotiation ({ peerId, from, type }) {
    const peer = findBy('remoteUserId', this.peers, from)
    if (peer && peer.peerId < peerId) {
      debug(this.userId, 'discarding', type, 'from', from, [peerId], 'already negotiating', [peer.peerId])
      return true
    }
  }

  print (all = false) {
    return `${this.userId} ${[...(all ? this.peers : this.connectedPeers)].join` `}`
  }
}
