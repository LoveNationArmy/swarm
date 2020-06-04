import * as color from './color.js'
const log = (...args) => {
  const error = new Error()
  const where = error.stack.split(/\n/)[4]
  const [line, col] = where.split(':').slice(-2)
  const file = where.split('/').slice(3).join('/').split(':')[0]
  return console.log(...args, color.begin('#333') + `[${line} ${file}]` + color.end())
}
const debug = (...args) => window.DEBUG && log(...args)
debug.color = (...args) => window.DEBUG && debug(color.begin(args[0]), ...args.slice(1), color.end())
debug.origin = origin => {
  let d = (...args) => debug(Array(15).fill(' ').slice(0, 15-origin.length).join('') + origin, '|', ...args)
  d.color = (...args) => d(color.begin(args[0]), ...args.slice(1), color.end())
  return d
}
export default debug
