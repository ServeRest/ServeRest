'use strict'

const { validate } = require('express-validation')

const { etapa } = require('../utils/etapas')

module.exports = schema => {
  return etapa('schema', validate(schema, { keyByField: false }, { abortEarly: false }))
}
