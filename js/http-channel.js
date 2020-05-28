import { emit } from './lib/events.js'

export default class HttpChannel extends EventSource {
  send (body) {
    fetch(this.url, {
      method: 'POST',
      mode: 'cors',
      body
    }).then(response => {
      if (!response.ok) throw new Error(response.status)
      else return response
    }).catch(error => emit(this, 'error', error))
  }
}
