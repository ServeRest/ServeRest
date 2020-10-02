const chai = require('chai')

const rotaProdutos = '/produtos'
const utils = require('../utils')

describe(rotaProdutos + ' POST', () => {
  let authorizationAdministrador
  beforeEach(async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    authorizationAdministrador = authorization
  })

  it('Cadastro com sucesso', async () => {
    const { body } = await request.post(rotaProdutos).send(utils.dadosProduto()).set('authorization', authorizationAdministrador).expect(201)

    chai.assert.deepEqual(body, { message: 'Cadastro realizado com sucesso', _id: body._id })
  })

  it('Cadastro sem imagem do produto com sucesso', async () => {
    const produto = utils.dadosProduto()
    delete produto.imagem

    const { body } = await request.post(rotaProdutos).send(produto).set('authorization', authorizationAdministrador).expect(201)

    chai.assert.deepEqual(body, { message: 'Cadastro realizado com sucesso', _id: body._id })
  })

  it('Nome já utilizado', async () => {
    const produto = utils.dadosProduto()

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
    const { body } = await request.post(rotaProdutos).send(utils.dadosProduto()).set('authorization', 'a').expect(401)

    chai.assert.deepEqual(body, {
      message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
    })
  })

  it('Rota para administradores', async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'false' })
    const { authorization } = await utils.login(email, password)
    const { body } = await request.post(rotaProdutos).send(utils.dadosProduto()).set('authorization', authorization).expect(403)

    chai.assert.deepEqual(body, {
      message: 'Rota exclusiva para administradores'
    })
  })

  it('Bad request - Campos de preenchimento obrigatório', async () => {
    const { body } = await request
      .post(rotaProdutos)
      .send({ inexistente: 'teste' })
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      nome: 'nome é obrigatório',
      preco: 'preco é obrigatório',
      descricao: 'descricao é obrigatório',
      quantidade: 'quantidade é obrigatório',
      inexistente: 'inexistente não é permitido'
    })
  })

  it('Bad request - quantidade deve ser maior ou igual a 0 - Não deve permitir valor negativo', async () => {
    const { body } = await request
      .post(rotaProdutos)
      .send({ quantidade: -1 })
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      nome: 'nome é obrigatório',
      preco: 'preco é obrigatório',
      descricao: 'descricao é obrigatório',
      quantidade: 'quantidade deve ser maior ou igual a 0'
    })
  })

  it('Bad request - quantidade deve ser maior ou igual a 0 - Deve permitir 0', async () => {
    const { body } = await request
      .post(rotaProdutos)
      .send({ quantidade: 0 })
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      nome: 'nome é obrigatório',
      preco: 'preco é obrigatório',
      descricao: 'descricao é obrigatório'
    })
  })

  it('Bad request - imagem deve ser uma string', async () => {
    let produto = utils.dadosProduto()
    produto = {
      ...produto,
      imagem: 1
    }

    const numberRequest = await request
      .post(rotaProdutos)
      .send(produto)
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(numberRequest.body, {
      imagem: 'imagem deve ser uma string'
    })

    produto = {
      ...produto,
      imagem: null
    }

    const nullRequest = await request
      .post(rotaProdutos)
      .send(produto)
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(nullRequest.body, {
      imagem: 'imagem deve ser uma string'
    })
  })
})
