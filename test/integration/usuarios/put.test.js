const chai = require('chai')
const faker = require('faker')

const rotaUsuarios = '/usuarios'

describe(rotaUsuarios + ' PUT', () => {
  it('Cadastro com sucesso', async () => {
    const { body } = await request.put(rotaUsuarios + '/a').send({
      nome: faker.name.firstName() + ' ' + faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      administrador: `${faker.datatype.boolean()}`
    }).expect(201)

    chai.assert.deepEqual(body, { message: 'Cadastro realizado com sucesso', _id: body._id })
  })

  it('Email já utilizado', async () => {
    const usuario = {
      nome: faker.name.firstName() + ' ' + faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      administrador: `${faker.datatype.boolean()}`
    }

    await request.post(rotaUsuarios).send(usuario).expect(201)
    const { body } = await request.put(rotaUsuarios + '/a').send(usuario).expect(400)

    chai.assert.deepEqual(body, { message: 'Este email já está sendo usado' })
  })

  it('Bad request', async () => {
    const { body } = await request.put(rotaUsuarios + '/a').send({ inexistente: '1' }).expect(400)

    chai.assert.deepEqual(body, {
      nome: 'nome é obrigatório',
      email: 'email é obrigatório',
      password: 'password é obrigatório',
      administrador: 'administrador é obrigatório',
      inexistente: 'inexistente não é permitido'
    })
  })

  it('Registro alterado', async () => {
    const usuario = {
      nome: faker.name.firstName() + ' ' + faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      administrador: `${faker.datatype.boolean()}`
    }

    const { body } = await request.post(rotaUsuarios).send(usuario).expect(201)
    const { body: bodyPut } = await request.put(`${rotaUsuarios}/${body._id}`).send(usuario).expect(200)

    chai.assert.deepEqual(bodyPut, { message: 'Registro alterado com sucesso' })
  })
})
