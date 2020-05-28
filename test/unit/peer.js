import { once } from '../../js/lib/events.js'
import Peer from '../../js/peer.js'

describe('Peer', function () {
  it('new peer without options', () => {
    const peer = new Peer()
    expect(peer.getConfiguration().iceServers.length).to.equal(0)
  })

  it('new peer with options', () => {
    const peer = new Peer({ id: 'foo', iceServers: [{ urls: 'stun:stun1.l.google.com:19302' }] })
    expect(peer.id).to.equal('foo')
    expect(peer.getConfiguration().iceServers.length).to.equal(1)
  })

  it('two peers connect', done => {
    const alice = new Peer()
    const bob = new Peer()

    let count = 2, next = () => {
      if (!--count) {
        expect(alice.connectionState).to.equal('connected')
        expect(bob.connectionState).to.equal('connected')
        done()
      }
    }

    once(alice, 'localdescription', desc => bob.setRemoteDescription(desc))
    once(bob, 'localdescription', desc => alice.setRemoteDescription(desc))

    once(alice, 'connected', next)
    once(bob, 'connected', next)

    alice.createDataChannel('data')
  })
})
