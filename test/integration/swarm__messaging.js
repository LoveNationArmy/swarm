import debug from '../../js/lib/debug.js'
import { emit, on, once, off } from '../../js/lib/events.js'
import Message from '../../js/message.js'
import Swarm from '../../js/swarm.js'

describe('swarm.send()', function () {
  this.timeout(10000)
  this.bail(true)

  let swarms = ['alice', 'bob', 'charlie', 'dina']

  after(done => {
    swarms.map(swarm => debug(swarm.print()))
    swarms.map(swarm => swarm.destroy())
    setTimeout(done, 2000)
  })

  it('swarms discover', done => {
    swarms = swarms.map(userId => new Swarm(userId))

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
    const [alice] = swarms
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
