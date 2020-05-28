import debug from '../../js/lib/debug.js'
import { emit, on, once, off } from '../../js/lib/events.js'
import Message from '../../js/message.js'
import Swarm from '../../js/swarm.js'

window.DEBUG = true
window.ORIGIN = 'http://localhost'

describe('swarm.send()', function () {
  this.timeout(10000)
  this.bail(true)

  const swarms = ['alice', 'bob', 'charlie', 'dina']
    .map(userId => new Swarm(userId))

  const [alice, bob, charlie, dina] = swarms

  after(() => {
    swarms.map(swarm => debug(swarm.print()))
    swarms.map(swarm => swarm.destroy())
  })

  it('swarms discover', done => {
    let count = 8, next = () => {
      debug.color('f00', count)
      --count || (listeners.map(off), setTimeout(done, 200))
    }

    const listeners = swarms.map(swarm => on(swarm, 'dataopen', next))
    swarms.concat(swarms.slice().reverse())
      .map((swarm, i) => setTimeout(() =>
      swarm.discover()
      , i * 300))
  })

  it('messages propagate', done => {
    const message = new Message({ type: 'msg', from: 'alice', foo: 'bar' })

    let count = 3, next = ({ channel, ...result }) => {
      debug.color('f00', count)
      expect(result).to.deep.equal(message)
      if (!--count) {
        done()
      }
    }

    swarms.slice(1).map(swarm => once(swarm, 'msg', next))

    alice.send(message)
  })
})
