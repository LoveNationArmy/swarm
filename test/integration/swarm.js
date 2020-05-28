import debug from '../../js/lib/debug.js'
import { emit, once } from '../../js/lib/events.js'
import Swarm from '../../js/swarm.js'

window.DEBUG = true
const origin = 'http://localhost'

describe('swarm.discover()', function () {
  this.timeout(10000)
  this.bail(true)

  let alice, bob, charlie

  it('alice and bob discover over http', done => {
    alice = new Swarm({ origin, userId: 'alice' })
    bob = new Swarm({ origin, userId: 'bob' })

    let count = 2
    const maybeDone = () => {
      if (!--count) { // alice and bob discover over http
        debug(alice.print())
        debug(bob.print())

        expect(alice.connectedPeers.length).to.equal(1) // alice connected to bob
        expect(bob.connectedPeers.length).to.equal(1) // bob connected to alice

        expect(alice.connectedPeers[0].channel.remotePeer.userId).to.equal(bob.userId)
        expect(bob.connectedPeers[0].channel.remotePeer.userId).to.equal(alice.userId)

        // TODO: test offer,answer

        // debug('here', bob.connectedPeers[0].channelId, alice.connectedPeers[0].channelId)
        // expect(bob.connectedPeers[0].channelId).to.equal(alice.connectedPeers[0].channelId)

        alice.http.close() // make alice only p2p
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
        expect(alice.connectedPeers.length).to.equal(1) // alice connected to bob
        expect(charlie.connectedPeers.length).to.equal(1) // charlie connected to alice
        expect(bob.connectedPeers.length).to.equal(2) // bob connected to both alice and charlie
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

    charlie.discover()

    once(charlie, 'peer', maybeDone)
    once(alice, 'peer', maybeDone)
  })
})
