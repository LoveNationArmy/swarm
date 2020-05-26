import now from '../../js/lib/monotonic-timestamp.js'

describe('now()', function () {
  it('returns a timestamp', () => {
    expect(now()).to.be.a('number')
    expect(now() >= Date.now()).to.equal(true)
  })

  it('returns an always increasing timestamp', () => {
    const t = [now(),now(),now()]
    expect(t[0] < t[1]).to.equal(true)
    expect(t[1] < t[2]).to.equal(true)
  })
})
