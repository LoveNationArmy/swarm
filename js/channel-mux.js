import debug from './lib/debug.js'
import { once, emit, on, off } from './lib/events.js'
import Message from './message.js'

export default class ChannelMux extends EventTarget {
  constructor () {
    super()
    this.channels = new Set()
  }

  add (channel, alreadyOpen) {
    const proxy = on(channel, 'message', message => {
      emit(this, 'message', { channel, ...new Message(message) })
    })
    once(channel, 'open', () => this.channels.add(channel))
    once(channel, 'close', () => {
      this.channels.delete(channel)
      off(proxy)
    })
    if (alreadyOpen) this.channels.add(channel)
  }

  send (message) {
    // console.log('BROADCAST', message.toString())
    for (const channel of this.channels) {
      if (channel !== message.channel
      && channel.userId !== this.userId
      && (!(channel.isHttp && message.channel.isData))) {
        debug(['mux'], this.userId, 'sending to', channel, message.type, 'from', message.from, 'to', message.to)
        channel.send(message)
      }
    }
  }
}
