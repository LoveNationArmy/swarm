import debug from '../../js/lib/debug.js'
import { emit, on, once, off } from '../../js/lib/events.js'
import Message from '../../js/message.js'
import Swarm from '../../js/swarm.js'

describe('swarm.send()', function () {
  this.timeout(10000)
  this.bail(true)

  let alice, bob

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

        alice.http.close() // make alice only p2p

        setTimeout(done, 2000) // wait or alice might steal offer
      }
    }

    alice.discover()
    bob.discover()

    once(alice, 'peer', next)
    once(bob, 'peer', next)
  })

  it('alice requests video stream to bob', done => {
    let count = 2, next = () => --count || done()

    on(bob, 'request-media', async ({ channel, media }, event) => {
      event.preventDefault()

      const { peer } = channel

      once(peer, 'localdescription', desc => channel.send(new Message({
        ...desc,
        media,
        from: 'bob',
        type: 'offer-media'
      })))

      once(bob, 'answer-media', (desc, event) => {
        event.preventDefault()
        peer.setRemoteDescription({ ...desc, type: 'answer' })
      })

      on(peer, 'stream', remoteStream => {
        // remoteVideo.srcObject = remoteStream
        bob.removeMedia(peer)
        next()
      })

      const localStream = await bob.addMedia(peer, media)
      debug('added media', localStream)
      // localVideo.srcObject = localStream
    })

    on(alice, 'offer-media', async ({ channel, media, ...desc }, event) => {
      event.preventDefault()

      const { peer } = channel

      once(peer, 'localdescription', desc => channel.send(new Message({
        ...desc,
        from: 'alice',
        type: 'answer-media'
      })))

      on(peer, 'stream', remoteStream => {
        // remoteVideo.srcObject = remoteStream
        alice.removeMedia(peer)
        next()
      })

      peer.setRemoteDescription({ ...desc, type: 'offer' })

      const localStream = await alice.addMedia(peer, media)
      // debug('added media', localStream)
      // localVideo.srcObject = localStream
    })

    const { video } = media
    alice.send(new Message({ from: 'alice', type: 'request-media', media: { video } }))
  })
})
