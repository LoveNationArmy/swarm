import { emit, on } from './lib/events.js'

export default class API extends EventSource {
  constructor ({ base, userId }) {
    super(`${base}/?user_id=${userId}`)
    this.userId = userId
    on(this, 'data', ({ data }) => emit(this, 'signal', JSON.parse(data)))
  }

  sendSignal (signal) {
    fetch(this.url, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({ from: this.userId, ...signal })
    })
  }
}
