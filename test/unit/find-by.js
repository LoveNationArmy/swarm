import findBy from '../../js/lib/find-by.js'

describe('findBy(prop, set, value)', function () {
  it('finds `prop` of `value` in Set `set`', () => {
    const set = new Set()

    const a = { foo: 'bar' }
    const b = { zoo: 'doo' }
    const c = { sea: 'sun' }

    set.add(a).add(b).add(c)

    expect(findBy('foo', set, 'bar')).to.equal(a)
    expect(findBy('zoo', set, 'doo')).to.equal(b)
    expect(findBy('sea', set, 'sun')).to.equal(c)
  })

  it('finds `prop` of `value` in Array `set`', () => {
    const a = { foo: 'bar' }
    const b = { zoo: 'doo' }
    const c = { sea: 'sun' }

    const set = [a,b,c]

    expect(findBy('foo', set, 'bar')).to.equal(a)
    expect(findBy('zoo', set, 'doo')).to.equal(b)
    expect(findBy('sea', set, 'sun')).to.equal(c)
  })

  it('returns `undefined` when nothing found', () => {
    const set = new Set()

    const a = { foo: 'bar' }
    const b = { zoo: 'doo' }
    const c = { sea: 'sun' }

    set.add(a).add(b).add(c)

    expect(findBy('non', set, 'existent')).to.equal(undefined)
  })
})
