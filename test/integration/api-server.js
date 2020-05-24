import { on, once } from '../../js/lib/events.js'
import API from '../../js/api.js'

const base = 'http://localhost'

describe('validate user id', function () {
  this.timeout(20000)

  it('should fail with no userId', done => {
    const api = new API({ base, userId: '' })
    once(api, 'error', event => {
      expect(event.type).to.equal('error')
      api.close()
      done()
    })
  })

  it('should fail with non-alphanumeric userId', done => {
    const api = new API({ base, userId: '../not/valid' })
    once(api, 'error', event => {
      expect(event.type).to.equal('error')
      api.close()
      done()
    })
  })

  it('should fail with non-alphanumeric userId', done => {
    const api = new API({ base, userId: 'normal' })
    once(api, 'open', event => {
      expect(event.type).to.equal('open')
      api.close()
      setTimeout(done, 3000)
    })
  })
})

describe('validate signal', function () {
  this.timeout(5000)

  it('bad "from"', done => {
    const api = new API({ base, userId: 'normal' })
    api.userId = '../malformed'
    api.sendSignal({ type: 'offer' })
    once(api, 'error', event => {
      expect(event.detail.message).to.equal('400')
      api.close()
      done()
    })
  })

  it('bad "to"', done => {
    const api = new API({ base, userId: 'normal' })
    api.sendSignal({ to: '../2123', type: 'offer' })
    once(api, 'error', event => {
      expect(event.detail.message).to.equal('400')
      api.close()
      done()
    })
  })

  it('bad "type"', done => {
    const api = new API({ base, userId: 'normal' })
    api.sendSignal({ type: '../random' })
    once(api, 'error', event => {
      expect(event.detail.message).to.equal('400')
      api.close()
      setTimeout(done, 3000)
    })
  })
})

describe('sendSignal()', function () {
  this.timeout(20000)

  it('exchange offer and answer', done => {
    const alice = new API({ base, userId: 'alice' })
    const bob = new API({ base, userId: 'bob' })

    const fixture_offer = { type: 'offer', sdp: 'foo' }
    const expected_offer = { ...fixture_offer, from: 'alice' }
    const fixture_answer = { to: 'alice', type: 'answer', sdp: 'bar' }
    const expected_answer = { ...fixture_answer, from: 'bob' }

    once(bob, 'signal', ({ detail: signal }) => {
      expect(signal).to.deep.equal(expected_offer)
      bob.sendSignal(fixture_answer)
    })

    once(alice, 'signal', ({ detail: signal }) => {
      expect(signal).to.deep.equal(expected_answer)
      alice.close()
      bob.close()
      setTimeout(done, 3000)
    })

    alice.sendSignal(fixture_offer)
  })

  it('prevent exchange with ignore', done => {
    const alice = new API({ base, userId: 'alice' })
    const bob = new API({ base, userId: 'bob' })
    let other

    const fixture_offer = { type: 'offer', sdp: 'foo', ignore: ['bob'] }
    const expected_offer = { type: 'offer', sdp: 'foo', from: 'alice' }
    const fixture_answer = { to: 'alice', type: 'answer', sdp: 'bar' }
    const expected_answer = { ...fixture_answer, from: 'other' }

    once(alice, 'signal', ({ detail: signal }) => {
      expect(signal).to.deep.equal(expected_answer)
      alice.close()
      bob.close()
      other.close()
      setTimeout(done, 3000)
    })

    alice.sendSignal(fixture_offer)

    setTimeout(() => {
      other = new API({ base, userId: 'other' })
      once(other, 'signal', ({ detail: signal }) => {
        expect(signal).to.deep.equal(expected_offer)
        other.sendSignal(fixture_answer)
      })
    }, 500)
  })
})
