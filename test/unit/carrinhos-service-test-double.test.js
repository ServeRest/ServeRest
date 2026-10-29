const chai = require('chai')
const sinon = require('sinon')
const sandbox = sinon.createSandbox()

const service = require('../../src/services/carrinhos-service')
const produtosService = require('../../src/services/produtos-service')

describe('carrinhosService - Test Doubles', () => {
  afterEach(() => sandbox.restore())

  it('precoTotal - deve calcular o valor total do carrinho corretamente', async () => {
    const produtos = [
      {
        quantidade: 2,
        precoUnitario: 10
      },
      {
        quantidade: 3,
        precoUnitario: 5
      }
    ]

    const resultado = await service.precoTotal(produtos)

    chai.assert.equal(resultado, 35)
  })

  it('extrairProdutosDuplicados - deve retornar lista vazia quando não existem produtos repetidos', () => {
    const produtos = [
      {
        idProduto: '1'
      },
      {
        idProduto: '2'
      }
    ]

    const resultado = service.extrairProdutosDuplicados(produtos)

    chai.assert.deepEqual(resultado, [])
  })

  it('getProdutosComPrecoUnitarioOuErro - deve retornar erro vindo do serviço de produtos', async () => {
    sandbox.stub(produtosService, 'getPrecosUnitariosPorLote')
      .returns({
        error: {
          item: {
            idProduto: '123'
          },
          index: 0
        }
      })

    const resultado = await service.getProdutosComPrecoUnitarioOuErro([])

    chai.assert.exists(resultado.error)
    chai.assert.equal(resultado.error.index, 0)
  })

  it('quantidadeTotal - deve usar stub para substituir atualização real de estoque', async () => {
    const stub = sandbox
      .stub(produtosService, 'updateQuantidadePorLote')
      .returns({})

    const produtos = [
      {
        idProduto: '1',
        quantidade: 5
      }
    ]

    const resultado = await service.quantidadeTotal(produtos)

    chai.assert.equal(resultado, 5)
    chai.assert.isTrue(stub.calledOnce)
  })

  it('reabasteceEstoque - deve chamar o serviço de reposição usando spy', async () => {
    const spy = sandbox.spy(
      produtosService,
      'restoreQuantidadePorLote'
    )

    await service.reabasteceEstoque([])

    chai.assert.isTrue(spy.calledOnce)
  })
  it('getProdutosComPrecoUnitarioOuErro - deve chamar dependência usando mock', async () => {
    const mock = sandbox.mock(produtosService)

    mock.expects('getPrecosUnitariosPorLote')
      .once()
      .withArgs([])
      .returns({
        produtosComPreco: [],
        error: null
      })

    const resultado = await service.getProdutosComPrecoUnitarioOuErro([])

    chai.assert.deepEqual(resultado.produtosComPrecoUnitario, [])

    mock.verify()
  })
})
