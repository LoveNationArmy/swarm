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

    on(this, 'track', event => {
      // debug(this + ' add remote stream', stream?.getTracks()[0].kind)
      if (this.remoteStream) {
        this.remoteStream.addTrack(event.track)
      } else {
        this.remoteStream = event.streams[0]
      }

      emit(this, 'remotestream', this.remoteStream)
    })
  }

  setLocalStream (stream) {
    debug(this + ' add local stream', stream.getTracks())
    if (this.localStream) {
      stream.getTracks().map(track => this.localStream.addTrack(track))
    } else {
      this.localStream = stream
    }

    stream.getTracks().map(track => this.addTrack(track, this.localStream))

    emit(this, 'localstream', this.localStream)
    debug(this.signalingState, this.iceGatheringState, this.iceConnectionState)
  }

  removeMedia (media) {
    once(this, 'negotiationneeded', () => {
      emit(this, 'localdescription', this.localDescription.toJSON())
    })

    media = Object.keys(media)

    // this removes the tracks from the rtc sender stream
    this.getSenders()
      .filter(sender => media.includes(sender?.track?.kind))
      .map(sender => this.removeTrack(sender, this.localStream))

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