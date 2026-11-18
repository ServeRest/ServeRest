const escapeStringRegexp = require('escape-string-regexp').default

const { chegouEmBranco } = require('./filtrosDaQuery')

const permittedKeys = ['nome', 'password', 'descricao']

module.exports = queryString => {
  Object.keys(queryString).forEach(key => {
    // Só o valor em branco (?nome=, ?nome=%20) deixa de filtrar, como sempre foi. Descartar todo valor falso
    // descartava também o 0: ?quantidade=0 e um _id que o parser convertia em 0 devolviam a lista inteira.
    const valor = queryString[key]
    if ((typeof valor === 'string' && valor.trim() === '') || chegouEmBranco(queryString, key)) {
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
