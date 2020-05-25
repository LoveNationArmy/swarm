import { emit, on } from './lib/events.js'
import randomId from './lib/random-id.js'

export default class Peer extends RTCPeerConnection {
  constructor (options = {
      iceServers: [
        { urls: ['stun:stun1.l.google.com:19302'] },
        { urls: ['stun:stun2.l.google.com:19302'] },
      ]
    }) {

    super(options)

    this.id = randomId()

    on(this, 'negotiationneeded', async () => {
      this.setLocalDescription(await this.createOffer())
    })

    on(this, 'offer', async (message) => {
      this.setRemoteDescription(message)
      this.setLocalDescription(await this.createAnswer())
    })

    on(this, 'answer', message => {
      this.setRemoteDescription(message)
    })

    on(this, 'icegatheringstatechange', () => {
      if (this.iceGatheringState === 'complete') {
        emit(this, 'message', {
          id: this.id,
          ...this.localDescription.toJSON()
        })
      }
    })
  }
}
