import * as color from './color.js'
const debug = (...args) => window.DEBUG && console.log(...args)
debug.color = (...args) => window.DEBUG && debug(color.begin(args[0]), ...args.slice(1), color.end())
export default debug
