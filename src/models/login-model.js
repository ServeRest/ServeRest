'use strict'

const { Joi } = require('express-validation')

exports.schemaPost = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
}
