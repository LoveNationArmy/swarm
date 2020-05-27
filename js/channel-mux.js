import debug from './lib/debug.js'
import { once, emit, on, off } from './lib/events.js'
import Message from './message.js'

export default class ChannelMux extends EventTarget {
  constructor () {
    super()
    this.channels = new Map()
  }

  add (channel, alreadyOpen) {
    const data = { in: new Set, out: new Set }
    const proxy = on(channel, 'message', message => {
      // TODO: store set message.ids for channel map set
      message = new Message({
        channel,
        ...Message.parse(message)
      })
      data.in.add(message.id)
      emit(this, 'message', message)
    })
    once(channel, 'open', () => this.channels.set(channel, data))
    once(channel, 'close', () => {
      this.channels.delete(channel)
      off(proxy)
    })
    if (alreadyOpen) this.channels.set(channel, data)
  }

  send (message) {
    // console.log('BROADCAST', message.toString())
    for (const [channel, data] of this.channels) {
      if (
        // !data.in.has(message.id)
      // && !data.out.has(message.id)
      channel !== message.channel
      && channel.userId !== this.userId
      && (!(channel.isHttp && message.channel.isData))) {
        debug(['mux'], this.userId, 'sending to', channel, message.type, 'from', message.from, 'to', message.to)
        data.out.add(message.id)
        channel.send(message)
      }
    }
  }
}
