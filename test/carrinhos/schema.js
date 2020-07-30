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
  produtos: Joi.string().required()
})

const postSemProdutos = Joi.object().keys({
  'produtos[0].quantidade': Joi.string().required(),
  produtos: Joi.string().required(),
  'produtos[0].idProduto': Joi.string().required()
})

module.exports = {
  get,
  postSemBody,
  postSemProdutos
}
