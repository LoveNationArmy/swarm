export default class Message {
  static parse (message) {
    if (!message.length) {
      throw TypeError('Message.parse error: Message empty')
    }
    try { message = JSON.parse(message) } catch (_) {}
    const metaIndex = message.indexOf` `
    let [type, from, to, id, time] = message.slice(0, metaIndex).split`:`.reverse()
    let data = message.slice(metaIndex + 1)
    if (metaIndex < 0) type = data, data = undefined
    else try { data = JSON.parse(data) } catch (_) {}
    return { time, id, to, from, type, data }
  }

  static serialize (message) {
    if (typeof message === 'string') return message
    const { time, id, to, from, type, data } = message
    const meta = [time, id, to, from, type].join`:`.replace(/^:+/, '')
    const json = JSON.stringify(data)
    return [meta, json].join` `
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
