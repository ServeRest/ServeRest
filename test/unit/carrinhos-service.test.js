const chai = require('chai')
const sandbox = require('sinon').createSandbox()

const service = require('../../src/services/carrinhos-service')
const produtosService = require('../../src/services/produtos-service')

describe('carrinhosService', () => {
  afterEach(() => sandbox.restore())

  it('precoTotal - Deve retornar o preço corretamente de acordo com a quantidade de produtos e preço unitário', () => {
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

    const precoTotal = service.precoTotal(produtos)

    chai.assert.equal(precoTotal, 132)
  })

  it('quantidadeTotal - Deve retornar a quantidade total de acordo com a quantidade de cada produto, sem mexer no estoque', () => {
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

    sandbox.stub(produtosService, 'updateQuantidadePorLote').returns({})

    const quantidadeTotal = service.quantidadeTotal(produtos)

    chai.assert.equal(quantidadeTotal, 119)
    sandbox.assert.notCalled(produtosService.updateQuantidadePorLote)
  })

  it('baixarEstoque - Deve baixar o estoque de todos os produtos numa chamada só', async () => {
    const produtos = [{ idProduto: 'A', quantidade: 1 }, { idProduto: 'B', quantidade: 2 }]
    sandbox.stub(produtosService, 'updateQuantidadePorLote').resolves()

    await service.baixarEstoque(produtos)

    sandbox.assert.calledOnceWithExactly(produtosService.updateQuantidadePorLote, produtos)
  })

  it('extrairProdutosDuplicados - Deve retornar o produto repetido mesmo quando os repetidos não são vizinhos', () => {
    const produtos = [{ idProduto: 'A' }, { idProduto: 'B' }, { idProduto: 'A' }]

    chai.assert.deepEqual(service.extrairProdutosDuplicados(produtos), ['A'])
  })

  it('extrairProdutosDuplicados - Deve retornar o produto repetido quando os repetidos são vizinhos', () => {
    const produtos = [{ idProduto: 'A' }, { idProduto: 'A' }, { idProduto: 'B' }]

    chai.assert.deepEqual(service.extrairProdutosDuplicados(produtos), ['A'])
  })

  it('extrairProdutosDuplicados - Deve retornar uma única vez o produto que aparece três vezes', () => {
    const produtos = [{ idProduto: 'A' }, { idProduto: 'B' }, { idProduto: 'A' }, { idProduto: 'A' }]

    chai.assert.deepEqual(service.extrairProdutosDuplicados(produtos), ['A'])
  })

  it('totaisSaoSeguros - Deve aceitar precoTotal e quantidadeTotal até Number.MAX_SAFE_INTEGER', () => {
    chai.assert.isTrue(service.totaisSaoSeguros(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER))
  })

  it('totaisSaoSeguros - Deve recusar precoTotal acima de Number.MAX_SAFE_INTEGER', () => {
    chai.assert.isFalse(service.totaisSaoSeguros(service.precoTotal([{ precoUnitario: Number.MAX_SAFE_INTEGER, quantidade: 2 }]), 2))
  })

  it('totaisSaoSeguros - Deve recusar quantidadeTotal acima de Number.MAX_SAFE_INTEGER', () => {
    const quantidadeTotal = service.quantidadeTotal([{ quantidade: Number.MAX_SAFE_INTEGER }, { quantidade: 1 }])

    chai.assert.isFalse(service.totaisSaoSeguros(10, quantidadeTotal))
  })

  it('extrairProdutosDuplicados - Deve retornar lista vazia quando não há produto repetido', () => {
    const produtos = [{ idProduto: 'A' }, { idProduto: 'B' }, { idProduto: 'C' }]

    chai.assert.deepEqual(service.extrairProdutosDuplicados(produtos), [])
  })
})
