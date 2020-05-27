const prefix = '\x1b['
const suffix = 'm'

const hex = color => {
  color = color[0] === '#' ? color.substring(1) : color

  //
  // Pre-parse for shorthand hex colors.
  //
  if (color.length === 3) {
    color = color.split('')

    color[5] = color[2] // F60##0
    color[4] = color[2] // F60#00
    color[3] = color[1] // F60600
    color[2] = color[1] // F66600
    color[1] = color[0] // FF6600

    color = color.join('')
  }

  const r = color.substring(0, 2)
  const g = color.substring(2, 4)
  const b = color.substring(4, 6)

  return [ parseInt(r, 16), parseInt(g, 16), parseInt(b, 16) ]
}

/**
 * Transform a 255 RGB value to an RGV code.
 *
 * @param {Number} r Red color channel.
 * @param {Number} g Green color channel.
 * @param {Number} b Blue color channel.
 * @returns {String}
 * @api public
 */
const rgb = (r, g, b) => ansi(r / 255 * 5, g / 255 * 5, b / 255 * 5)

/**
 * Turns RGB 0-5 values into a single ANSI code.
 *
 * @param {Number} r Red color channel.
 * @param {Number} g Green color channel.
 * @param {Number} b Blue color channel.
 * @returns {String}
 * @api public
 */
const ansi = (r, g, b) => 16 + (Math.round(r) * 36) + (Math.round(g) * 6) + Math.round(b)

export const end = () => `${prefix}39;49${suffix}`

/**
 * Colour the terminal using CSS.
 *
 * @param {String} color The HEX color code.
 * @returns {String} the escape code.
 * @api public
 */
export const begin = color => `${prefix}38;5;${rgb(...hex(color))}${suffix}`
