import { emit, on } from './lib/events.js'
import randomId from './lib/random-id.js'

export default class Peer extends RTCPeerConnection {
  constructor (opts = {}) {
    super(opts)

    this.id = opts.id ?? randomId()

    on(this, 'negotiationneeded', async () => {
      this.setLocalDescription(await this.createOffer())
    })

    on(this, 'signalingstatechange', async () => {
      if (this.signalingState === 'have-remote-offer') {
        this.setLocalDescription(await this.createAnswer())
      }
    })

    on(this, 'icegatheringstatechange', () => {
      if (this.iceGatheringState === 'complete') {
        emit(this, 'localdescription', this.localDescription.toJSON())
      }
    })

    on(this, 'connectionstatechange', () => emit(this, this.connectionState))
  }
}
