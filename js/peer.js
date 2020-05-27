import debug from './lib/debug.js'
import { emit, on, once } from './lib/events.js'
import randomId from './lib/random-id.js'

export default class Peer extends RTCPeerConnection {
  constructor (options = {
      iceServers: [
        // { urls: ['stun:stun1.l.google.com:19302'] },
        // { urls: ['stun:stun2.l.google.com:19302'] },
      ]
    }) {
//TODO: initiate: true
    super(options)

    on(this, 'negotiationneeded', async () => {
      this.type = 'offer'
      this.setLocalDescription(await this.createOffer())
    })

    on(this, 'icegatheringstatechange', () => {
      if (this.iceGatheringState === 'complete') {
        emit(this, 'message', {
          to: this.remotePeerMessage?.originId,
          remoteUserId: this.remotePeerMessage?.userId,
          ...this.localDescription.toJSON()
        })
      }
    })

    once(this, 'datachannel', channel => {
      emit(this, 'message', { type: 'datachannel', datachannel: channel })
    })
  }

  async send (message) {
    if (message.userId === this.userId) return

    if (message.type === 'offer' && !this.type) {
      this.type = 'answer'
      this.setRemotePeer(message)
      this.setLocalDescription(await this.createAnswer())
    } else if (message.type === 'answer' && this.type === 'offer') {
      this.setRemotePeer(message)
    }
  }

  setRemotePeer (message) {
    this.remotePeerMessage = message
    this.setRemoteDescription(message)
  }

  toString () {
    return `[${this.userId} ${this.type} ${this.remotePeerMessage?.userId || '(pending)'}]`
  }
}
