'use strict'

const { validate } = require('express-validation')

module.exports = schema => {
  return validate(schema, { keyByField: false }, { abortEarly: false })
}
