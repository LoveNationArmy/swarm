import { once } from '../../js/lib/events.js'
import HttpChannel from '../../js/http-channel.js'

const url = (userId = '') => `${window.ORIGIN}/?user_id=${userId}`

describe('validate user id', function () {
  this.timeout(5000)

  it('should fail with no userId', done => {
    const http = new HttpChannel(url())
    once(http, 'error', error => {
      expect(error.type).to.equal('error')
      http.close()
      done()
    })
  })

  it('should fail with non-alphanumeric userId', done => {
    const http = new HttpChannel(url('../not/valid'))
    once(http, 'error', error => {
      expect(error.type).to.equal('error')
      http.close()
      done()
    })
  })

  it('should succeed with normal user id', done => {
    const http = new HttpChannel(url('normal'))
    once(http, 'open', () => {
      expect(http.readyState).to.equal(1) // 1 is open
      http.close()
      done()
    })
  })
})

describe('validate message', function () {
  this.timeout(5000)

  it('bad "from"', done => {
    const http = new HttpChannel(url('normal'))
    http.send(JSON.stringify({ type: 'offer', from: '../malformed' }))
    once(http, 'error', error => {
      expect(error.message).to.equal('400')
      http.close()
      done()
    })
  })

  it('bad "to"', done => {
    const http = new HttpChannel(url('normal'))
    http.send(JSON.stringify({ to: '../2123', type: 'offer', from: 'normal' }))
    once(http, 'error', error => {
      expect(error.message).to.equal('400')
      http.close()
      done()
    })
  })

  it('bad "type"', done => {
    const http = new HttpChannel(url('normal'))
    http.send(JSON.stringify({ type: '../random', from: 'normal' }))
    once(http, 'error', error => {
      expect(error.message).to.equal('400')
      http.close()
      done()
    })
  })
})

describe('send()', function () {
  this.timeout(5000)

  it('exchange offer and answer', done => {
    const alice = new HttpChannel(url('alice'))
    const bob = new HttpChannel(url('bob'))

    const fixture_offer = { type: 'offer', from: 'alice' }
    const expected_offer = { type: 'offer', from: 'alice' }
    const fixture_answer = { type: 'answer', from: 'bob', to: 'alice' }
    const expected_answer = { type: 'answer', from: 'bob', to: 'alice' }

    once(bob, 'message', message => {
      expect(JSON.parse(message)).to.deep.equal(expected_offer)
      bob.send(JSON.stringify(fixture_answer))
    })

    once(alice, 'message', message => {
      expect(JSON.parse(message)).to.deep.equal(expected_answer)
      alice.close()
      bob.close()
      setTimeout(done, 3000)
    })

    alice.send(JSON.stringify(fixture_offer))
  })

  it('prevent exchange with ignore', done => {
    const alice = new HttpChannel(url('alice'))
    const bob = new HttpChannel(url('bob'))
    let other

    const fixture_offer = { type: 'offer', from: 'alice', ignore: ['bob'] }
    const expected_offer = { type: 'offer', from: 'alice' }
    const fixture_answer = { type: 'answer', from: 'other', to: 'alice' }
    const expected_answer = { type: 'answer', from: 'other', to: 'alice' }

    once(alice, 'message', message => {
      expect(JSON.parse(message)).to.deep.equal(expected_answer)
      alice.close()
      bob.close()
      other.close()
      done()
    })

    alice.send(JSON.stringify(fixture_offer))

    setTimeout(() => {
      other = new HttpChannel(url('other'))
      once(other, 'message', message => {
        expect(JSON.parse(message)).to.deep.equal(expected_offer)
        other.send(JSON.stringify(fixture_answer))
      })
    }, 1000) // give time to see if alice and bob exchange first
  })
})
