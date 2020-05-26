import { emit, on } from './lib/events.js'
import randomId from './lib/random-id.js'
import Message from './message.js'

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
        // this.channel.send({
        //   channel: this.channel,
        //   message: {
        this.channel.send(new Message({
          // channel: this.channel,
          id: this.id,
          from: this.userId,
          to: this.remoteUserId,
          ...this.localDescription.toJSON()
        }))
      }
    })
  }

  toString () {
    return `[${this.remoteUserId} ${this.id}]`
  }
}
