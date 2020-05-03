'use strict'

const { Joi } = require('express-validation')

exports.schemaGet = {
  query: Joi.object({
    _id: Joi.any(),
    produtos: Joi.any(),
    idusuario: Joi.any(),
    idproduto: Joi.any(),
    quantidade: Joi.any(),
    precounitario: Joi.any(),
    precototal: Joi.any()
  })
}

exports.schemaPost = {
  body: Joi.object({
    produtos: Joi.array().unique('idproduto').items(
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
