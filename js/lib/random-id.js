const randomId = (n = 16) => Array(n).fill().map(() => (16*Math.random()|0).toString(16)).join``
export default randomId
