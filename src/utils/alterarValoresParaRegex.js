const { log } = require('./logger')

module.exports = queryString => {
  Object.keys(queryString).forEach(key => {
    if (['nome', 'password', 'descricao'].includes(key)) {
      try {
        // Add 'i' flag for case-insensitive matching
        queryString[key] = new RegExp(queryString[key], 'i')
      } catch (error) {
        /* istanbul ignore next */
        log({ level: 'error', message: `Failed to convert ${key} to RegExp: ${error.message}` })
      }
    }
  })
  return queryString
}
