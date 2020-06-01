import debug from '../../js/lib/debug.js'
import { emit, on, once, off } from '../../js/lib/events.js'
import Message from '../../js/message.js'
import Swarm from '../../js/swarm.js'

describe('swarm media streams', function () {
  this.timeout(15000)
  this.bail(true)

  let alice, bob
  let alicePeer, bobPeer

  const media = {
    video: {
      video: {
        resizeMode: 'crop-and-scale',
        facingMode: 'user',
        frameRate: 24,
        width: 176,
        height: 144
      }
    },
    audio: {
      audio: {
        autoGainControl: true,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 11050,
      }
    }
  }

  after(done => {
    alice?.destroy()
    bob?.destroy()
    setTimeout(done, 2000)
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

        alicePeer = alice.connectedPeers[0]
        bobPeer = bob.connectedPeers[0]

        done()
      }
    }

    alice.discover()
    bob.discover()

    once(alice, 'dataopen', next)
    once(bob, 'dataopen', next)
  })

  for (let times = 2; times--;) {
    it('alice requests video stream from bob and establish video both ways', done => {
      let count = 2, next = () => {
        if (!--count) {
          debug(alice.print())
          debug(bob.print())
          done()
        }
      }

      on(bobPeer, 'remotestream', next)
      on(alicePeer, 'remotestream', next)

      const { video } = media
      alice.broadcast({ type: 'request-media', media: { video } })
    })

    it('bob requests audio stream from alice and establish audio both ways, added to current streams', done => {
      let count = 2, next = () => {
        if (!--count) {
          debug(alice.print())
          debug(bob.print())
          done()
        }
      }

      on(bobPeer, 'remotestream', next)
      on(alicePeer, 'remotestream', next)

      const { audio } = media
      bob.broadcast({ type: 'request-media', media: { audio } })
    })

    it('bob sends quit media request, both end media', done => {
      let count = 2, next = () => {
        if (!--count) {
          debug(alice.print())
          debug(bob.print())
          done()
        }
      }

      once(alicePeer, 'endedmedia', next)
      once(bobPeer, 'endedmedia', next)

      once(bobPeer, 'localdescription', desc => bob.send(new Message({
        ...desc,
        from: 'bob',
        type: 'offer-quit-media',
        media: { video: true }
      })))

      bobPeer.removeMedia({ video: true })
    })
  }
})
