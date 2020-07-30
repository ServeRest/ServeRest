const chai = require('chai')

const rotaCarrinhos = '/carrinhos'
const utils = require('../utils')

describe(rotaCarrinhos + ' GET', () => {
  let usuarioAdministrador
  beforeEach(async () => {
    const { email, password, _id: idUsuario } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    usuarioAdministrador = {
      authorization,
      idUsuario
    }
  })

  it('Query string - Busca por todos as chaves', async () => {
    const { authorization, idUsuario } = usuarioAdministrador
    const { _id: idProduto, preco } = await utils.cadastrarProduto({ authorization })
    const { _id: idCarrinho, quantidade } = await utils.cadastrarCarrinho({ idProduto, authorization })

    const { body } = await request.get(rotaCarrinhos).query({
      precoTotal: preco,
      quantidadeTotal: quantidade,
      idUsuario,
      _id: idCarrinho
    })

    chai.assert.deepEqual(body, {
      quantidade: 1,
      carrinhos: [{
        produtos: [{
          idProduto,
          quantidade,
          precoUnitario: preco
        }],
        precoTotal: preco,
        quantidadeTotal: quantidade,
        idUsuario,
        _id: idCarrinho
      }]
    })
  })

  it('Query string - Nenhum produto encontrado', async () => {
    const { body } = await request.get(rotaCarrinhos).query({ _id: 'a' }).expect(200)
    chai.assert.deepEqual(body, { quantidade: 0, carrinhos: [] })
  })

  it('Query string - Chave inexistente', async () => {
    const { body } = await request.get(rotaCarrinhos).query({ inexistente: 'a' }).expect(400)

    chai.assert.deepEqual(body, {
      inexistente: 'inexistente não é permitido'
    })
  })

  it('Query string - preco e quantidade devem ser número', async () => {
    const { body } = await request.get(rotaCarrinhos).query({ precoTotal: 'a', quantidadeTotal: 'a' }).expect(400)

    chai.assert.deepEqual(body, {
      precoTotal: 'precoTotal deve ser um número',
      quantidadeTotal: 'quantidadeTotal deve ser um número'
    })
  })

  it('Query string - preco e quantidade devem ser número positivo', async () => {
    const { body } = await request.get(rotaCarrinhos).query({ precoTotal: 0, quantidadeTotal: 0 }).expect(400)

    chai.assert.deepEqual(body, {
      precoTotal: 'precoTotal deve ser um número positivo',
      quantidadeTotal: 'quantidadeTotal deve ser um número positivo'
    })
  })

  it('Query string - preco e quantidade devem ser inteiro', async () => {
    const { body } = await request.get(rotaCarrinhos).query({ precoTotal: 0.1, quantidadeTotal: 0.1 }).expect(400)

    chai.assert.deepEqual(body, {
      precoTotal: 'precoTotal deve ser um inteiro',
      quantidadeTotal: 'quantidadeTotal deve ser um inteiro'
    })
  })
})
