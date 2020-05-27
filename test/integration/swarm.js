import debug from '../../js/lib/debug.js'
import { emit, once } from '../../js/lib/events.js'
import Swarm from '../../js/swarm.js'

window.DEBUG = true
const origin = 'http://localhost'

describe('swarm.discover()', function () {
  this.timeout(10000)

  let alice, bob, charlie

  it('alice and bob discover over http', done => {
    alice = new Swarm({ origin, userId: 'alice' })
    bob = new Swarm({ origin, userId: 'bob' })

    let count = 2
    const maybeDone = () => {
      if (!--count) { // alice and bob discover over http
        debug(alice.print())
        debug(bob.print())
        expect([...alice.connectedPeers][0].remoteUserId).to.equal(bob.userId)
        expect([...bob.connectedPeers][0].remoteUserId).to.equal(alice.userId)
        alice.http.close() // make alice only p2p
        emit(alice.http, 'close')
        done()
      }
    }

    alice.discover()
    bob.discover()

    once(alice, 'peer', maybeDone)
    once(bob, 'peer', maybeDone)
  })

  it('bob and charlie discover over http', done => {
    charlie = new Swarm({ origin, userId: 'charlie' })

    let count = 2
    const maybeDone = () => {
      if (!--count) { // charlie and bob discover over http
        expect(alice.connectedPeers.size).to.equal(1) // alice connected to bob
        expect(charlie.connectedPeers.size).to.equal(1) // charlie connected to alice
        expect(bob.connectedPeers.size).to.equal(2) // bob connected to both alice and charlie
        done()
      }
    }

    charlie.discover()
    bob.discover()

    once(charlie, 'peer', maybeDone)
    once(bob, 'peer', maybeDone)
  })

  it('charlie discovers alice over p2p', done => {
    let count = 2
    const maybeDone = () => {
      if (!--count) { // charlie and alice discover over http (via bob)
        debug(alice.print())
        debug(charlie.print())
        alice.destroy()
        bob.destroy()
        charlie.destroy()
        done()
      }
    }

    charlie.discover(alice.userId)

    once(charlie, 'peer', maybeDone)
    once(alice, 'peer', maybeDone)
  })
})
