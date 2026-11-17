const chai = require('chai')
const { faker } = require('@faker-js/faker')

const rotaProdutos = '/produtos'
const utils = require('../utils')

describe(rotaProdutos + ' ORDEM DA LISTA', () => {
  let authorization
  beforeEach(async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    authorization = (await utils.login(email, password)).authorization
  })

  it('Produto cadastrado por último vem primeiro', async () => {
    const descricao = faker.string.alphanumeric(24)
    const primeiro = await utils.cadastrarProduto({ descricao, authorization })
    const segundo = await utils.cadastrarProduto({ descricao, authorization })

    const { body } = await request.get(rotaProdutos).query({ descricao }).expect(200)

    chai.assert.deepEqual(body, { quantidade: 2, produtos: [segundo, primeiro] })
  })

  it('Produto alterado volta para o topo', async () => {
    const descricao = faker.string.alphanumeric(24)
    const primeiro = await utils.cadastrarProduto({ descricao, authorization })
    const segundo = await utils.cadastrarProduto({ descricao, authorization })
    const { _id, ...dados } = primeiro
    const alterado = { ...dados, preco: primeiro.preco + 1 }

    await request.put(`${rotaProdutos}/${_id}`).set('authorization', authorization).send(alterado).expect(200)
    const { body } = await request.get(rotaProdutos).query({ descricao }).expect(200)

    chai.assert.deepEqual(body, { quantidade: 2, produtos: [{ ...alterado, _id }, segundo] })
  })

  it('Produto que entra num carrinho volta para o topo, pois o estoque mudou', async () => {
    const descricao = faker.string.alphanumeric(24)
    const primeiro = await utils.cadastrarProduto({ descricao, quantidade: 10, authorization })
    const segundo = await utils.cadastrarProduto({ descricao, authorization })

    await utils.cadastrarCarrinho({ idProduto: primeiro._id, quantidade: 1, authorization })
    const { body } = await request.get(rotaProdutos).query({ descricao }).expect(200)

    chai.assert.deepEqual(body, { quantidade: 2, produtos: [{ ...primeiro, quantidade: 9 }, segundo] })
  })

  it('Produto cadastrado vem antes dos produtos da semente, que ficam na ordem do _id - @skipE2E', async () => {
    const produto = await utils.cadastrarProduto({ authorization })

    const { body } = await request.get(rotaProdutos).expect(200)
    const ids = body.produtos.map(({ _id }) => _id)

    chai.assert.isBelow(ids.indexOf(produto._id), ids.indexOf('BeeJh5lz3k6kSIzA'))
    chai.assert.deepEqual(ids.slice(-2), ['BeeJh5lz3k6kSIzA', 'K6leHdftCeOJj8BJ'])
  })

  it('Lista e busca por id não mostram o campo interno de ordenação', async () => {
    const produto = await utils.cadastrarProduto({ authorization })

    const { body: lista } = await request.get(rotaProdutos).query({ _id: produto._id }).expect(200)
    const { body: porId } = await request.get(`${rotaProdutos}/${produto._id}`).expect(200)

    chai.assert.deepEqual(lista.produtos, [produto])
    chai.assert.deepEqual(porId, produto)
    chai.assert.notProperty(porId, 'alteradoEm')
  })
})
