'use strict'

const { Joi } = require('express-validation')

// Filtro de texto das listas. O objeto (?_id[$ne]=x) e o array com algo que não é texto (?_id[0][$ne]=x)
// chegariam ao NeDB como operador e são recusados com a mensagem de tipo das strings. O resto segue como
// antes, inclusive o array de textos do parâmetro repetido (?_id=a&_id=b).
const recusado = valor => typeof valor === 'object' && !(Array.isArray(valor) && valor.every(item => typeof item === 'string'))

module.exports = Joi.any().custom((valor, helpers) => recusado(valor) ? helpers.error('string.base') : valor)
