import { once, proxy } from './lib/events.js'

export default class ChannelMux extends EventTarget {
  constructor () {
    super()
    this.channels = new Set()
  }

  add (channel) {
    proxy(channel, 'message', this)
    once(channel, 'open', () => this.channels.add(channel))
    once(channel, 'close', () => this.channels.delete(channel))
  }

  send ({ channel, message }) {
    for (const ch of this.channels) {
      if (channel !== ch) ch.send({ channel, message })
    }
  }
}
