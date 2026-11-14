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

  // O serviço tira os espaços em volta de nome e imagem antes de gravar; só espaços viraria "".
  describe('Texto só com espaços', () => {
    it('Bad request - nome só com espaços não é aceito', async () => {
      const { body } = await request
        .post(rotaProdutos)
        .send({ ...utils.dadosProduto(), nome: '   ' })
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        nome: 'nome não pode ficar em branco'
      })
    })

    it('Bad request - imagem só com espaços não é aceita', async () => {
      const { body } = await request
        .post(rotaProdutos)
        .send({ ...utils.dadosProduto(), imagem: '   ' })
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        imagem: 'imagem não pode ficar em branco'
      })
    })

    it('Nome e imagem com espaços em volta do texto são aceitos e gravados sem esses espaços', async () => {
      const produto = utils.dadosProduto()

      const { body } = await request
        .post(rotaProdutos)
        .send({ ...produto, nome: `  ${produto.nome}  `, imagem: `  ${produto.imagem}  ` })
        .set('authorization', authorizationAdministrador)
        .expect(201)

      const { body: produtoGravado } = await request.get(`${rotaProdutos}/${body._id}`).expect(200)
      chai.assert.deepEqual(produtoGravado, { ...produto, _id: body._id })
    })
  })

  describe('Número enviado como string', () => {
    it('Bad request - preco como string numérica não é aceito', async () => {
      const produto = { ...utils.dadosProduto(), preco: '470' }

      const { body } = await request
        .post(rotaProdutos)
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        preco: 'preco deve ser um número'
      })
    })

    it('Bad request - preco como string em notação científica não é aceito', async () => {
      const produto = { ...utils.dadosProduto(), preco: '4e2' }

      const { body } = await request
        .post(rotaProdutos)
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        preco: 'preco deve ser um número'
      })
    })

    it('Bad request - quantidade como string numérica não é aceita', async () => {
      const produto = { ...utils.dadosProduto(), quantidade: '5' }

      const { body } = await request
        .post(rotaProdutos)
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        quantidade: 'quantidade deve ser um número'
      })
    })

    // O contrato declara só application/json; num formulário todo valor chega como texto.
    it('Bad request - corpo em application/x-www-form-urlencoded não é aceito', async () => {
      const { body } = await request
        .post(rotaProdutos)
        .type('form')
        .send(utils.dadosProduto())
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        preco: 'preco deve ser um número',
        quantidade: 'quantidade deve ser um número'
      })
    })
  })

  describe('Number.MAX_SAFE_INTEGER', () => {
    it('Deve retornar erro 400 ao enviar número inteiro maior que Number.MAX_SAFE_INTEGER', async () => {
      let produto = utils.dadosProduto()
      produto = {
        ...produto,
        preco: Number.MAX_SAFE_INTEGER + 1
      }

      const { body } = await request
        .post('/produtos')
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        preco: `preco não pode ser maior que ${Number.MAX_SAFE_INTEGER}`
      })
    })

    it('Deve cadastrar produto com sucesso ao enviar preco igual a Number.MAX_SAFE_INTEGER', async () => {
      let produto = utils.dadosProduto()
      produto = {
        ...produto,
        preco: Number.MAX_SAFE_INTEGER
      }

      const { body } = await request
        .post('/produtos')
        .send(produto)
        .set('authorization', authorizationAdministrador)
        .expect(201)

      chai.assert.deepEqual(body, {
        message: 'Cadastro realizado com sucesso',
        _id: body._id
      })
    })
  })
})
