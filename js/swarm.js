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
      debug.color(message.id, this.userId, 'receive', message.meta)

      if (!emit(this, message.type, message)) return // exit if message handled

      // gossip
      this.send(message)
    })

    on(this, 'offer', async (message, event) => {
      if (this.peers.find(peer => peer.id.split`.`.includes(message.from))) {
        return // not handled
      }
      event.preventDefault() // handling event
      const peer = new Peer()
      peer.userId = this.userId
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
      peer.setLocalDescription(await peer.createAnswer())
    })

    on(this, 'answer', (message, event) => {
      if (message.to !== this.userId) return // not handled
      event.preventDefault() // handling event
      const peer = this.peers.find(peer => message.id.startsWith(peer.id))
      if (!peer) {
        // TODO: this happens rarely when both are in flight, why?
        // and find a way to test it (maybe send timed replies)
        debug(this.print())
        debug('!?!?!?', message)
        return
      }
      peer.id = message.id
      if (this.peers.find(peer => peer.id.split`.`[1] === message.from)?.id > peer.id) {
        peer.close()
        return
      }
      peer.setRemoteDescription(message)
    })

    on(this, 'request-media', async ({ channel, media }, event) => {
      event.preventDefault()

      const { peer } = channel

      once(this, 'answer-media', (desc, event) => {
        event.preventDefault()
        peer.setRemoteDescription({ ...desc, type: 'answer' })
      })

      once(peer, 'remotestream', remoteStream => {
        debug(peer + ' swarm receive stream')
      })

      const localStream = await navigator.mediaDevices.getUserMedia(media)
      peer.setLocalStream(localStream)
      peer.setLocalDescription(await peer.createOffer({ iceRestart: true }))

      once(peer, 'localdescription', desc => channel.send(new Message({
        ...desc,
        media,
        from: this.userId,
        type: 'offer-media'
      })))
    })

    on(this, 'offer-media', async ({ channel, media, ...desc }, event) => {
      event.preventDefault()

      const { peer } = channel

      once(peer, 'remotestream', remoteStream => {
        debug(peer + ' receive stream')
      })

      peer.setRemoteDescription({ ...desc, type: 'offer' })

      const localStream = await navigator.mediaDevices.getUserMedia(media)
      peer.setLocalStream(localStream)
      peer.setLocalDescription(await peer.createAnswer({ iceRestart: true }))

      once(peer, 'localdescription', desc => channel.send(new Message({
        ...desc,
        from: this.userId,
        type: 'answer-media'
      })))
    })

    on(this, 'offer-quit-media', ({ channel, media, ...desc }, event) => {
      event.preventDefault()

      const { peer } = channel

      once(peer, 'signalingstatechange', () => {
        once(peer, 'signalingstatechange', () => {
          emit(peer, 'endedmedia', media)
        })

        peer.removeMedia(media, true)
      })

      peer.setRemoteDescription({ ...desc, type: 'offer' })
      // debug.color('#f00', 'after this should remove media')

      once(peer, 'localdescription', desc => channel.send(new Message({
        ...desc,
        from: this.userId,
        type: 'answer-quit-media',
        media
      })))
    })

    on(this, 'answer-quit-media', ({ channel, media, ...desc }, event) => {
      event.preventDefault()
      const { peer } = channel
      once(peer, 'signalingstatechange', () => {
        emit(peer, 'endedmedia', media)
      })
      peer.setRemoteDescription({ ...desc, type: 'answer' })
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
        debug.color(message.id, this.userId, 'send to', channel.peer.id, message.meta)
        try { channel.send(message) } catch (error) { debug.color(message.id, error) }
      }
    }
  }

  async discover (channel = this.http) {
    const peer = new Peer()
    peer.userId = this.userId
    this.peers.push(peer)
    peer.id = peer.id + '.' + this.userId
    once(peer, 'localdescription', desc => channel.send(new Message({
      from: this.userId,
      id: peer.id,
      ...desc
    })))
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
