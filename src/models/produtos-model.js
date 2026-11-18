'use strict'

const { Joi } = require('express-validation')

const filtroDeTexto = require('../utils/filtroDeTexto')

exports.schemaGet = {
  query: Joi.object({
    _id: filtroDeTexto,
    nome: filtroDeTexto,
    preco: Joi.number().positive().integer(),
    descricao: filtroDeTexto,
    quantidade: Joi.number().min(0).integer(),
    imagem: filtroDeTexto
  })
}

exports.schemaGetOne = {
  params: Joi.object({
    id: Joi.string().regex(/^[a-zA-Z0-9]{16}$/).required()
  })
}

exports.schemaPost = {
  body: Joi.object({
    nome: Joi.string().trim().required(),
    preco: Joi.number().positive().integer().required(),
    descricao: Joi.string().required(),
    quantidade: Joi.number().min(0).integer().required(),
    imagem: Joi.string().trim().optional()
  })
}

exports.schemaDelete = {
  params: Joi.object({
    id: Joi.string().regex(/^[a-zA-Z0-9]{16}$/).required()
  })
}

exports.schemaPut = {
  params: this.schemaDelete.params,
  body: this.schemaPost.body
}
