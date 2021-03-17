const chai = require('chai')

const rotaCarrinhos = '/carrinhos'
const utils = require('../utils')

describe(`${rotaCarrinhos}/:id GET`, () => {
  it('Busca um carrinho por ID', async () => {
    const { email, password, _id: idUsuario } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    const { _id: idProduto, preco } = await utils.cadastrarProduto({ authorization })
    const { _id: idCarrinho, quantidade } = await utils.cadastrarCarrinho({ idProduto, authorization })

    const { body } = await request.get(`${rotaCarrinhos}/${idCarrinho}`).expect(200)

    chai.assert.deepEqual(body, {
      produtos: [
        {
          idProduto,
          quantidade,
          precoUnitario: preco
        }
      ],
      precoTotal: preco,
      quantidadeTotal: quantidade,
      idUsuario,
      _id: idCarrinho
    })
  })

  it('Nenhum carrinho encontrado', async () => {
    const { body } = await request.get(`${rotaCarrinhos}/123`).expect(400)
    chai.assert.deepEqual(body, {
      message: 'Carrinho não encontrado'
    })
  })
})
