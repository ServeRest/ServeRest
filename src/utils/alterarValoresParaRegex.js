const escapeStringRegexp = require('escape-string-regexp')

const { log } = require('./logger')

const permittedKeys = ['nome', 'password', 'descricao']

module.exports = queryString => {
  Object.keys(queryString).forEach(key => {
    if (permittedKeys.includes(key) && queryString[key] != null) {
      try {
        // Add 'i' flag for case-insensitive matching
        queryString[key] = new RegExp(escapeStringRegexp(queryString[key]), 'i')
      } catch (error) /* istanbul ignore next */ {
        log({ level: 'error', message: `Failed to convert ${key} to RegExp: ${error.message}` })
        throw error
      }
    }
  })
  return queryString
}
