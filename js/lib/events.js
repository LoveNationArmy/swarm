export const emit = (target, name, detail) => target.dispatchEvent(new CustomEvent(name, { detail }))
export const on = (target, ...args) => target.addEventListener(...args)
export const once = (...args) => on(...args, { once: true })
