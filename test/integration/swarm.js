import debug from '../../js/lib/debug.js'
import { emit, once } from '../../js/lib/events.js'
import Swarm from '../../js/swarm.js'

window.DEBUG = true
window.ORIGIN = 'http://localhost'

describe('swarm.discover()', function () {
  this.timeout(10000)
  this.bail(true)

  let alice, bob, charlie

  after(() => {
    alice?.destroy()
    bob?.destroy()
    charlie?.destroy()
  })

  it('alice and bob discover over http', done => {
    alice = new Swarm('alice')
    bob = new Swarm('bob')

    let count = 2, next = () => {
      if (!--count) { // alice and bob discover over http
        debug(alice.print())
        debug(bob.print())

        expect(alice.connectedPeers.length).to.equal(1) // alice connected to bob
        expect(bob.connectedPeers.length).to.equal(1) // bob connected to alice

        expect(alice.connectedPeers[0].id)
          .to.equal(bob.connectedPeers[0].id)

        const opposite = { offer: 'answer', answer: 'offer' }
        expect(alice.connectedPeers[0].localDescription.type)
          .to.equal(opposite[bob.connectedPeers[0].localDescription.type])

        alice.http.close() // make alice only p2p
done()
        // setTimeout(done, 2000) // wait or alice might steal offer
      }
    }

    alice.discover()
    bob.discover()

    once(alice, 'peer', next)
    once(bob, 'peer', next)
  })

  it('bob and charlie discover over http', done => {

    charlie = new Swarm('charlie')

    let count = 2, next = () => {
      if (!--count) { // charlie and bob discover over http
        debug(alice.print())
        debug(bob.print())
        debug(charlie.print())
        expect(alice.connectedPeers.length).to.equal(1) // alice connected to bob
        expect(charlie.connectedPeers.length).to.equal(1) // charlie connected to alice
        expect(bob.connectedPeers.length).to.equal(2) // bob connected to both alice and charlie

        expect(bob.connectedPeers[1].id)
          .to.equal(charlie.connectedPeers[0].id)

        const opposite = { offer: 'answer', answer: 'offer' }
        expect(bob.connectedPeers[1].localDescription.type)
          .to.equal(opposite[charlie.connectedPeers[0].localDescription.type])

        done()
      }
    }

    charlie.discover()

    once(charlie, 'peer', next)
    once(bob, 'peer', next)
  })

  it('charlie discovers alice over p2p', done => {
    let count = 2, next = () => {
      if (!--count) { // charlie and alice discover over http (via bob)
        debug(alice.print())
        debug(charlie.print())

        expect(alice.connectedPeers.length).to.equal(2) // alice connected to bob
        expect(charlie.connectedPeers.length).to.equal(2) // charlie connected to alice

        expect(alice.connectedPeers[1].id)
          .to.equal(charlie.connectedPeers[1].id)

        const opposite = { offer: 'answer', answer: 'offer' }
        expect(alice.connectedPeers[1].localDescription.type)
          .to.equal(opposite[charlie.connectedPeers[1].localDescription.type])

        done()
      }
    }

    charlie.discover()

    once(charlie, 'peer', next)
    once(alice, 'peer', next)
  })
})
