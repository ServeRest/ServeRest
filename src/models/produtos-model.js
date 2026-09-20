'use strict'

const { Joi } = require('express-validation')

const { filtroDeTexto, texto } = require('../utils/textoSemEmoji')

exports.schemaGet = {
  query: Joi.object({
    _id: Joi.any(),
    nome: filtroDeTexto(),
    preco: Joi.number().positive().integer(),
    descricao: filtroDeTexto(),
    quantidade: Joi.number().min(0).integer(),
    imagem: filtroDeTexto()
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
    preco: Joi.number().positive().integer().required(),
    descricao: texto().required(),
    quantidade: Joi.number().min(0).integer().required(),
    imagem: texto().optional()
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
