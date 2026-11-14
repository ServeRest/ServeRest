const chai = require('chai')

const rotaProdutos = '/produtos'
const utils = require('../utils')

describe(rotaProdutos + ' PUT', () => {
  let authorizationAdministrador
  beforeEach(async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    authorizationAdministrador = authorization
  })

  it('Registro alterado', async () => {
    const produto = utils.dadosProduto()

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
    const { body } = await request.put(rotaProdutos + '/zl1aduaaabaaafiF').send(utils.dadosProduto())
      .set('authorization', authorizationAdministrador)
      .expect(201)

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
      .put(`${rotaProdutos}/zl1aduaacaaaafiF`)
      .send(produto)
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, { message: 'Já existe produto com esse nome' })
  })

  it('Token inválido', async () => {
    const { body } = await request
      .put(`${rotaProdutos}/a`)
      .send(utils.dadosProduto())
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
      .put(`${rotaProdutos}/a`)
      .send(utils.dadosProduto())
      .set('authorization', authorization)
      .expect(403)

    chai.assert.deepEqual(body, {
      message: 'Rota exclusiva para administradores'
    })
  })

  it('Bad request - preco como string numérica não é aceito', async () => {
    const { _id } = await utils.cadastrarProduto({ authorization: authorizationAdministrador })

    const { body } = await request
      .put(`${rotaProdutos}/${_id}`)
      .send({ ...utils.dadosProduto(), preco: '470' })
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      preco: 'preco deve ser um número'
    })
  })

  // O serviço tira os espaços em volta de nome e imagem antes de gravar; só espaços viraria "".
  describe('Texto só com espaços', () => {
    it('Bad request - nome só com espaços não é aceito', async () => {
      const { _id } = await utils.cadastrarProduto({ authorization: authorizationAdministrador })

      const { body } = await request
        .put(`${rotaProdutos}/${_id}`)
        .send({ ...utils.dadosProduto(), nome: '   ' })
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        nome: 'nome não pode ficar em branco'
      })
    })

    it('Bad request - imagem só com espaços não é aceita', async () => {
      const { _id } = await utils.cadastrarProduto({ authorization: authorizationAdministrador })

      const { body } = await request
        .put(`${rotaProdutos}/${_id}`)
        .send({ ...utils.dadosProduto(), imagem: '   ' })
        .set('authorization', authorizationAdministrador)
        .expect(400)

      chai.assert.deepEqual(body, {
        imagem: 'imagem não pode ficar em branco'
      })
    })

    it('Nome e imagem com espaços em volta do texto são aceitos e gravados sem esses espaços', async () => {
      const { _id } = await utils.cadastrarProduto({ authorization: authorizationAdministrador })
      const produto = utils.dadosProduto()

      const { body } = await request
        .put(`${rotaProdutos}/${_id}`)
        .send({ ...produto, nome: `  ${produto.nome}  `, imagem: `  ${produto.imagem}  ` })
        .set('authorization', authorizationAdministrador)
        .expect(200)

      chai.assert.deepEqual(body, { message: 'Registro alterado com sucesso' })
      const { body: produtoGravado } = await request.get(`${rotaProdutos}/${_id}`).expect(200)
      chai.assert.deepEqual(produtoGravado, { ...produto, _id })
    })
  })

  it('Bad request', async () => {
    const { body } = await request
      .put(rotaProdutos + '/a')
      .send({ inexistente: '1' })
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
})
