'use strict'

const { Joi } = require('express-validation')

exports.schemaGet = {
  query: Joi.object({
    precototal: Joi.any(),
    quantidadetotal: Joi.any(),
    idusuario: Joi.any(),
    _id: Joi.any()
  })
}

exports.schemaPost = {
  body: Joi.object({
    produtos: Joi.array().items(
      Joi.object({
        idproduto: Joi.string().required(),
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
