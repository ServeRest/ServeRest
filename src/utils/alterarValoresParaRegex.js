const escapeStringRegexp = require('escape-string-regexp')

const { log } = require('./logger')

const permittedKeys = ['nome', 'password', 'descricao']

module.exports = queryString => {
  Object.keys(queryString).forEach(key => {
    const isFieldEmpty = !queryString[key]
    /* istanbul ignore next */
    if (isFieldEmpty) {
      delete queryString[key]
    } else if (permittedKeys.includes(key)) {
      try {
        // Ensure queryString[key] is a string
        const queryStringValue = typeof queryString[key] === 'string' ? queryString[key] : String(queryString[key])
        // Add 'i' flag for case-insensitive matching
        queryString[key] = new RegExp(escapeStringRegexp(queryStringValue), 'i')
      } catch (error) /* istanbul ignore next */ {
        log({ level: 'error', message: `Failed to convert ${key} to RegExp: ${error.message}` })
        throw error
      }
    }
  })
  return queryString
}
