export default class Log extends EventTarget {
  constructor (channel) {
    this.data = { in: new Set, out: new Set }
    this.channel = channel
    on(this.channel, 'message', message => {
      if (this.data.in.has(message)) return
      this.data.in.add(message)
      emit(this, 'message', message)
    })
  }

  send (message) {
    if (this.data.out.has(message)) return
    this.data.out.add(message)
    this.channel.send(message)
  }
}
