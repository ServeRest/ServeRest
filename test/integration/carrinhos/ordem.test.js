const chai = require('chai')
const { faker } = require('@faker-js/faker')

const rotaCarrinhos = '/carrinhos'
const utils = require('../utils')

async function cadastrarCarrinhoDeOutroUsuario (idProduto) {
  const { email, password, _id: idUsuario } = await utils.cadastrarUsuario()
  const { authorization } = await utils.login(email, password)
  const { _id } = await utils.cadastrarCarrinho({ idProduto, authorization })
  return { _id, idUsuario }
}

describe(rotaCarrinhos + ' ORDEM DA LISTA', () => {
  let authorization
  beforeEach(async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    authorization = (await utils.login(email, password)).authorization
  })

  it('Carrinho cadastrado por último vem primeiro', async () => {
    const preco = faker.number.int({ min: 1000000, max: 999999999 })
    const { _id: idProduto } = await utils.cadastrarProduto({ preco, quantidade: 10, authorization })
    const primeiro = await cadastrarCarrinhoDeOutroUsuario(idProduto)
    const segundo = await cadastrarCarrinhoDeOutroUsuario(idProduto)
    const carrinho = ({ _id, idUsuario }) => ({
      produtos: [{ idProduto, quantidade: 1, precoUnitario: preco }],
      precoTotal: preco,
      quantidadeTotal: 1,
      idUsuario,
      _id
    })

    const { body } = await request.get(rotaCarrinhos).query({ precoTotal: preco }).expect(200)

    chai.assert.deepEqual(body, { quantidade: 2, carrinhos: [carrinho(segundo), carrinho(primeiro)] })
  })

  it('Carrinho cadastrado vem antes do carrinho da semente - @skipE2E', async () => {
    const { _id: idProduto } = await utils.cadastrarProduto({ authorization })
    const { _id } = await cadastrarCarrinhoDeOutroUsuario(idProduto)

    const { body } = await request.get(rotaCarrinhos).expect(200)
    const ids = body.carrinhos.map(({ _id }) => _id)

    chai.assert.isBelow(ids.indexOf(_id), ids.indexOf('qbMqntef4iTOwWfg'))
    chai.assert.equal(ids[ids.length - 1], 'qbMqntef4iTOwWfg')
  })

  it('Lista e busca por id não mostram o campo interno de ordenação, nem nos produtos', async () => {
    const { _id: idProduto } = await utils.cadastrarProduto({ authorization })
    const { _id } = await cadastrarCarrinhoDeOutroUsuario(idProduto)

    const { body: lista } = await request.get(rotaCarrinhos).query({ _id }).expect(200)
    const { body: porId } = await request.get(`${rotaCarrinhos}/${_id}`).expect(200)

    chai.assert.deepEqual(lista.carrinhos, [porId])
    chai.assert.notProperty(porId, 'alteradoEm')
    chai.assert.notProperty(porId.produtos[0], 'alteradoEm')
    chai.assert.hasAllKeys(porId, ['produtos', 'precoTotal', 'quantidadeTotal', 'idUsuario', '_id'])
  })
})
