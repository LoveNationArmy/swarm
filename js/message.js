import randomId from './lib/random-id.js'
import now from './lib/monotonic-timestamp.js'

export default class Message {
  static parse (message) {
    if (typeof message === 'string') {
      if (!message.length) {
        throw TypeError('Message empty')
      }
      try { return JSON.parse(message) } catch (_) {}
    }
    if (typeof message === 'object') {
      return message
    }
    throw TypeError(`Message of invalid type: ${message}`)

    // const metaIndex = message.indexOf` `
    // let [type, from, to, id, time] = message.slice(0, metaIndex).split`:`.reverse()
    // let text = message.slice(metaIndex + 1)
    // let data = {}
    // if (metaIndex < 0) type = text, text = undefined
    // else try { data = JSON.parse(text) } catch (_) {}
    // return { time, id, to, from, type, text, ...data }
  }

  static serialize (message) {
    message = { ...message }
    delete message.channel
    return JSON.stringify(message)
    // if (typeof message === 'string') return message
    // const { time, id, to, from, type, text, ...data } = message
    // const meta = [time, id, to, from, type].join`:`.replace(/^:+/, '')
    // const rest = Object.keys(data).length
    //   ? JSON.stringify(data) : text && text.length ? text : undefined
    // return [meta, rest].filter(Boolean).join` `
  }

  constructor (message) {
    Object.assign(this, {
      id: randomId(),
      time: now(),
      ...Message.parse(message)
    })
  }

  get meta () {
    return `${this.type} ${this.to ? this.to : '(to any)'} [${this.path.join` -> `}]`
  }

  get originId () {
    return this.path[0]
  }

  get userId () {
    return this.path[1]
  }

  toString () {
    return Message.serialize(this)
  }
}
