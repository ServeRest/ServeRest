const escapeStringRegexp = require('escape-string-regexp')

const permittedKeys = ['nome', 'password', 'descricao']

module.exports = queryString => {
  Object.keys(queryString).forEach(key => {
    const isFieldEmpty = !queryString[key]
    /* istanbul ignore next */
    if (isFieldEmpty) {
      delete queryString[key]
    } else if (permittedKeys.includes(key)) {
      // Ensure queryString[key] is a string
      const queryStringValue = typeof queryString[key] === 'string' ? queryString[key] : String(queryString[key])
      // Add 'i' flag for case-insensitive matching
      queryString[key] = new RegExp(escapeStringRegexp(queryStringValue), 'i')
    }
  })
  return queryString
}
