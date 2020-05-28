import debug from './lib/debug.js'
import { once, emit, on, off } from './lib/events.js'
import randomId from './lib/random-id.js'
import Message from './message.js'

export default class ChannelMux extends EventTarget {
  constructor () {
    super()
    this.channelId = 'mux'
    this.channels = {}
  }

  get (id) {
    return this.channels[id]
  }

  getAll (type) {
    return Object
      .entries(this.channels)
      .filter(([key, value]) => value.type === type)
      .map(([key, value]) => value)
  }

  add (channel, type, { open = false } = {}) {
    channel.userId = this.channelId
    channel = new Channel(channel, type)
    const { channelId } = channel
    const listener = on(channel, 'message', message => {
      message.path = message.path ?? []
      // console.log(this.channelId, 'receive', message.path[2], message)//channel.channelId, message.type, message.path)
      if (message.path[1] === this.channelId) return
      message.path.push(channelId)
      message.path.push(this.channelId)
      // debug.color(message.id, '[mux recv <--]', message.meta)
      emit(this, 'message', message)
    })
    if (open) this.channels[channelId] = channel
    else once(channel, 'open', () => this.channels[channelId] = channel)
    once(channel, 'close', () => {
      delete this.channels[channel.channelId]
      off(listener)
    })
    return channel
  }

  send (message) {
    if (message.to) {
      const channel = this.channels[message.to]
      if (channel) {
        const m = new Message({ ...message })
        m.path = m.path.slice()
        m.path.push(channel.channelId)
        channel.send(m)
        return
      }
    }
    for (const [channelId, channel] of Object.entries(this.channels)) {

      // TODO: these are shortcuts, they are not necessary
      // as the messages will not have any major effect later,
      // maybe we can make it more implicit?
      // if (message.to && message.to.split('.')[1] === 'peer'
      //   && !this.channels[message.to]
      //   && (channel.type === 'peer' || (channel.type === 'http' && message.hasPathType('datachannel')))
      //   ) continue

      // if (!message.to && channel.type === 'http'
      //   && message.hasPathType('datachannel')
      //   ) continue

      // if (!message.to && channel.type === 'peer'
      //   && message.path[1] === this.channelId
      //   ) continue

      // if (!message.to && channel.type === 'peer'
      //   && (channel.channel.connected || channel.channel.type)
      //   ) continue

      if (!message.path.includes(channelId)) {
        // debug(this.channelId, 'sending', channel.channelId, message.type, message.to, message.path)
        const m = new Message({ ...message })
        m.path = m.path.slice() // unique path array for every destination
        m.path.push(channelId)
        channel.send(m)
      }
    }
  }
}

export const proxy = (name, source, target, opts) => on(source, name, event => emit(target, name, event), opts)

export class Channel extends EventTarget {
  constructor (channel, type = 'channel') {
    super()

    Object.assign(this, channel)

    this.channelId = `${randomId()}.${channel.channelId || type}`
    this.channel = channel

    Object.defineProperty(this, 'data', {
      enumerable: false,
      value: { in: {}, out: {} }
    })

    const listener = on(channel, 'message', message => {
      message = new Message(message)
      if (message.id in this.data.in) return
      this.data.in[message.id] = message
      emit(this, 'message', message)
    })

    once(channel, 'open', () => emit(this, 'open'))
    once(channel, 'close', () => emit(this, 'close'))
    once(channel, 'close', () => off(listener))
  }

  send (message) {
    if (message.id in this.data.out) return
    this.data.out[message.id] = message
    debug.color(message.id, '[mux send -->]', message.meta)
    this.channel.send(message)
  }

  close () {
    this.channel.close()
    emit(this, 'close') // browser channels don't necessary fire 'close' (wtf!!)
  }

  get type () {
    return this.channelId.split`.`[1]
  }

  toString () {
    return `${this.channelId} ${this.channel.toString()}`
  }
}
