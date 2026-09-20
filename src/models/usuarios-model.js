'use strict'

const { Joi } = require('express-validation')

const { email, filtroDeTexto, texto } = require('../utils/textoSemEmoji')

exports.schemaGet = {
  query: Joi.object({
    _id: Joi.any(),
    nome: filtroDeTexto(),
    email: email(),
    password: filtroDeTexto(),
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
    nome: texto().required(),
    email: email().required(),
    password: texto().required(),
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
