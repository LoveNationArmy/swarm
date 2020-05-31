import debug from './lib/debug.js'
import { emit, on, once } from './lib/events.js'
import randomId from './lib/random-id.js'

export default class Peer extends RTCPeerConnection {
  constructor (opts = {}) {
    super(opts)

    this.id = opts.id ?? randomId()

    on(this, 'negotiationneeded', async () => {
      debug(this + ' negotiationeeded', this.signalingState, this.iceGatheringState, this.iceConnectionState)
      if (this.signalingState !== 'have-remote-offer') {
        this.setLocalDescription(await this.createOffer())
      }
    })

    on(this, 'signalingstatechange', async () => {
      debug(this + ' signalingstate', this.signalingState)
      if (this.signalingState === 'have-remote-offer') {
        this.setLocalDescription(await this.createAnswer())
      }
    })

    on(this, 'icegatheringstatechange', () => {
      debug(this + ' icegathering', this.iceGatheringState)
      if (this.iceGatheringState === 'complete') {
        emit(this, 'localdescription', this.localDescription.toJSON())
      }
    })

    on(this, 'connectionstatechange', () => emit(this, this.connectionState))

    on(this, 'track', event => emit(this, 'remotestream', event.streams[0]))

    on(this, 'remotestream', remoteStream => {
      debug(this + ' add remote stream', remoteStream.getTracks()[0].kind)
      this.remoteStream = remoteStream
    })
  }

  setLocalStream (stream) {
    debug(this + ' add local stream', stream.getTracks()[0].kind)
    stream.getTracks().map(track => this.addTrack(track, stream))
    this.localStream = stream
    emit(this, 'localstream', stream)
  }

  removeMedia (media) {
    once(this, 'negotiationneeded', () => {
      emit(this, 'localdescription', this.localDescription.toJSON())
    })

    this.getSenders()
      .filter(sender => Object.keys(media).includes(sender?.track.kind))
      .map(sender => (sender.track.stop(), this.removeTrack(sender)))
  }

  toString () {
    return `[${this.id} ${this.localDescription?.type ?? '-'} ${this.connectionState}]`
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