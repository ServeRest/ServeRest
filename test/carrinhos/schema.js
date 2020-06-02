const Joi = require('@hapi/joi')

const get = Joi.object().keys({
  quantidade: Joi.number().required(),
  carrinhos: Joi.array().items(
    Joi.object({
      produtos: Joi.array().items(
        Joi.object({
          idProduto: Joi.string().regex(/^[a-zA-Z0-9]/).required(),
          quantidade: Joi.number().positive().integer().required(),
          precoUnitario: Joi.number().positive().integer().required()
        })
      ),
      precoTotal: Joi.number().positive().integer().required(),
      quantidadeTotal: Joi.number().positive().integer().required(),
      idUsuario: Joi.string().regex(/^[a-zA-Z0-9]/).required(),
      _id: Joi.string().regex(/^[a-zA-Z0-9]/).required()
    })
  )
})

const postSemBody = Joi.object().keys({
  error: Joi.object().keys({
    name: Joi.string().required(),
    message: Joi.string().required(),
    statusCode: Joi.number().required(),
    error: Joi.string().required(),
    details: Joi.array().items(
      Joi.object({
        produtos: Joi.string().required()
      })
    )
  }).required()
})

const postSemProdutos = Joi.object().keys({
  error: Joi.object().keys({
    name: Joi.string().required(),
    message: Joi.string().required(),
    statusCode: Joi.number().required(),
    error: Joi.string().required(),
    details: Joi.array().items(
      Joi.object({
        quantidade: Joi.string().required(),
        produtos: Joi.string().required(),
        idProduto: Joi.string().required()
      })
    )
  }).required()
})

module.exports = {
  get,
  postSemBody,
  postSemProdutos
}
