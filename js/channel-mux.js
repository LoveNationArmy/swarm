import { once, emit, on, off } from './lib/events.js'
import Message from './message.js'

export default class ChannelMux extends EventTarget {
  constructor () {
    super()
    this.channels = new Set()
  }

  add (channel) {
    const proxy = on(channel, 'message', message => {
      emit(this, 'message', { channel, ...new Message(message) })
    })
    once(channel, 'open', () => this.channels.add(channel))
    once(channel, 'close', () => {
      this.channels.delete(channel)
      off(proxy)
    })
  }

  send (message) {
    // console.log('BROADCAST', message.toString())
    for (const channel of this.channels) {
      if (channel !== message.channel) {
        channel.send(message)
      }
    }
  }
}
