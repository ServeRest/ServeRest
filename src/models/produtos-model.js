'use strict'

const { Joi } = require('express-validation')

exports.schemaGet = {
  query: Joi.object({
    _id: Joi.any(),
    nome: Joi.any(),
    preco: Joi.any(),
    descricao: Joi.any(),
    quantidade: Joi.any()
  })
}

exports.schemaPost = {
  body: Joi.object({
    nome: Joi.string().required(),
    preco: Joi.number().positive().integer().required(),
    descricao: Joi.string().required(),
    quantidade: Joi.number().min(0).integer().required()
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
