const Joi = require('@hapi/joi')

const get = Joi.object().keys({
  quantidade: Joi.number().required(),
  produtos: Joi.array().items(
    Joi.object({
      nome: Joi.string().required(),
      preco: Joi.number().positive().integer().required(),
      descricao: Joi.string().required(),
      quantidade: Joi.number().min(0).integer().required(),
      imagem: Joi.string().allow(null, '').optional(),
      _id: Joi.string().regex(/^[a-zA-Z0-9]/).required()
    })
  )
})

const post = Joi.object().keys({
  nome: Joi.string().required(),
  preco: Joi.string().required(),
  descricao: Joi.string().required(),
  quantidade: Joi.string().required(),
  imagem: Joi.string().optional()
})

module.exports = {
  get,
  post,
  put: post
}
