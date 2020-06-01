const chai = require('chai')
const faker = require('faker')

const rotaUsuarios = '/usuarios'
const utils = require('../utils')

describe(rotaUsuarios + ' POST', () => {
  it('Cadastro com sucesso', async () => {
    const { body } = await request.post(rotaUsuarios).send({
      nome: faker.name.firstName() + ' ' + faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      administrador: `${faker.random.boolean()}`
    }).expect(201)

    chai.assert.deepEqual(body, { message: 'Cadastro realizado com sucesso', _id: body._id })
    await utils.excluirUsuario(body._id)
  })

  it('Email já utilizado', async () => {
    const usuario = {
      nome: faker.name.firstName() + ' ' + faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      administrador: `${faker.random.boolean()}`
    }

    await request.post(rotaUsuarios).send(usuario).expect(201)
    const { body } = await request.post(rotaUsuarios).send(usuario).expect(400)

    chai.assert.deepEqual(body, { message: 'Este email já está sendo usado' })
    await utils.excluirUsuario(body._id)
  })

  it('Bad request', async () => {
    const { body } = await request.post(rotaUsuarios).send({ inexistente: '1' }).expect(400)

    chai.assert.deepEqual(body, {
      error: {
        name: 'ValidationError',
        message: 'Validation Failed',
        statusCode: 400,
        error: 'Bad Request',
        details: [{
          nome: '"nome" is required',
          email: '"email" is required',
          password: '"password" is required',
          administrador: '"administrador" is required',
          inexistente: '"inexistente" is not allowed'
        }]
      }
    })
  })
})
