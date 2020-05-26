let last = 0
const timestamp = (now = Date.now()) => now > last ? last = now : timestamp(++now)
export default timestamp
