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
      // internal handler, prevent further handling when it returns `false`
      if (this.handler(message) === false) return

      // delegate handler, prevent gossip when it returns `false`
      if (options.handler && options.handler(message) === false) return

      // gossip
      this.mux.send(message)
    })
  }

  handler (message) {
    let { originId, time, id, from, to, path, type, ...data } = message

    const me = this.userId
    const channel = this.mux.get(to || originId)

    switch (type) {
      case 'datachannel':
        if (this.maybeDiscardNegotiation(message)) return false // handled
        this.mux.add(data.datachannel, 'datachannel')
        return false // handled

      case 'offer':
        if (!to && this.isConnectedTo(from)) break
        if (this.maybeDiscardNegotiation(message)) return false // handled
        if (!to && from !== me) {
          debug.color(originId, me, 'receive offer from', from, message.meta)
          this.createPeer(message)
          return false // handled
        }
        break

      case 'answer':
        if (!channel) break // gossip
        if (this.maybeDiscardNegotiation(message)) return false // handled
        if (from !== me) {
          debug.color(to, me, 'receive answer from', from, message.meta)
        }
        break
    }
  }

  discover (to) {
    this.createPeer(to)
  }

  createPeer (what) {
    const peer = this.mux.add(new Peer(), 'peer', { open: true })
    once(peer.channel, 'connect', () => {
      emit(this, 'peer', peer)
      debug(this.userId, 'connect to', peer.channel.remotePeer.userId, `(via ${peer.channel.type})`, [peer.channelId])
    })
    if (typeof what === 'object') peer.send(what)
    else {
      if (typeof what === 'string') {/* TODO */}
      const datachannel = peer.channel.createDataChannel('data')
      emit(peer.channel, 'datachannel', datachannel)
    }
    return peer
  }

  get peers () {
    return this.mux.getAll('peer')
  }

  get connectedPeers () {
    return this.peers.filter(peer => peer.channel.connected)
  }

  isConnectedTo (userId) {
    return this.connectedPeers.find(peer => peer.channel.remotePeer?.userId === userId)
  }

  getRemotePeer (userId) {
    return this.peers.find(peer => peer.channel.remotePeer?.userId === userId)
  }

  destroy () {
    [...this.peers].forEach(peer => peer.close())
    this.http.close()
    // TODO: debug gc
  }

  maybeDiscardNegotiation (message) {
    const { from, to, path, type } = message
    if (from === this.userId) return
    const peer = this.getRemotePeer(from)
    if (peer?.channel.connected) return true
    if (peer && from < this.userId) {
      debug(to, this.userId, 'discard', message.type, ': already negotiating')
      this.mux.get(to).close()
      return true
    }
  }

  print (all = false) {
    return `${this.userId} ${[...(all ? this.peers : this.connectedPeers)].join` `}`
  }
}
