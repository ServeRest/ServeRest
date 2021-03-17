'use strict'

const { Joi } = require('express-validation')

exports.schemaGet = {
  query: Joi.object({
    precoTotal: Joi.number().positive().integer(),
    quantidadeTotal: Joi.number().positive().integer(),
    idUsuario: Joi.any(),
    _id: Joi.any()
  })
}

exports.schemaGetOne = {
  params: Joi.object({
    id: Joi.string().required()
  })
}

exports.schemaPost = {
  body: Joi.object({
    produtos: Joi.array().items(
      Joi.object({
        idProduto: Joi.string().required(),
        quantidade: Joi.number().positive().integer().required()
      }).required()
    ).required()
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
