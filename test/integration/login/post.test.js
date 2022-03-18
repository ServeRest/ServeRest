const chai = require('chai')

const rotaLogin = '/login'
const utils = require('../utils')

describe(rotaLogin + ' POST', () => {
  it('Login com sucesso - @smokeE2E', async () => {
    const { email, password, _id } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { body } = await request.post(rotaLogin).send({
      email,
      password
    }).expect(200)

    chai.assert.deepEqual(body, {
      message: 'Login realizado com sucesso',
      authorization: 'Bearer ' + body.authorization.split(' ')[1]
    })

    // delete user when running smoke test on production
    if (process.env.TEST_TYPE === 'e2e-production') {
      await request.del(`/usuarios/${_id}`)
    }
  })

  it('Email e/ou senha inválidos', async () => {
    const { body } = await request.post(rotaLogin).send({
      email: 'paulo@a.com',
      password: 'a'
    }).expect(401)

    chai.assert.deepEqual(body, { message: 'Email e/ou senha inválidos' })
  })

  it('Bad request - Chave inválida', async () => {
    const { body } = await request.post(rotaLogin).send({ inexistente: '1' }).expect(400)

    chai.assert.deepEqual(body, {
      email: 'email é obrigatório',
      password: 'password é obrigatório',
      inexistente: 'inexistente não é permitido'
    })
  })

  it('Bad request - Email inválido', async () => {
    const { body } = await request.post(rotaLogin).send({ email: 'a' }).expect(400)

    chai.assert.deepEqual(body, {
      email: 'email deve ser um email válido',
      password: 'password é obrigatório'
    })
  })

  it('Bad request - Email em branco', async () => {
    const { body } = await request.post(rotaLogin).send({ email: '' }).expect(400)

    chai.assert.deepEqual(body, {
      email: 'email não pode ficar em branco',
      password: 'password é obrigatório'
    })
  })
})
