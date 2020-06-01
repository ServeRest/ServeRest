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

const post = Joi.object().keys({
  error: Joi.object().keys({
    name: Joi.string().required(),
    message: Joi.string().required(),
    statusCode: Joi.number().required(),
    error: Joi.string().required(),
    details: Joi.array().items(
      Joi.object({
        nome: Joi.string().required(),
        email: Joi.string().required(),
        password: Joi.string().required(),
        administrador: Joi.string().required()
      })
    )
  }).required()
})

module.exports = {
  get,
  post,
  put: post
}
