import * as color from './color.js'
const log = (...args) => {
  const error = new Error()
  const where = error.stack.split(/\n/)[3]
  const [line, col] = where.split(':').slice(-2)
  const file = where.split('/').slice(3).join('/').split(':')[0]
  return console.log(...args, color.begin('#333') + `[${line} ${file}]` + color.end())
}
const debug = (...args) => window.DEBUG && log(...args)
debug.color = (...args) => window.DEBUG && debug(color.begin(args[0]), ...args.slice(1), color.end())
export default debug
