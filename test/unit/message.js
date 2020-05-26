import Message from '../../js/message.js'

describe('new Message', function () {
  it('extends Object', () => {
    const msg = new Message({})
    expect(msg).to.be.an('object')
    expect(msg).to.deep.equal({})
  })

  it('receives initial object', () => {
    const msg = new Message({ foo: 'bar' })
    expect(msg).to.deep.equal({ foo: 'bar' })
  })

  it('throws on undefined', () => {
    try {
      new Message()
    } catch (error) {
      expect(error.message).to.be.string('undefined')
    }
  })
})

describe('Message.parse', function () {
  it('parses a Message string', () => {
    const fixture = 'time:id:to:from:type {"foo":"bar"}'
    const expected = {
      time: 'time',
      id: 'id',
      to: 'to',
      from: 'from',
      type: 'type',
      foo: 'bar',
      text: '{"foo":"bar"}'
    }
    const obj = Message.parse(fixture)
    expect(obj).to.deep.equal(expected)
  })

  it('text field with literal string', () => {
    const fixture = 'time:id:to:from:type non json string'
    const expected = {
      time: 'time',
      id: 'id',
      to: 'to',
      from: 'from',
      type: 'type',
      text: 'non json string'
    }
    const obj = Message.parse(fixture)
    expect(obj).to.deep.equal(expected)
  })

  it('forgives right to left', () => {
    let fixture, expected, obj

    fixture = 'type data'
    expected = {
      time: undefined,
      id: undefined,
      to: undefined,
      from: undefined,
      type: 'type',
      text: 'data'
    }
    obj = Message.parse(fixture)
    expect(obj).to.deep.equal(expected)

    fixture = 'from:type text'
    expected = {
      time: undefined,
      id: undefined,
      to: undefined,
      from: 'from',
      type: 'type',
      text: 'text'
    }
    obj = Message.parse(fixture)
    expect(obj).to.deep.equal(expected)
  })

  it('single word is just type', () => {
    const fixture = 'foo'
    const expected = {
      time: undefined,
      id: undefined,
      to: undefined,
      from: undefined,
      type: 'foo',
      text: undefined
    }
    const obj = Message.parse(fixture)
    expect(obj).to.deep.equal(expected)
  })

  it('empty throws', () => {
    const fixture = ''
    try {
      const obj = Message.parse(fixture)
    } catch (error) {
      expect(error.message).to.be.string('Message.parse error')
    }
  })
})

describe('Message.serialize', function () {
  it('serializes a Message object', () => {
    const fixture = {
      time: 'time',
      id: 'id',
      to: 'to',
      from: 'from',
      type: 'type',
      foo: 'bar'
    }
    const expected = 'time:id:to:from:type {"foo":"bar"}'
    const string = Message.serialize(fixture)
    expect(string).to.deep.equal(expected)
  })

  it('reformats text properly', () => {
    const fixture = {
      time: undefined,
      id: undefined,
      to: undefined,
      from: undefined,
      type: 'type',
      text: 'foo'
    }
    const expected = 'type foo'
    const string = Message.serialize(fixture)
    expect(string).to.deep.equal(expected)
  })

  it('data have precedence over text, discard text on serialize', () => {
    const fixture = {
      time: undefined,
      id: undefined,
      to: undefined,
      from: undefined,
      type: 'type',
      text: 'foo',
      other: 'data'
    }
    const expected = 'type {"other":"data"}'
    const string = Message.serialize(fixture)
    expect(string).to.deep.equal(expected)
  })

  it('forgives missing fields', () => {
    const fixture = {
      time: undefined,
      id: undefined,
      to: undefined,
      from: undefined,
      type: 'type',
    }
    const expected = 'type'
    const string = Message.serialize(fixture)
    expect(string).to.deep.equal(expected)
  })

  it('forgives missing fields adding necessary columns', () => {
    const fixture = {
      time: undefined,
      id: '123',
      to: undefined,
      from: undefined,
      type: 'type'
    }
    const expected = '123:::type'
    const string = Message.serialize(fixture)
    expect(string).to.deep.equal(expected)
  })

  it('string object simply returns as is', () => {
    const fixture = 'foo'
    const expected = 'foo'
    const string = Message.serialize(fixture)
    expect(string).to.equal(expected)
  })
})

describe('new Message(string)', function () {
  it('parses', () => {
    const fixture = 'time:id:to:from:type {"foo":"bar"}'
    const expected = {
      time: 'time',
      id: 'id',
      to: 'to',
      from: 'from',
      type: 'type',
      text: '{"foo":"bar"}',
      foo: 'bar'
    }
    const obj = new Message(fixture)
    expect(obj).to.deep.equal(expected)
  })
})

describe('message.toString()', function () {
  it('return serialized', () => {
    const fixture = {
      time: 'time',
      id: 'id',
      to: 'to',
      from: 'from',
      type: 'type',
      foo: 'bar'
    }
    const expected = 'time:id:to:from:type {"foo":"bar"}'
    const string = new Message(fixture).toString()
    expect(string).to.deep.equal(expected)
  })
})
