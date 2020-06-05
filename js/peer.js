import debug from './lib/debug.js'
import { emit, on, once, off } from './lib/events.js'
import randomId from './lib/random-id.js'
import Message from './message.js'

let channelId = 0

export default class Peer extends EventTarget {
  constructor (opts = {}) {
    super()
    this.id = opts.id ?? randomId()
    this.debug = debug.origin(this.id)
    this.media = {}
    this.data = { in: new Set, out: new Set }
    this.peer = new RTCPeerConnection({ sdpSemantics: 'unified-plan', ...opts })
    this.channel = this.peer.createDataChannel('data', { negotiated: true, id: opts.channelId ?? channelId++ })
    on(this.peer, 'track', event => {
      // debug(this + ' add remote stream', stream?.getTracks()[0].kind)
      if (this.remoteStream) {
        this.remoteStream.addTrack(event.track)
      } else {
        this.remoteStream = event.streams[0]
      }
      emit(this, 'remotestream', this.remoteStream)
    })

    on(this.channel, 'message', async message => {
      message = new Message(message)
      this.debug('receive', Object.keys(message))
      if (message.media) {
        const stream = await navigator.mediaDevices.getUserMedia(message.media)
        this.media = { ...this.media, ...message.media }
        this.peer.setRemoteDescription(message)
        this.setLocalStream(stream)
        const desc = await this.create('answer')
        this.channel.send(new Message({
          id: message.id,
          rpc: message.rpc,
          ...desc
        }))
        return
      }
      if (message.removeMedia) {
        this.removeMedia(message.removeMedia, message)
        return
      }
      emit(this, 'message', message)
    })
    once(this.channel, 'open', () => emit(this, 'open'))
    once(this.channel, 'close', () => emit(this, 'close'))
  }

  send (message) {
    this.channel.send(message)
  }

  close () {
    this.peer.close()
  }

  get connected () {
    return this.channel.readyState === 'open'
  }

  async create (type) {
    this.debug('creating', type)
    const ld = this.getLocalDescription()
    const desc = await this.peer[type === 'offer' ? 'createOffer' : 'createAnswer']({ iceRestart: true })
    this.peer.setLocalDescription(desc)
    return ld
  }

  async addMedia (media, type = 'offer') {
    const stream = await navigator.mediaDevices.getUserMedia(media)
    this.media = { ...this.media, ...media }
    this.setLocalStream(stream)
    const desc = await this.create('offer')
    const answer = await this.rpc({ media, ...desc })
    this.peer.setRemoteDescription(answer)
  }

  async removeMedia (media, offer) {
    // once(this, 'negotiationneeded', () => {
    //   emit(this, 'localdescription', this.localDescription.toJSON())
    // })
    const removeMedia = media
    media = Object.keys(media)

    // this removes the tracks from the rtc sender stream
    this.peer.getSenders()
      .filter(sender => media.includes(sender?.track?.kind))
      .map(sender => this.peer.removeTrack(sender, this.localStream))

    // these stop and remove the tracks from the dom media streams
    if (this.localStream) this.localStream
      .getTracks()
      .filter(track => media.includes(track.kind))
      .map(track => {
        track.stop()
        this.localStream.removeTrack(track)
      })

    if (this.remoteStream) this.remoteStream
      .getTracks()
      .filter(track => media.includes(track.kind))
      .map(track => {
        track.stop()
        this.remoteStream.removeTrack(track)
      })

    // if there are no more tracks left, delete streams
    if (this.localStream && this.localStream.getTracks().length === 0) {
      this.localStream = null
    }

    if (this.remoteStream && this.remoteStream.getTracks().length === 0) {
      this.remoteStream = null
    }

    emit(this, 'localstream', this.localStream)
    emit(this, 'remotestream', this.remoteStream)

    if (!offer) {
      const desc = await this.create('offer')
      const answer = await this.rpc({ removeMedia, ...desc })
      this.peer.setRemoteDescription(answer)
    } else {
      this.peer.setRemoteDescription(offer)
      const desc = await this.create('answer')
      this.channel.send(new Message({
        id: offer.id,
        rpc: offer.rpc,
        ...desc
      }))
    }

    emit(this, 'endedmedia')
  }

  setLocalStream (stream) {
    if (this.localStream) {
      stream.getTracks().map(track => this.localStream.addTrack(track))
    } else {
      this.localStream = stream
    }
    stream.getTracks().map(track => this.peer.addTrack(track, this.localStream))
    emit(this, 'localstream', this.localStream)
  }

  rpc (message) {
    message = new Message(message)
    message.rpc = message.id
    this.channel.send(message)
    this.debug('send rpc', Object.keys(message))
    return new Promise(resolve => {
      const listener = on(this.channel, 'message', remoteMessage => {
        remoteMessage = new Message(remoteMessage)
        this.debug('receive rpc', Object.keys(message))
        if (remoteMessage.rpc === message.rpc) {
          off(listener)
          resolve(remoteMessage)
        }
      })
    })
  }

  setRemoteDescription (desc) {
    this.remote = { userId: desc.from, id: desc.peerId }
    this.peer.setRemoteDescription(desc)
  }

  getLocalDescription () {
    return new Promise(resolve => {
      const complete = () => {
        off(listener)
        clearTimeout(timeout)
        resolve(this.peer.localDescription.toJSON())
      }
      const listener = on(this.peer, 'icegatheringstatechange', () => {
        if (this.peer.iceGatheringState === 'complete') complete()
      })
      const timeout = setTimeout(complete, 5 * 1000)
    })
  }

  toString () {
    return `[${this.id} ${this.remote?.userId??'-'} ${this.channel.readyState}]`
  }
}
