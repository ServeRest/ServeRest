const chai = require('chai')
const faker = require('faker')

const rotaCarrinhos = '/carrinhos'
const utils = require('../utils')

describe(rotaCarrinhos + ' POST', () => {
  let authorizationAdministrador
  beforeEach(async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    authorizationAdministrador = authorization
  })

  it('Cadastro com sucesso', async () => {
    const authorization = authorizationAdministrador
    const quantidade = faker.datatype.number()
    const produto = await utils.cadastrarProduto({ authorization, quantidade })

    const { body: bodyCarrinho } = await request.post(rotaCarrinhos).set('authorization', authorization).send({
      produtos: [{
        idProduto: produto._id,
        quantidade: quantidade - 10
      }]
    }).expect(201)

    chai.assert.deepEqual(bodyCarrinho, { message: 'Cadastro realizado com sucesso', _id: bodyCarrinho._id })

    const { body: bodyProduto } = await request.get('/produtos').query({ _id: produto._id })

    chai.assert.equal(bodyProduto.produtos[0].quantidade, 10)
  })

  it('Não é permitido possuir produto duplicado', async () => {
    const authorization = authorizationAdministrador
    const quantidade = faker.datatype.number()
    const { _id: idProduto } = await utils.cadastrarProduto({ authorization, quantidade })

    const { body } = await request.post(rotaCarrinhos).set('authorization', authorization).send({
      produtos: [{
        idProduto,
        quantidade
      },
      {
        idProduto,
        quantidade
      }]
    }).expect(400)

    chai.assert.deepEqual(body, {
      message: 'Não é permitido possuir produto duplicado',
      idProdutosDuplicados: [
        idProduto
      ]
    })
  })

  it('Não é permitido ter mais de 1 carrinho', async () => {
    const authorization = authorizationAdministrador
    const quantidade = faker.datatype.number()
    const { _id: idProduto } = await utils.cadastrarProduto({ authorization, quantidade })

    await request.post(rotaCarrinhos).set('authorization', authorization).send({
      produtos: [{
        idProduto,
        quantidade
      }]
    }).expect(201)
    const { body } = await request.post(rotaCarrinhos).set('authorization', authorization).send({
      produtos: [{
        idProduto,
        quantidade
      }]
    }).expect(400)

    chai.assert.deepEqual(body, { message: 'Não é permitido ter mais de 1 carrinho' })
  })

  it('Produto não encontrado', async () => {
    const authorization = authorizationAdministrador
    const produtoInexistente = {
      idProduto: 'asdasd',
      quantidade: 2
    }
    const { _id: idProduto } = await utils.cadastrarProduto({ authorization })
    const { body } = await request.post(rotaCarrinhos).set('authorization', authorization).send({
      produtos: [{
        idProduto,
        quantidade: 1
      }, {
        idProduto: produtoInexistente.idProduto,
        quantidade: produtoInexistente.quantidade
      }]
    }).expect(400)

    chai.assert.deepEqual(body, {
      message: 'Produto não encontrado',
      item: {
        index: 1,
        idProduto: produtoInexistente.idProduto,
        quantidade: produtoInexistente.quantidade
      }
    })
  })

  it('Produto sem quantidade suficiente', async () => {
    const authorization = authorizationAdministrador
    const quantidade = faker.datatype.number()
    const { _id: idProduto } = await utils.cadastrarProduto({ authorization, quantidade })
    const { body } = await request.post(rotaCarrinhos).set('authorization', authorization).send({
      produtos: [{
        idProduto,
        quantidade: quantidade + 1
      }]
    }).expect(400)

    chai.assert.deepEqual(body, {
      message: 'Produto não possui quantidade suficiente',
      item: {
        index: 0,
        idProduto,
        quantidade: quantidade + 1,
        quantidadeEstoque: quantidade
      }
    })
  })

  it('Token inválido', async () => {
    const { body } = await request.post(rotaCarrinhos).set('authorization', 'asdasd').send({
      produtos: [{
        idProduto: 'a',
        quantidade: 1
      }]
    }).expect(401)

    chai.assert.deepEqual(body, {
      message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
    })
  })

  it('Bad request - Chave inválida', async () => {
    const { body } = await request
      .post(rotaCarrinhos)
      .send({ inexistente: 'teste' })
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {

      produtos: 'produtos é obrigatório',
      inexistente: 'inexistente não é permitido'
    })
  })

  it('Bad request - Array produtos em branco', async () => {
    const { body } = await request
      .post(rotaCarrinhos)
      .send({ produtos: [{}] })
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      'produtos[0].idProduto': 'produtos[0].idProduto é obrigatório',
      'produtos[0].quantidade': 'produtos[0].quantidade é obrigatório',
      produtos: 'produtos não contém 1 valor obrigatório'
    })
  })

  it('Bad request - produtos deve ser array', async () => {
    const { body } = await request
      .post(rotaCarrinhos)
      .send({ produtos: {} })
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      produtos: 'produtos deve ser um array'
    })
  })

  it('Bad request - idProduto deve ser string e quantidade deve ser número', async () => {
    const { body } = await request
      .post(rotaCarrinhos)
      .send({
        produtos: [{
          idProduto: 0,
          quantidade: 'a'
        }]
      })
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      produtos: 'produtos não contém 1 valor obrigatório',
      'produtos[0].idProduto': 'produtos[0].idProduto deve ser uma string',
      'produtos[0].quantidade': 'produtos[0].quantidade deve ser um número'
    })
  })

  it('Bad request - quantidade deve ser inteiro', async () => {
    const { body } = await request
      .post(rotaCarrinhos)
      .send({
        produtos: [{
          idProduto: 'basdasd',
          quantidade: -1.1
        }]
      })
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      produtos: 'produtos não contém 1 valor obrigatório',
      'produtos[0].quantidade': 'produtos[0].quantidade deve ser um inteiro'
    })
  })

  it('Bad request - quantidade deve ser um número positivo', async () => {
    const { body } = await request
      .post(rotaCarrinhos)
      .send({
        produtos: [{
          idProduto: 'asdasd',
          quantidade: 0
        }]
      })
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      produtos: 'produtos não contém 1 valor obrigatório',
      'produtos[0].quantidade': 'produtos[0].quantidade deve ser um número positivo'
    })
  })

  it('Bad request - deve ser um objeto', async () => {
    const { body } = await request
      .post(rotaCarrinhos)
      .send([null])
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      value: 'value deve ser um objeto'
    })
  })
})
