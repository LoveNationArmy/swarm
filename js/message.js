export default class Message {
  static parse (message) {
    if (!message.length) {
      throw TypeError('Message.parse error: Message empty')
    }
    try { return JSON.parse(message) } catch (_) {}
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

  constructor (obj) {
    if (typeof obj === 'string') obj = Message.parse(obj)
    if (typeof obj === 'object') Object.assign(this, obj)
    else throw TypeError(`Message neither string or object: ${obj}`)
  }

  toString () {
    return Message.serialize(this)
  }
}
