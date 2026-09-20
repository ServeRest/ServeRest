'use strict'

const { Joi } = require('express-validation')

const { email, texto } = require('../utils/textoSemEmoji')

exports.schemaPost = {
  body: Joi.object({
    email: email().required(),
    password: texto().required()
  })
}
