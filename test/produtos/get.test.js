const chai = require('chai')

const rotaProdutos = '/produtos'
const utils = require('../utils')

describe(rotaProdutos + ' GET', () => {
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
