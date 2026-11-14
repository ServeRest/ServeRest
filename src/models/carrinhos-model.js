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
    id: Joi.string().regex(/^[a-zA-Z0-9]{16}$/).required()
  })
}

exports.schemaPost = {
  body: Joi.object({
    produtos: Joi.array().items(
      Joi.object({
        idProduto: Joi.string().required(),
        quantidade: Joi.number().strict().positive().integer().required()
      }).required()
    ).required()
  })
}
