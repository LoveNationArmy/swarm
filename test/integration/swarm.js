import debug from '../../js/lib/debug.js'
import { once } from '../../js/lib/events.js'
import Swarm from '../../js/swarm.js'

window.DEBUG = true
const origin = 'http://localhost'

describe('swarm.discover()', function () {
  this.timeout(15000)

  it('alice and bob discover over http', done => {
    const alice = new Swarm({ origin, userId: 'alice' })
    const bob = new Swarm({ origin, userId: 'bob' })

    let count = 2
    const maybeDone = () => {
      if (!--count) { // alice and bob discover over http
        debug(alice.print())
        debug(bob.print())
        alice.destroy()
        bob.destroy()
        setTimeout(done, 2000)
      }
    }

    alice.discover()
    bob.discover()

    once(alice, 'peer', maybeDone)
    once(bob, 'peer', maybeDone)
  })

  it('charlie discovers alice over p2p', done => {
    const alice = new Swarm({ origin, userId: 'alice' })
    const bob = new Swarm({ origin, userId: 'bob' })

    let count = 2
    let next = () => {
      if (!--count) { // alice and bob discover over http
        alice.http.close() // make alice only p2p

        setTimeout(() => {
          // charlie enters http network
          const charlie = new Swarm({ origin, userId: 'charlie' })

          charlie.discover()
          bob.discover()

          count = 2
          next = () => {
            if (!--count) { // charlie and bob discover over http
              expect(alice.connectedPeers.size).to.equal(1) // alice connected to bob
              expect(charlie.connectedPeers.size).to.equal(1) // charlie connected to alice
              expect(bob.connectedPeers.size).to.equal(2) // bob connected to both alice and charlie

              charlie.discover(alice.userId)

              count = 2
              const maybeDone = () => {
                if (!--count) { // charlie and alice discover over http (via bob)
                  debug(alice.print())
                  debug(charlie.print())
                  alice.destroy()
                  bob.destroy()
                  charlie.destroy()
                  setTimeout(done, 2000)
                }
              }

              once(charlie, 'peer', maybeDone)
              once(alice, 'peer', maybeDone)
            }
          }

          once(charlie, 'peer', next)
          once(bob, 'peer', next)
        }, 2000)
      }
    }

    alice.discover()
    bob.discover()

    once(alice, 'peer', next)
    once(bob, 'peer', next)
  })
})
