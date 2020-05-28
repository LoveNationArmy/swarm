import debug from './lib/debug.js'
import { emit, on, once, off } from './lib/events.js'
import randomId from './lib/random-id.js'
import Peer from './peer.js'
import Message from './message.js'
import HttpChannel from './http-channel.js'

export default class Swarm extends EventTarget {
  constructor (opts = {}) {
    super()

    if (typeof opts === 'string') opts = { userId: opts }

    this.userId = opts.userId
    this.origin = opts.origin ?? window.ORIGIN ?? document.location.origin
    this.http = new HttpChannel(`${this.origin}/?user_id=${this.userId}`)

    this.peers = []
    this.channels = new Set()
    this.data = { in: new Set, out: new Set }

    on(this, 'message', message => {
      if (message.channel?.data) {
        if (message.channel.data.in.has(message.id)) return
        if (message.channel.data.out.has(message.id)) return
        message.channel.data.in.add(message.id)
      }
      if (this.data.in.has(message.id)) return
      if (this.data.out.has(message.id)) return
      debug.color(message.id, this.userId, 'receive', message.meta)
      this.data.in.add(message.id)

      if (!emit(this, message.type, message)) return // exit if message handled

      // gossip
      this.send(message)
    })

    on(this, 'offer', (message, event) => {
      if (this.peers.find(peer => peer.id.split`.`.includes(message.from))) {
        return // not handled
      }
      event.preventDefault() // handling event
      const peer = new Peer()
      this.peers.push(peer)
      peer.id = message.id + '.' + this.userId
      once(peer, 'localdescription', desc => message.channel.send(new Message({
        from: this.userId,
        to: message.from,
        id: peer.id,
        ...desc
      })))
      once(peer, 'connected', () => emit(this, 'peer', peer))
      once(peer, 'datachannel', channel => this.createChannel(peer, channel))
      peer.setRemoteDescription(message)
    })

    on(this, 'answer', (message, event) => {
      if (message.to !== this.userId) return // not handled
      event.preventDefault() // handling event
      const peer = this.peers.find(peer => message.id.startsWith(peer.id))
      peer.id = message.id
      if (this.peers.find(peer => peer.id.split`.`[1] === message.from)?.id > peer.id) {
        peer.close()
        return
      }
      peer.setRemoteDescription(message)
    })

    on(this.http, 'message', message => emit(this, 'message', new Message({
      ...Message.parse(message),
      channel: this.http
    })))

    on(this, 'peer', peer => {
      once(peer, 'close', () => this.peers.splice(this.peers.indexOf(peer), 1))
    })
  }

  createChannel (peer, channel = peer.createDataChannel('data')) {
    channel.peer = peer
    channel.data = { in: new Set, out: new Set }
    on(channel, 'message', message => {
      emit(this, 'message', new Message({ ...Message.parse(message), channel }))
    })
    once(channel, 'open', () => (this.channels.add(channel), emit(this, 'dataopen', channel)))
    once(channel, 'close', () => this.channels.delete(channel))
  }

  send (message) {
    message = new Message(message)
    if (this.data.out.has(message.id)) return
    this.data.out.add(message.id)
    for (const channel of this.channels) {
      if (channel !== message.channel) {
        if (channel.data.in.has(message.id)) continue
        if (channel.data.out.has(message.id)) continue
        channel.data.out.add(message.id)
        debug.color(message.id, this.userId, 'send to', channel.peer.id, message.meta)
        try { channel.send(message) } catch (error) { debug.color(message.id, error) }
      }
    }
  }

  discover (channel = this.http) {
    const peer = new Peer()
    this.peers.push(peer)
    peer.id = peer.id + '.' + this.userId
    once(peer, 'localdescription', desc => channel.send(new Message({
      from: this.userId,
      id: peer.id,
      ...desc
    })))
    once(peer, 'connected', () => emit(this, 'peer', peer))
    this.createChannel(peer)
  }

  get connectedPeers () {
    return this.peers.filter(peer => peer.connectionState === 'connected')
  }

  destroy () {
    [...this.peers].forEach(peer => peer.close())
    this.http.close()
    // TODO: debug gc
  }

  print (all = false) {
    return `${this.userId} ${[...(all ? this.peers : this.connectedPeers)].join` `}`
  }
}
