const chai = require('chai')
const faker = require('faker')

const rotaUsuarios = '/usuarios'
const schemaUsuarios = require('../models/usuarios')
const utils = require('../utils')

describe(rotaUsuarios, () => {
  describe('@contrato', () => {
    it('GET', async () => {
      const { body } = await request.get(rotaUsuarios).expect(200)
      joiAssert(body, schemaUsuarios.get)
    })

    it('POST', async () => {
      const { body } = await request
        .post(rotaUsuarios)
        .send({})
        .expect(400)

      joiAssert(body, schemaUsuarios.post)
    })

    it('PUT', async () => {
      const { body } = await request
        .put(`${rotaUsuarios}/123123123`)
        .send({})
        .expect(400)

      joiAssert(body, schemaUsuarios.put)
    })
  })

  describe('GET', () => {
    it('Query string - Busca por todos as chaves', async () => {
      const usuario = await utils.cadastrarUsuario()
      const { body } = await request.get(rotaUsuarios).query({
        nome: usuario.nome,
        email: usuario.email,
        password: usuario.password,
        administrador: usuario.administrador,
        _id: usuario._id
      }).expect(200)

      chai.assert.deepEqual(body, {
        quantidade: 1,
        usuarios: [
          {
            nome: usuario.nome,
            email: usuario.email,
            password: usuario.password,
            administrador: usuario.administrador,
            _id: usuario._id
          }
        ]
      })
      await utils.excluirUsuario(usuario._id)
    })

    it('Query string - Nenhum usuário encontrado', async () => {
      const { body } = await request.get(rotaUsuarios).query({ _id: 'a' }).expect(200)
      chai.assert.deepEqual(body, { quantidade: 0, usuarios: [] })
    })

    it('Query string - Chave inexistente', async () => {
      const { body } = await request.get(rotaUsuarios).query({ inexistente: 'a' }).expect(400)

      chai.assert.deepEqual(body, {
        error: {
          name: 'ValidationError',
          message: 'Validation Failed',
          statusCode: 400,
          error: 'Bad Request',
          details: [{ inexistente: '"inexistente" is not allowed' }]
        }
      })
    })
  })

  describe('POST', () => {
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

  describe('PUT', () => {
    it('Cadastro com sucesso', async () => {
      const { body } = await request.put(rotaUsuarios + '/a').send({
        nome: faker.name.firstName() + ' ' + faker.name.lastName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        administrador: `${faker.random.boolean()}`
      }).expect(201)

      chai.assert.deepEqual(body, { message: 'Cadastro realizado com sucesso', _id: body._id })
    })

    it('Email já utilizado', async () => {
      const usuario = {
        nome: faker.name.firstName() + ' ' + faker.name.lastName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        administrador: `${faker.random.boolean()}`
      }

      await request.post(rotaUsuarios).send(usuario).expect(201)
      const { body } = await request.put(rotaUsuarios + '/a').send(usuario).expect(400)

      chai.assert.deepEqual(body, { message: 'Este email já está sendo usado' })
    })

    it('Bad request', async () => {
      const { body } = await request.put(rotaUsuarios + '/a').send({ inexistente: '1' }).expect(400)

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

    it('Registro alterado', async () => {
      const usuario = {
        nome: faker.name.firstName() + ' ' + faker.name.lastName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        administrador: `${faker.random.boolean()}`
      }

      const { body } = await request.post(rotaUsuarios).send(usuario).expect(201)
      const { body: bodyPut } = await request.put(`${rotaUsuarios}/${body._id}`).send(usuario).expect(200)

      chai.assert.deepEqual(bodyPut, { message: 'Registro alterado com sucesso' })
    })
  })

  describe('DELETE', () => {
    it('Registro excluído com sucesso', async () => {
      const { body } = await request.post(rotaUsuarios).send({
        nome: faker.name.firstName() + ' ' + faker.name.lastName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        administrador: `${faker.random.boolean()}`
      }).expect(201)

      const { body: bodyDel } = await request.del(`${rotaUsuarios}/${body._id}`).expect(200)
      const { body: bodyGet } = await request.get(rotaUsuarios).query({ _id: body._id })

      chai.assert.deepEqual(bodyDel, { message: 'Registro excluído com sucesso' })
      chai.assert.deepEqual(bodyGet, { quantidade: 0, usuarios: [] })
    })

    it('Nenhum registro excluído', async () => {
      const { body } = await request.del(`${rotaUsuarios}/a`).expect(200)

      chai.assert.deepEqual(body, { message: 'Nenhum registro excluído' })
    })

    it('Usuário com carrinho cadastrado', async () => {
      const { email, password, _id: idUsuario } = await utils.cadastrarUsuario()
      const { authorization } = await utils.login(email, password)
      const { _id: idCarrinho } = await utils.cadastrarCarrinho({ authorization })

      const { body } = await request.del(`${rotaUsuarios}/${idUsuario}`).expect(400)
      const { body: bodyGet } = await request.get(rotaUsuarios).query({ _id: idUsuario })

      chai.assert.deepEqual(body, { message: 'Não é permitido excluir usuário com carrinho cadastrado', idCarrinho })
      chai.assert.equal(bodyGet.quantidade, 1)
    })
  })
})
