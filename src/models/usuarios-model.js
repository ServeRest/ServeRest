'use strict'

const { Joi } = require('express-validation')

const filtroDeTexto = require('../utils/filtroDeTexto')

exports.schemaGet = {
  query: Joi.object({
    _id: filtroDeTexto,
    nome: filtroDeTexto,
    email: Joi.string().email(),
    password: filtroDeTexto,
    administrador: Joi.any().valid('true', 'false')
  })
}

exports.schemaGetOne = {
  params: Joi.object({
    id: Joi.string().regex(/^[a-zA-Z0-9]{16}$/).required()
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
