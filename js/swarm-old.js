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

    this.peers = []
    this.channels = new Set()
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

      // gossip
      this.send(message)
    })

    on(this, 'offer', (message, event) => {
      let peer

      peer = this.peers.find(peer => peer.id === message.remote)

      if (peer) {
        event.preventDefault() // handling event

        if (message.media) {
          // if (peer.media.video !== message.media.video) {
          //   if (message.media.video === true) {
          //     peer.removeMedia({ video: true })
          //     return
          //   }
          // }

          // if (peer.media.audio !== message.media.audio) {
          //   if (message.media.audio === true) {
          //     peer.removeMedia({ audio: true })
          //     return
          //   }
          // }

          peer.setRemoteDescription(message)
          peer.addMedia(message.media, true)
          return
        }

        throw new Error('unhandled?')
      }

      peer = this.peers.find(peer => peer.remote.userId === message.from)
      if (peer) return // already connected, not handled

      event.preventDefault() // handling event

      peer = this.createPeer({
        remote: {
          userId: message.from,
          id: message.local,
          channel: message.channel,
        }
      })

      // once(peer, 'localdescription', desc => {
      //   message.channel.send(new Message({
      //     from: this.userId,
      //     to: message.from,
      //     id: peer.id,
      //     ...desc
      //   }))
      // })

      once(peer, 'connected', () => emit(this, 'peer', peer))
      once(peer, 'datachannel', channel => this.createChannel(peer, channel))

      peer.setRemoteDescription(message)
      peer.createAnswer().then(answer => peer.setLocalDescription(answer))
    })

    on(this, 'answer', (message, event) => {
      const peer = this.peers.find(peer => peer.id === message.remote)
      if (!peer) return

      // if (message.to !== this.userId) return // not handled

      event.preventDefault() // handling event


      // if (!peer) {
      //   // TODO: this happens rarely when both are in flight, why?
      //   // and find a way to test it (maybe send timed replies)
      //   this.debug(this.print())
      //   this.debug('!?!?!?', message)
      //   return
      // }

      // if (peer.remote.id) {
        if (peer.remote.id && this.peers.find(peer => peer.remote.userId === message.from)?.id > message.local) {
          this.debug('already connecting with peer, closing', peer.id)
          peer.close()
          return
        }
      // }

        peer.remote.userId = message.from
        peer.remote.id = message.local
        peer.remote.channel = message.channel
      // } else {
      //   if (message.media) {
      //     peer.setRemoteDescription(message)
      //     return
      //   }
      // }
this.debug('HERE')
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
    once(channel, 'open', () => {
      this.channels.add(channel)
      peer.remote.channel = channel
      emit(this, 'dataopen', channel)
    })
    once(channel, 'close', () => this.channels.delete(channel))
  }

  broadcast (message) {
    message = new Message(message)
    this.send({ ...message, from: this.userId })
  }

  send (message) {
    message = new Message(message)
    if (this.data.out.has(message.meta)) return
    this.data.out.add(message.meta)
    for (const channel of this.channels) {
      if (channel !== message.channel) {
        if (channel.data.in.has(message.meta)) continue
        if (channel.data.out.has(message.meta)) continue
        channel.data.out.add(message.meta)
        this.debug.color(message.id, this.userId, 'send to', channel.peer.id, message.meta)
        try { channel.send(message) } catch (error) { this.debug.color(message.id, error) }
      }
    }
  }

  // requestMedia (peer, media) {
  //   peer.media = media
  //   peer.remote.channel.send(new Message({
  //     from: this.userId,
  //     to: peer.remote.userId,
  //     local: peer.id,
  //     remote: peer.remote.id,
  //     media,
  //     type: 'request-media'
  //   }))
  // }

  createPeer ({ id, remote }) {
    const peer = new Peer()
    this.peers.push(peer)
    peer.userId = this.userId
    peer.remote = remote
    peer.media = {}

    on(peer, 'localdescription', desc => {
      this.debug(peer.id, 'send desc to', peer.remote.id, peer.remote.userId)
      peer.remote.channel.send(new Message({
        from: this.userId,
        to: peer.remote.userId,
        local: peer.id,
        remote: peer.remote.id,
        media: peer.media,
        ...desc
      }))
    })

    once(peer, 'connected', () => emit(this, 'peer', peer))

    return peer
  }

  async discover (channel = this.http) {
    const peer = this.createPeer({ remote: { channel } })

    // once(peer, 'localdescription', desc => {
    //   channel.send(new Message({
    //     from: this.userId,
    //     id: peer.id,
    //     ...desc
    //   }))
    // })

    once(peer, 'connected', () => emit(this, 'peer', peer))

    this.createChannel(peer)

    peer.setLocalDescription(await peer.createOffer())
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
