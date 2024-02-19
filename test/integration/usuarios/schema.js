const Joi = require('@hapi/joi')

const get = Joi.object().keys({
  quantidade: Joi.number().required(),
  usuarios: Joi.array().items(
    Joi.object({
      nome: Joi.string().required(),
      email: Joi.string().required(),
      password: Joi.string().required(),
      administrador: Joi.string().required(),
      _id: Joi.string().regex(/^[a-zA-Z0-9]/).required()
    })
  )
})

const getOne = Joi.object().keys({
  nome: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().required(),
  administrador: Joi.string().required(),
  _id: Joi.string().regex(/^[a-zA-Z0-9]/).required()
})

const post = Joi.object().keys({
  nome: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().required(),
  administrador: Joi.string().required()
})

module.exports = {
  get,
  getOne,
  post,
  put: post
}
