import { once } from '../../js/lib/events.js'
import HttpChannel from '../../js/http-channel.js'

const origin = 'http://localhost'
const url = (userId = '') => `${origin}/?user_id=${userId}`

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
      setTimeout(done, 2000)
    })
  })
})

describe('validate message', function () {
  this.timeout(5000)

  it('bad "path"', done => {
    const http = new HttpChannel(url('normal'))
    http.send({ type: 'offer', path: ['x','../malformed'] })
    once(http, 'error', error => {
      expect(error.message).to.equal('400')
      http.close()
      done()
    })
  })

  it('bad "remoteUserId"', done => {
    const http = new HttpChannel(url('normal'))
    http.send({ remoteUserId: '../2123', type: 'offer', path: ['x','normal'] })
    once(http, 'error', error => {
      expect(error.message).to.equal('400')
      http.close()
      done()
    })
  })

  it('bad "type"', done => {
    const http = new HttpChannel(url('normal'))
    http.send({ type: '../random', path: ['x','normal'] })
    once(http, 'error', error => {
      expect(error.message).to.equal('400')
      http.close()
      setTimeout(done, 2000)
    })
  })
})

describe('send()', function () {
  this.timeout(20000)

  it('exchange offer and answer', done => {
    const alice = new HttpChannel(url('alice'))
    const bob = new HttpChannel(url('bob'))

    const fixture_offer = { type: 'offer', path: ['x','alice'] }
    const expected_offer = { type: 'offer', path: ['x','alice'] }
    const fixture_answer = { type: 'answer', path: ['x','bob'], remoteUserId: 'alice' }
    const expected_answer = { type: 'answer', path: ['x','bob'], remoteUserId: 'alice' }

    once(bob, 'message', message => {
      expect(JSON.parse(message)).to.deep.equal(expected_offer)
      bob.send(fixture_answer)
    })

    once(alice, 'message', message => {
      expect(JSON.parse(message)).to.deep.equal(expected_answer)
      alice.close()
      bob.close()
      setTimeout(done, 2000)
    })

    alice.send(fixture_offer)
  })

  it('prevent exchange with ignore', done => {
    const alice = new HttpChannel(url('alice'))
    const bob = new HttpChannel(url('bob'))
    let other

    const fixture_offer = { type: 'offer', path: ['x','alice'], ignore: ['bob'] }
    const expected_offer = { type: 'offer', path: ['x','alice'] }
    const fixture_answer = { type: 'answer', path: ['x','other'], remoteUserId: 'alice' }
    const expected_answer = { type: 'answer', path: ['x','other'], remoteUserId: 'alice' }

    once(alice, 'message', message => {
      expect(JSON.parse(message)).to.deep.equal(expected_answer)
      alice.close()
      bob.close()
      other.close()
      setTimeout(done, 2000)
    })

    alice.send(fixture_offer)

    setTimeout(() => {
      other = new HttpChannel(url('other'))
      once(other, 'message', message => {
        expect(JSON.parse(message)).to.deep.equal(expected_offer)
        other.send(fixture_answer)
      })
    }, 500)
  })
})
