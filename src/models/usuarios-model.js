'use strict'

const { Joi } = require('express-validation')

exports.schemaGet = {
  query: Joi.object({
    _id: Joi.any(),
    nome: Joi.any(),
    email: Joi.string().email(),
    password: Joi.any(),
    administrador: Joi.any().valid('true', 'false')
  })
}

exports.schemaGetOne = {
  params: Joi.object({
    id: Joi.string().required()
  })
}

exports.schemaPost = {
  body: Joi.object({
    nome: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    administrador: Joi.any().valid('true', 'false').required()
  })
}

exports.schemaDelete = {
  params: Joi.object({
    id: Joi.string().required()
  })
}

exports.schemaPut = {
  params: this.schemaDelete.params,
  body: this.schemaPost.body
}
