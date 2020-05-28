import { emit, on, once } from '../../js/lib/events.js'
import Peer from '../../js/peer.js'

describe('Peer', function () {
  it('use default options', () => {
    const peer = new Peer()
    expect(peer.getConfiguration().iceServers.length).to.equal(2)
  })

  it('override options', () => {
    const peer = new Peer({})
    expect(peer.getConfiguration().iceServers.length).to.equal(0)
  })

  it('two peers connect', done => {
    const alice = new Peer({})
    const bob = new Peer({})

    let count = 2
    const maybeDone = () => --count || done()

    on(alice, 'message', message => {
      bob.send(message)
    })

    on(bob, 'message', message => {
      alice.send(message)
    })

    const channel = alice.createDataChannel('data')
    emit(alice, 'datachannel', channel)

    once(bob, 'connect', maybeDone)
    once(alice, 'connect', maybeDone)
  })
})
