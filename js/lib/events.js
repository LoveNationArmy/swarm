const unwrap = fn => event => fn(event.detail ?? event.channel ?? event.data ?? event, event)
export const emit = (target, name, detail) => target.dispatchEvent(new CustomEvent(name, { detail }))
export const on = (target, name, fn, opts) => (fn = unwrap(fn), target.addEventListener(name, fn, opts), [target, name, fn])
export const off = ([target, name, fn]) => target.removeEventListener(name, fn)
export const once = (...args) => on(...args, { once: true })
