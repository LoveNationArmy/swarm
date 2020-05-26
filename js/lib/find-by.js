export default (prop, set, value) => [...set].find(item => item[prop] === value)
