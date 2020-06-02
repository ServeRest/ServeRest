const chai = require('chai')

const rotaLogin = '/login'
const utils = require('../utils')

describe(rotaLogin + ' POST', () => {
  it('Login com sucesso', async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { body } = await request.post('/login').send({
      email,
      password
    }).expect(200)

    chai.assert.deepEqual(body, {
      message: 'Login realizado com sucesso',
      authorization: 'Bearer ' + body.authorization.split(' ')[1]
    })
  })

  it('Email e/ou senha inválidos', async () => {
    const { body } = await request.post('/login').send({
      email: 'paulo@a.com',
      password: 'a'
    }).expect(401)

    chai.assert.deepEqual(body, { message: 'Email e/ou senha inválidos' })
  })

  it('Bad request - Chave inválida', async () => {
    const { body } = await request.post(rotaLogin).send({ inexistente: '1' }).expect(400)

    chai.assert.deepEqual(body, {
      error: {
        name: 'ValidationError',
        message: 'Validation Failed',
        statusCode: 400,
        error: 'Bad Request',
        details: [{
          email: '"email" is required',
          password: '"password" is required',
          inexistente: '"inexistente" is not allowed'
        }]
      }
    })
  })

  it('Bad request - Email inválido', async () => {
    const { body } = await request.post(rotaLogin).send({ email: 'a' }).expect(400)

    chai.assert.deepEqual(body, {
      error: {
        name: 'ValidationError',
        message: 'Validation Failed',
        statusCode: 400,
        error: 'Bad Request',
        details: [{
          email: '"email" must be a valid email',
          password: '"password" is required'
        }]
      }
    })
  })
})
