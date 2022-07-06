const chai = require('chai')
const sandbox = require('sinon').createSandbox()

const service = require('../../src/services/carrinhos-service')
const produtosService = require('../../src/services/produtos-service')

describe('carrinhosService', () => {
  afterEach(() => sandbox.restore())

  it('precoTotal - Deve retornar o preço corretamente de acordo com a quantidade de produtos e preço unitário', async () => {
    const produtos = [
      {
        idProduto: '12345678',
        quantidade: 1,
        precoUnitario: 10
      },
      {
        idProduto: '87654321',
        quantidade: 5,
        precoUnitario: 20
      },
      {
        idProduto: 'abc45678',
        quantidade: 11,
        precoUnitario: 2
      }
    ]

    const precoTotal = await service.precoTotal(produtos)

    chai.assert.equal(precoTotal, 132)
  })

  it('quantidadeTotal - Deve retornar a quantidade total corretamente de acordo com a quantidade de cada produto e reduzir o estoque 3 vezes', async () => {
    const produtos = [
      {
        idProduto: '12345678',
        quantidade: 3,
        precoUnitario: 10
      },
      {
        idProduto: '87654321',
        quantidade: 105,
        precoUnitario: 20
      },
      {
        idProduto: 'abc45678',
        quantidade: 11,
        precoUnitario: 2
      }
    ]

    sandbox.stub(produtosService, 'updateQuantidade').returns({})

    const quantidadeTotal = await service.quantidadeTotal(produtos)

    chai.assert.equal(quantidadeTotal, 119)
    sandbox.assert.calledThrice(produtosService.updateQuantidade)
  })
})
