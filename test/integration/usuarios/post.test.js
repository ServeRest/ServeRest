const chai = require('chai')
const { faker } = require('@faker-js/faker')

const rotaUsuarios = '/usuarios'

describe(rotaUsuarios + ' POST', () => {
  it('Cadastro com sucesso', async () => {
    const { body } = await request.post(rotaUsuarios).send({
      nome: faker.person.firstName() + ' ' + faker.person.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      administrador: `${faker.helpers.arrayElement([true, false])}`
    }).expect(201)

    chai.assert.deepEqual(body, { message: 'Cadastro realizado com sucesso', _id: body._id })
  })

  it('Email já utilizado', async () => {
    const usuario = {
      nome: faker.person.firstName() + ' ' + faker.person.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      administrador: `${faker.helpers.arrayElement([true, false])}`
    }

    await request.post(rotaUsuarios).send(usuario).expect(201)
    const { body } = await request.post(rotaUsuarios).send(usuario).expect(400)

    chai.assert.deepEqual(body, { message: 'Este email já está sendo usado' })
  })

  it('Bad request - Campos de preenchimento obrigatório', async () => {
    const { body } = await request.post(rotaUsuarios).send({ inexistente: '1' }).expect(400)

    chai.assert.deepEqual(body, {
      nome: 'nome é obrigatório',
      email: 'email é obrigatório',
      password: 'password é obrigatório',
      administrador: 'administrador é obrigatório',
      inexistente: 'inexistente não é permitido'
    })
  })

  it('Bad request - administrador deve ser "true" ou "false" - não deve aceitar número booleano', async () => {
    const { body } = await request.post(rotaUsuarios).send({ administrador: 1 }).expect(400)

    chai.assert.deepEqual(body, {
      nome: 'nome é obrigatório',
      email: 'email é obrigatório',
      password: 'password é obrigatório',
      administrador: "administrador deve ser 'true' ou 'false'"
    })
  })

  it('Bad request - administrador deve ser "true" ou "false" - não deve aceitar boolean fora de aspas', async () => {
    const { body } = await request.post(rotaUsuarios).send({ administrador: false }).expect(400)

    chai.assert.deepEqual(body, {
      nome: 'nome é obrigatório',
      email: 'email é obrigatório',
      password: 'password é obrigatório',
      administrador: "administrador deve ser 'true' ou 'false'"
    })
  })
})
