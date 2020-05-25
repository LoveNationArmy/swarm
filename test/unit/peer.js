import { emit, once } from '../../js/lib/events.js'
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

  it('has id', () => {
    const peer = new Peer({})
    expect(peer.id).to.be.a('string')
  })

  it('two peers connect', done => {
    const alice = new Peer({})
    const bob = new Peer({})

    let count = 2
    const maybeDone = () => --count || done()

    once(alice, 'message', message => {
      expect(message.id).to.equal(alice.id)
      emit(bob, message.type, message)
    })

    once(bob, 'message', message => {
      expect(message.id).to.equal(bob.id)
      emit(alice, message.type, message)
    })

    const channel = alice.createDataChannel('data')

    once(bob, 'datachannel', channel => {
      once(channel, 'open', maybeDone)
    })

    once(channel, 'open', maybeDone)
  })
})
