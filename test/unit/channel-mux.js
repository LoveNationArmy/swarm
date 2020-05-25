import { emit, once } from '../../js/lib/events.js'
import ChannelMux from '../../js/channel-mux.js'

describe('add(channel)', function () {
  it('adds channel to its collection on `open` event', () => {
    const mux = new ChannelMux()
    const channel = new EventTarget()
    mux.add(channel)
    expect(mux.channels.size).to.equal(0)
    emit(channel, 'open')
    expect(mux.channels.size).to.equal(1)
  })

  it('removes channel from its collection on `close` event', () => {
    const mux = new ChannelMux()
    const channel = new EventTarget()
    mux.add(channel)
    emit(channel, 'open')
    expect(mux.channels.size).to.equal(1)
    emit(channel, 'close')
    expect(mux.channels.size).to.equal(0)
  })

  it('pipes channel messages to send', done => {
    const mux = new ChannelMux()
    const channel = new EventTarget()
    mux.add(channel)
    once(mux, 'message', ({ channel, message }) => {
      expect(message).to.equal('foo')
      done()
    })
    emit(channel, 'message', 'foo')
  })
})

describe('send({ channel, message })', function () {
  it('broadcasts message to other channels', done => {
    const mux = new ChannelMux()
    const a = new EventTarget()
    const b = new EventTarget()
    mux.add(a)
    mux.add(b)
    emit(a, 'open')
    emit(b, 'open')
    b.send = ({ channel, message }) => {
      expect(channel).to.equal(a)
      expect(message).to.equal('foo')
      done()
    }
    mux.send({ channel: a, message: 'foo' })
  })
})
