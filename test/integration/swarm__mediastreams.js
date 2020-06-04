import Debug from '../../js/lib/debug.js'
import { emit, on, once, off } from '../../js/lib/events.js'
import Message from '../../js/message.js'
import Swarm from '../../js/swarm.js'

const debug = Debug.origin('swarm__mediastreams')

describe('swarm media streams', function () {
  this.timeout(15000)
  this.bail(true)

  let alice, bob
  let alicePeer, bobPeer

  const media = {
    video: {
      resizeMode: 'crop-and-scale',
      facingMode: 'user',
      frameRate: 24,
      width: 176,
      height: 144
    },
    audio: {
      autoGainControl: true,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 11050,
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
          .to.equal(bob.connectedPeers[0].remote.id)

        const opposite = { offer: 'answer', answer: 'offer' }
        expect(alice.connectedPeers[0].peer.localDescription.type)
          .to.equal(opposite[bob.connectedPeers[0].peer.localDescription.type])

        alicePeer = alice.connectedPeers[0]
        bobPeer = bob.connectedPeers[0]

        done()
      }
    }

    alice.discover()
    bob.discover()

    once(alice, 'peer', next)
    once(bob, 'peer', next)
  })

  for (let times = 2; times--;) {
    it('alice sends video media stream request to bob, both establish', done => {
      let count = 2, next = () => {
        if (!--count) {
          debug(alice.print())
          debug(bob.print())

          const aliceLocalTracks = alicePeer.localStream.getTracks()
          const aliceRemoteTracks = alicePeer.remoteStream.getTracks()
          const bobLocalTracks = bobPeer.localStream.getTracks()
          const bobRemoteTracks = bobPeer.remoteStream.getTracks()

          expect(aliceLocalTracks.map(track => track.kind).join()).to.equal('video')
          expect(aliceRemoteTracks.map(track => track.kind).join()).to.equal('video')
          expect(aliceLocalTracks.map(track => track.kind).join()).to.equal('video')
          expect(aliceRemoteTracks.map(track => track.kind).join()).to.equal('video')

          done()
        }
      }

      once(bobPeer, 'remotestream', next)
      once(alicePeer, 'remotestream', next)

      const { video } = media
      alicePeer.addMedia({ video })
    })

    it('bob requests audio stream from alice and establish audio both ways, added to current streams', done => {
      let count = 2, next = () => {
        if (!--count) {
          debug(alice.print())
          debug(bob.print())

          const aliceLocalTracks = alicePeer.localStream.getTracks()
          const aliceRemoteTracks = alicePeer.remoteStream.getTracks()
          const bobLocalTracks = bobPeer.localStream.getTracks()
          const bobRemoteTracks = bobPeer.remoteStream.getTracks()

          expect(aliceLocalTracks.map(track => track.kind).join()).to.equal('audio,video')
          expect(aliceRemoteTracks.map(track => track.kind).join()).to.equal('audio,video')
          expect(aliceLocalTracks.map(track => track.kind).join()).to.equal('audio,video')
          expect(aliceRemoteTracks.map(track => track.kind).join()).to.equal('audio,video')

          done()
        }
      }

      on(bobPeer, 'remotestream', next)
      on(alicePeer, 'remotestream', next)

      const { audio } = media
      bobPeer.addMedia({ audio })
    })

    it('alice sends quit video media request to bob, both end', done => {
      let count = 2, next = () => {
        if (!--count) {
          debug(alice.print())
          debug(bob.print())

          const aliceLocalTracks = alicePeer.localStream.getTracks()
          const aliceRemoteTracks = alicePeer.remoteStream.getTracks()
          const bobLocalTracks = bobPeer.localStream.getTracks()
          const bobRemoteTracks = bobPeer.remoteStream.getTracks()

          expect(aliceLocalTracks.map(track => track.kind).join()).to.equal('audio')
          expect(aliceRemoteTracks.map(track => track.kind).join()).to.equal('audio')
          expect(aliceLocalTracks.map(track => track.kind).join()).to.equal('audio')
          expect(aliceRemoteTracks.map(track => track.kind).join()).to.equal('audio')

          done()
        }
      }

      once(alicePeer, 'endedmedia', next)
      once(bobPeer, 'endedmedia', next)

      // once(alicePeer, 'localdescription', desc => alice.send(new Message({
      //   ...desc,
      //   from: 'alice',
      //   type: 'offer-quit-media',
      //   media: { video: true }
      // })))

      alicePeer.removeMedia({ video: true })
    })

    it('alice sends quit audio media request to bob, both end', done => {
      let count = 2, next = () => {
        if (!--count) {
          debug(alice.print())
          debug(bob.print())

          expect(alicePeer.localStream).to.equal(null)
          expect(alicePeer.remoteStream).to.equal(null)
          expect(bobPeer.localStream).to.equal(null)
          expect(bobPeer.remoteStream).to.equal(null)

          setTimeout(done, 2000)
        }
      }

      once(alicePeer, 'endedmedia', next)
      once(bobPeer, 'endedmedia', next)

      // once(alicePeer, 'localdescription', desc => alice.send(new Message({
      //   ...desc,
      //   from: 'alice',
      //   type: 'offer-quit-media',
      //   media: { audio: true }
      // })))

      alicePeer.removeMedia({ audio: true })
    })
  }
})
