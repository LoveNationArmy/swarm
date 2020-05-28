import randomId from './lib/random-id.js'
import now from './lib/monotonic-timestamp.js'

export default class Message {
  static parse (message) {
    if (typeof message === 'string') {
      if (!message.length) throw TypeError('Message empty')
      try { return JSON.parse(message) } catch (_) {}
    }
    if (typeof message === 'object') return message
    throw TypeError(`Message of invalid type: ${message}`)
  }

  static serialize (message) {
    message = { ...message }
    delete message.channel
    return JSON.stringify(message)
  }

  constructor (message) {
    Object.assign(this, { id: randomId(), time: now(), ...Message.parse(message) })
  }

  get meta () {
    return `${this.time} ${this.id} ${this.type} ${this.from} ${this.to ? this.to : '(to any)'}`
  }

  toString () {
    return Message.serialize(this)
  }
}
