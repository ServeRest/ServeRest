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
      inexistente: 'inexistente não é permitido'
    })
  })

  it('Query string - preco e quantidade devem ser número', async () => {
    const { body } = await request.get(rotaProdutos).query({ preco: 'a', quantidade: 'a' }).expect(400)

    chai.assert.deepEqual(body, {
      preco: 'preco deve ser um número',
      quantidade: 'quantidade deve ser um número'
    })
  })

  it('Query string - preco e quantidade devem ser inteiro', async () => {
    const { body } = await request.get(rotaProdutos).query({ preco: 0.1, quantidade: 0.1 }).expect(400)

    chai.assert.deepEqual(body, {
      preco: 'preco deve ser um inteiro',
      quantidade: 'quantidade deve ser um inteiro'
    })
  })

  it('Query string - preco deve ser positivo e quantidade deve ser maior que 0', async () => {
    const { body } = await request.get(rotaProdutos).query({ preco: 0, quantidade: -1 }).expect(400)

    chai.assert.deepEqual(body, {
      preco: 'preco deve ser um número positivo',
      quantidade: 'quantidade deve ser maior ou igual a 0'
    })
  })
})
