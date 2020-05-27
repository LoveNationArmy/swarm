import debug from './lib/debug.js'
import { emit, on, once } from './lib/events.js'
import randomId from './lib/random-id.js'
import findBy from './lib/find-by.js'
import Peer from './peer.js'
import Message from './message.js'
import HttpChannel from './http-channel.js'
import ChannelMux from './channel-mux.js'

export default class Swarm extends EventTarget {
  constructor (options) {
    super()

    this.userId = options.userId
    this.origin = options.origin
    this.mux = new ChannelMux()
    this.mux.channelId = this.userId
    this.http = this.mux.add(new HttpChannel(`${this.origin}/?user_id=${this.userId}`), 'http')
    // this.format = this.format.bind(this)

    on(this.mux, 'message', message => {
      // message = new Message(message)

      // if (message.type === 'gossip') { // unwrap gossip
      //   message = new Message(message.data)
      // }

      // const { to, type } = message

      // // emit message for external observers
      // emit(this, 'message', { channel, message })

      // // sugar for personal message observers
      // if (to === this.userId) emit(this, type, { channel, ...message })

      // internal handler, prevent further handling when it returns `false`
      if (this.handler(message) === false) return

      // delegate handler, prevent gossip when it returns `false`
      if (options.handler && options.handler(message) === false) return

      // if we reach here and it's not me, it's gossip
      // if (to !== this.userId)
      this.mux.send(message) //: this.format({ type: 'gossip', text: `${message}` })})
    })
  }

  handler (message) {
    let { time, id, to, path, type, ...data } = message

    let [channelId, from] = path
    const channel = this.mux.channels[channelId]
// console.log('here', path, Object.values(this.mux.channels).map(c => c.toString()))
    switch (type) {
      case 'datachannel':
        if (this.maybeDiscardNegotiation(message)) return false
        {
          const peer = channel
          const datachannel = data.datachannel
          this.mux.add(datachannel, 'datachannel')
          once(datachannel, 'open', () => {
            peer.connected = true
            debug(this.userId, 'connected', peer.channel.remotePeerMessage.userId, `(via ${peer.channel.type})`, [peer.channelId])
            emit(this, 'peer', peer) // emit new peer for external observers
          })
          return false
        }
        break

      case 'offer':
        if (!to && this.connectedPeers.find(peer => peer.channel.remotePeerMessage?.userId === from)) {
          break // not for us
        }

        if (this.maybeDiscardNegotiation(message)) return false

        if (!to && from !== this.userId) {
          debug.color(message.originId, this.userId, 'receive offer from', message.userId, message.meta)
          // debug.color(message.originId, message.meta)
          const peer = this.mux.add(new Peer(), 'peer', { open: true })
          peer.send(message)
          return false // terminate distribution, this peer handles it
        }
        break

      case 'answer':
        if (!this.mux.channels[to]) break // not for us
        if (this.maybeDiscardNegotiation(message)) return false
        if (from !== this.userId) {
          debug.color(to, this.userId, 'receive answer from', message.userId, message.meta)
        }
        break
    }
  }

  discover (to) {
    const peer = this.mux.add(new Peer(), 'peer', { open: true })
    emit(peer.channel, 'datachannel', peer.channel.createDataChannel('data'))
    // if (to) peer.channel.remoteUserId = to
  }

  get peers () {
    return Object
      .entries(this.mux.channels)
      .filter(([key, value]) => key.split`.`[1] === 'peer')
      .map(([key, value]) => value)
  }

  get connectedPeers () {
    return this.peers.filter(peer => peer.connected)
  }

  destroy () {
    [...this.peers].forEach(peer => peer.close())
    this.http.close()
    // TODO: remove handlers
  }

  maybeDiscardNegotiation (message) {
    const { path, type } = message
    const [peerId, from] = path
    if (from === this.userId) return
    const peer = this.peers.find(peer => peer.channel.remotePeerMessage?.userId === from)
    if (peer) {
      if (peer.connected) return true
      if (peer.channel.remotePeerMessage.userId < this.userId) {
        debug(message.to || message.originId, this.userId, 'discard - already negotiating')
        this.mux.channels[message.to].close()
        return true
      }
    }
  }

  print (all = false) {
    return `${this.userId} ${[...(all ? this.peers : this.connectedPeers)].join` `}`
  }
}
