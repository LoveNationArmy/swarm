import { emit } from './lib/events.js'

export default class HttpChannel extends EventSource {
  constructor (url) {
    super(url)
    this.isHttp = true
    this.channelId = 'http'
  }

  send (message) {
    fetch(this.url, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(message)
    }).then(response => {
      if (!response.ok) throw new Error(response.status)
      else return response
    }).catch(error => emit(this, 'error', error))
  }
}
