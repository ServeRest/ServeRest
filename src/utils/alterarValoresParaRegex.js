const escapeStringRegexp = require('escape-string-regexp').default

const permittedKeys = ['nome', 'password', 'descricao']

module.exports = queryString => {
  Object.keys(queryString).forEach(key => {
    // Só o valor vazio (?nome=) deixa de filtrar. Descartar todo valor falso descartava também o 0: ?quantidade=0
    // e um _id que o parser convertia em 0 devolviam a lista inteira.
    if (queryString[key] === '') {
      delete queryString[key]
    } else if (permittedKeys.includes(key)) {
      // Texto na query chega como string; String() cobre o valor repetido (?nome=a&nome=b), que chega como array.
      const queryStringValue = String(queryString[key])
      // Add 'i' flag for case-insensitive matching
      queryString[key] = new RegExp(escapeStringRegexp(queryStringValue), 'i')
    }
  })
  return queryString
}
