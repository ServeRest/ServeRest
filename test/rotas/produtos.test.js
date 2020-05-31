const chai = require('chai')
const faker = require('faker')

const rotaProdutos = '/produtos'
const schemaProdutos = require('../models/produtos')
const utils = require('../utils')

describe(rotaProdutos, () => {
  describe('@contrato', () => {
    it('GET', async () => {
      const { body } = await request.get(rotaProdutos).expect(200)

      joiAssert(body, schemaProdutos.get)
    })

    it('POST', async () => {
      const { authorization } = await utils.login('fulano@qa.com', 'teste')

      const { body } = await request
        .post(rotaProdutos)
        .set('authorization', authorization)
        .send({})
        .expect(400)

      joiAssert(body, schemaProdutos.post)
    })

    it('PUT', async () => {
      const { authorization } = await utils.login('fulano@qa.com', 'teste')
      const { body } = await request
        .put(`${rotaProdutos}/123123`)
        .set('authorization', authorization)
        .send({})
        .expect(400)

      joiAssert(body, schemaProdutos.put)
    })
  })

  describe('GET', () => {
    it('Query string - Busca por todos as chaves', async () => {
      const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
      const { authorization } = await utils.login(email, password)
      const produto = await utils.cadastrarProduto({ authorization })

      const { body } = await request.get(rotaProdutos).query(produto)

      chai.assert.deepEqual(body, {
        quantidade: 1,
        produtos: [
          produto
        ]
      })
    })

    it('Query string - Nenhum produto encontrado', async () => {
      const { body } = await request.get(rotaProdutos).query({ _id: 'a' }).expect(200)
      chai.assert.deepEqual(body, { quantidade: 0, produtos: [] })
    })

    it('Query string - Chave inexistente', async () => {
      const { body } = await request.get(rotaProdutos).query({ inexistente: 'a' }).expect(400)

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

  let authorizationAdministrador
  beforeEach(async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    authorizationAdministrador = authorization
  })

  describe('POST', () => {
    it('Cadastro com sucesso', async () => {
      const { body } = await request.post(rotaProdutos).send({
        nome: faker.commerce.productName(),
        preco: faker.random.number(),
        descricao: faker.random.words(),
        quantidade: faker.random.number()
      }).set('authorization', authorizationAdministrador).expect(201)

      chai.assert.deepEqual(body, { message: 'Cadastro realizado com sucesso', _id: body._id })
    })

    it('Nome já utilizado', async () => {
      const produto = {
        nome: faker.commerce.productName(),
        preco: faker.random.number(),
        descricao: faker.random.words(),
        quantidade: faker.random.number()
      }

      await request
        .post(rotaProdutos)
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(201)
      const { body } = await request
        .post(rotaProdutos)
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, { message: 'Já existe produto com esse nome' })
    })

    it('Token inválido', async () => {
      const { body } = await request.post(rotaProdutos).send({
        nome: faker.commerce.productName(),
        preco: faker.random.number(),
        descricao: faker.random.words(),
        quantidade: faker.random.number()
      }).set('authorization', 'a').expect(401)

      chai.assert.deepEqual(body, {
        message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
      })
    })

    it('Rota para administradores', async () => {
      const { email, password } = await utils.cadastrarUsuario({ administrador: 'false' })
      const { authorization } = await utils.login(email, password)
      const { body } = await request.post(rotaProdutos).send({
        nome: faker.commerce.productName(),
        preco: faker.random.number(),
        descricao: faker.random.words(),
        quantidade: faker.random.number()
      }).set('authorization', authorization).expect(403)

      chai.assert.deepEqual(body, {
        message: 'Rota exclusiva para administradores'
      })
    })

    it('Bad request', async () => {
      const { body } = await request
        .post(rotaProdutos)
        .send({ inexistente: 'teste' })
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        error: {
          name: 'ValidationError',
          message: 'Validation Failed',
          statusCode: 400,
          error: 'Bad Request',
          details: [{
            nome: '"nome" is required',
            preco: '"preco" is required',
            descricao: '"descricao" is required',
            quantidade: '"quantidade" is required',
            inexistente: '"inexistente" is not allowed'
          }]
        }
      })
    })
  })

  describe('PUT', () => {
    it('Registro alterado', async () => {
      const produto = {
        nome: faker.commerce.productName(),
        preco: faker.random.number(),
        descricao: faker.random.words(),
        quantidade: faker.random.number()
      }

      const { body } = await request
        .post(rotaProdutos)
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(201)
      const { body: bodyPut } = await request
        .put(`${rotaProdutos}/${body._id}`)
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(200)

      chai.assert.deepEqual(bodyPut, { message: 'Registro alterado com sucesso' })
    })

    it('Cadastro com sucesso', async () => {
      const { body } = await request.put(rotaProdutos + '/a').send({
        nome: faker.commerce.productName(),
        preco: faker.random.number(),
        descricao: faker.random.words(),
        quantidade: faker.random.number()
      })
        .set('authorization', authorizationAdministrador)
        .expect(201)

      chai.assert.deepEqual(body, { message: 'Cadastro realizado com sucesso', _id: body._id })
    })

    it('Nome já utilizado', async () => {
      const produto = {
        nome: faker.commerce.productName(),
        preco: faker.random.number(),
        descricao: faker.random.words(),
        quantidade: faker.random.number()
      }

      await request
        .post(rotaProdutos)
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(201)
      const { body } = await request
        .put(`${rotaProdutos}/a`)
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, { message: 'Já existe produto com esse nome' })
    })

    it('Token inválido', async () => {
      const { body } = await request.put(`${rotaProdutos}/a`).send({
        nome: faker.commerce.productName(),
        preco: faker.random.number(),
        descricao: faker.random.words(),
        quantidade: faker.random.number()
      }).set('authorization', 'a').expect(401)

      chai.assert.deepEqual(body, {
        message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
      })
    })

    it('Rota para administradores', async () => {
      const { email, password } = await utils.cadastrarUsuario({ administrador: 'false' })
      const { authorization } = await utils.login(email, password)
      const { body } = await request.put(`${rotaProdutos}/a`).send({
        nome: faker.commerce.productName(),
        preco: faker.random.number(),
        descricao: faker.random.words(),
        quantidade: faker.random.number()
      }).set('authorization', authorization).expect(403)

      chai.assert.deepEqual(body, {
        message: 'Rota exclusiva para administradores'
      })
    })

    it('Bad request', async () => {
      const { body } = await request
        .put(rotaProdutos + '/a')
        .send({ inexistente: '1' })
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        error: {
          name: 'ValidationError',
          message: 'Validation Failed',
          statusCode: 400,
          error: 'Bad Request',
          details: [{
            nome: '"nome" is required',
            preco: '"preco" is required',
            descricao: '"descricao" is required',
            quantidade: '"quantidade" is required',
            inexistente: '"inexistente" is not allowed'
          }]
        }
      })
    })
  })

  describe('DELETE', () => {
    it('Registro excluído com sucesso', async () => {
      const { _id } = await utils.cadastrarProduto({ authorization: authorizationAdministrador })

      const { body: bodyDel } = await request
        .del(`${rotaProdutos}/${_id}`)
        .set('authorization', authorizationAdministrador)
        .expect(200)
      const { body: bodyGet } = await request.get(rotaProdutos).query({ _id })

      chai.assert.deepEqual(bodyDel, { message: 'Registro excluído com sucesso' })
      chai.assert.deepEqual(bodyGet, { quantidade: 0, produtos: [] })
    })

    it('Nenhum registro excluído', async () => {
      const { body } = await request
        .del(`${rotaProdutos}/a`)
        .set('authorization', authorizationAdministrador)
        .expect(200)

      chai.assert.deepEqual(body, { message: 'Nenhum registro excluído' })
    })

    it('Produto faz parte de carrinho', async () => {
      const authorization = authorizationAdministrador
      const { _id: idProduto } = await utils.cadastrarProduto({ authorization })
      const { _id: idCarrinho } = await utils.cadastrarCarrinho({ idProduto, authorization })

      const { body } = await request
        .del(`${rotaProdutos}/${idProduto}`)
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        message: 'Não é permitido excluir produto que faz parte de carrinho',
        idCarrinhos: [idCarrinho]
      })
      const { body: bodyGet } = await request.get(rotaProdutos).query({ _id: idProduto })
      chai.assert.equal(bodyGet.quantidade, 1)
    })

    it('Token inválido', async () => {
      const { body } = await request
        .del(`${rotaProdutos}/a`)
        .set('authorization', 'a')
        .expect(401)

      chai.assert.deepEqual(body, {
        message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
      })
    })

    it('Rota para administradores', async () => {
      const { email, password } = await utils.cadastrarUsuario({ administrador: 'false' })
      const { authorization } = await utils.login(email, password)
      const { body } = await request
        .del(`${rotaProdutos}/a`)
        .set('authorization', authorization)
        .expect(403)

      chai.assert.deepEqual(body, {
        message: 'Rota exclusiva para administradores'
      })
    })
  })
})
