import debug from './lib/debug.js'
import { emit, on } from './lib/events.js'
import randomId from './lib/random-id.js'

export default class Peer extends RTCPeerConnection {
  constructor (opts = {}) {
    super(opts)

    this.id = opts.id ?? randomId()

    on(this, 'negotiationneeded', async () => {
      debug(this.id, 'negotiationeeded')
      if (this.signalingState !== 'have-remote-offer') {
        this.setLocalDescription(await this.createOffer())
      }
    })

    on(this, 'signalingstatechange', async () => {
      debug(this.id, 'signalingstate', this.signalingState)
      if (this.signalingState === 'have-remote-offer') {
        this.setLocalDescription(await this.createAnswer())
      }
    })

    on(this, 'icegatheringstatechange', () => {
      debug(this.id, 'icegathering', this.iceGatheringState)
      if (this.iceGatheringState === 'complete') {
        emit(this, 'localdescription', this.localDescription.toJSON())
        // emit(this, 'localdescription', this.localDescription.toJSON())
      }
    })

    on(this, 'connectionstatechange', () => emit(this, this.connectionState))

    on(this, 'track', event => emit(this, 'stream', event.streams[0]))
  }

  toString () {
    return `[${this.id} ${this.localDescription.type} ${this.connectionState}]`
  }
}

/*

smallButton.addEventListener('click', () => {
  localStream.getVideoTracks()[0].applyConstraints({width: {exact: 180}});
});
const vgaButton = document.getElementById('size-vga');
vgaButton.addEventListener('click', () => {
  localStream.getVideoTracks()[0].applyConstraints({width: {exact: 640}});
});
const hdButton = document.getElementById('size-hd');
hdButton.addEventListener('click', () => {
  localStream.getVideoTracks()[0].applyConstraints({width: {exact: 1024}});
});
*/