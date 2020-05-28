import debug from './lib/debug.js'
import { emit, on, once } from './lib/events.js'
import randomId from './lib/random-id.js'

export default class Peer extends RTCPeerConnection {
  constructor (options = {
      iceServers: [
        { urls: ['stun:stun1.l.google.com:19302'] },
        { urls: ['stun:stun2.l.google.com:19302'] },
      ]
    }) {
//TODO: initiate: true
    super(options)

    this.connected = false

    on(this, 'negotiationneeded', async () => {
      this.type = 'offer'
      this.setLocalDescription(await this.createOffer())
    })

    on(this, 'icegatheringstatechange', () => {
      if (this.iceGatheringState === 'complete') {
        emit(this, 'message', {
          to: this.remotePeer?.originId,
          remoteUserId: this.remotePeer?.userId,
          ...this.localDescription.toJSON()
        })
      }
    })

    once(this, 'datachannel', channel => {
      emit(this, 'message', { type: 'datachannel', datachannel: channel })
      once(channel, 'open', () => this.connected = true)
      once(channel, 'open', () => emit(this, 'connect'))
      once(channel, 'close', () => this.connected = false)
    })
  }

  async send (message) {
    if (message.from && message.from === this.userId) return

    debug.color(message.originId, this.userId, 'receive', message.type, 'from', message.from, message.meta)

    if (message.type === 'offer' && !this.type) {
      this.type = 'answer'
      this.setRemotePeer(message)
      this.setLocalDescription(await this.createAnswer())
    } else if (message.type === 'answer' && this.type === 'offer') {
      this.setRemotePeer(message)
    }
  }

  setRemotePeer (message) {
    this.remotePeer = message
    this.setRemoteDescription(message)
  }

  toString () {
    return `[${this.userId} ${this.type} ${this.remotePeer?.userId || '(pending)'}]`
  }
}
