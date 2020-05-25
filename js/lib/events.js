const unwrap = fn => event => fn(event.detail ?? event.channel ?? event.data ?? event, event)
export const emit = (target, name, detail) => target.dispatchEvent(new CustomEvent(name, { detail }))
export const on = (target, name, fn, opts) => (fn = unwrap(fn), target.addEventListener(name, fn, opts), [target, name, fn])
export const off = ([target, name, fn]) => target.removeEventListener(name, fn)
export const once = (...args) => on(...args, { once: true })
export const pipe = (source, name, target, map = x => x, opts) => {
  const listener = on(source, name, message => target.send({ channel: source, message: map(message) }), opts)
  once(source, 'close', () => off(listener))
}
export const proxy = (source, name, target, opts) => {
  const listener = on(source, name, message => emit(target, name, { channel: source, message }), opts)
  once(source, 'close', () => off(listener))
}
