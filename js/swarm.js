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

    this.userId = opts.userId ?? randomId()

    this.debug = debug.origin(this.userId)

    this.origin = opts.origin ?? window.ORIGIN ?? document.location.origin
    this.http = new HttpChannel(`${this.origin}/?user_id=${this.userId}`)

    this.peers = new Set
    this.data = { in: new Set, out: new Set }

    on(this, 'message', message => {
      if (message.channel?.data) {
        if (message.channel.data.in.has(message.meta)) return
        if (message.channel.data.out.has(message.meta)) return
        message.channel.data.in.add(message.meta)
      }
      if (this.data.in.has(message.meta)) return
      if (this.data.out.has(message.meta)) return
      this.data.in.add(message.meta)

      this.debug.color(message.id, this.userId, 'receive', message.meta)

      if (!emit(this, message.type, message)) return // exit if message handled

      if (message.rpc) return

      this.send(message)
    })

    on(this, 'offer', (message, event) => {
      if (!message.to) { // no "to", new connection offer
        if ([...this.connectedPeers].find(peer => peer.remote.userId === message.from)) return
        event.preventDefault()
        ;(async () => {
          this.debug('channel id', message.channelId)
          const peer = await this.createPeer({ channelId: message.channelId })
          peer.setRemoteDescription(message)
          const desc = await peer.create('answer')
          message.channel.send(new Message({
            from: this.userId,
            to: message.from,
            id: message.id,
            rpc: message.rpc,
            peerId: peer.id,
            ...desc
          }))
        })()
      }
    })

    this.listen(this.http)

    on(this, 'peer', peer => {
      clearTimeout(peer.timeout)
    })
  }

  get connectedPeers () {
    return [...this.peers].filter(peer => peer.connected)
  }

  broadcast (message) {
    message = new Message(message)
    this.send({ ...message, from: this.userId })
  }

  send (message) {
    message = new Message(message)
    if (this.data.out.has(message.meta)) return
    this.data.out.add(message.meta)
    for (const peer of this.connectedPeers) {
      if (peer !== message.channel) {
        if (peer.data.in.has(message.meta)) continue
        if (peer.data.out.has(message.meta)) continue
        peer.data.out.add(message.meta)
        this.debug.color(message.id, this.userId, 'send to', peer.id, message.meta)
        try { peer.channel.send(message) } catch (error) { this.debug.color(message.id, error) }
      }
    }
  }

  listen (channel) {
    on(channel, 'message', message => {
      emit(this, 'message', new Message({
        ...Message.parse(message),
        channel
      }))
    })
  }

  async createPeer ({ channelId } = {}) {
    const peer = new Peer({ channelId })
    once(peer, 'open', () => emit(this, 'peer', peer))
    once(peer, 'close', () => this.peers.delete(peer))
    peer.timeout = setTimeout(() => {
      this.debug('timed out', peer)
      emit(peer, 'close')
    }, 5 * 1000)
    this.peers.add(peer)
    this.listen(peer)
    return peer
  }

  async discover (channel = this.http) {
    const peer = await this.createPeer()
    const desc = await peer.create('offer')
    const answer = await this.rpc(channel, { channelId: peer.channel.id, peerId: peer.id, ...desc })
    const other = [...this.peers].find(p => p.remote && p.remote.userId === answer.from)
    if (other) {
      if (other.channel.id > peer.channel.id) {
        this.debug('drop', peer.id)
        peer.close()
        return
      }
    }
    peer.setRemoteDescription(answer)
  }

  rpc (channel, message) {
    message = new Message({ from: this.userId, ...message })
    message.rpc = message.id
    channel.send(message)
    return new Promise(resolve => {
      const listener = on(channel, 'message', remoteMessage => {
        remoteMessage = new Message(remoteMessage)
        if (remoteMessage.rpc === message.rpc) {
          off(listener)
          resolve(remoteMessage)
        }
      })
    })
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

