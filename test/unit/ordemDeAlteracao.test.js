const chai = require('chai')
const sandbox = require('sinon').createSandbox()

const Datastore = require('nedb-promises')

const logger = require('../../src/utils/logger')
const { doMaisNovoAoMaisAntigo, semMarca } = require('../../src/utils/ordemDeAlteracao')

// Cópia nova do módulo: o contador alterado no teste não vaza para os outros testes nem para os serviços.
function carregarIsolado () {
  const caminho = require.resolve('../../src/utils/ordemDeAlteracao')
  const original = require.cache[caminho]
  delete require.cache[caminho]
  const isolado = require(caminho)
  require.cache[caminho] = original
  return isolado
}

// O que o cliente recebe: o JSON da resposta.
const comoResposta = documento => JSON.parse(JSON.stringify(documento))

describe('ordemDeAlteracao', () => {
  afterEach(() => sandbox.restore())

  it('marcarAlteracao - duas gravações no mesmo milissegundo continuam em ordem crescente', () => {
    const { marcarAlteracao } = carregarIsolado()
    sandbox.stub(Date, 'now').returns(1)
    const primeira = marcarAlteracao()
    const segunda = marcarAlteracao()

    chai.assert.equal(segunda, primeira + 1)
  })

  it('doMaisNovoAoMaisAntigo - mais novo primeiro, semente no fim na ordem nativa do _id, sem o campo interno', () => {
    const documentos = [
      { _id: 'semente-b' },
      { _id: 'antigo', alteradoEm: 10 },
      { _id: 'semente-a' },
      { _id: 'semente-C' },
      { _id: 'novo', alteradoEm: 20 }
    ]

    chai.assert.deepEqual(comoResposta(doMaisNovoAoMaisAntigo(documentos)), [
      { _id: 'novo' },
      { _id: 'antigo' },
      { _id: 'semente-C' },
      { _id: 'semente-a' },
      { _id: 'semente-b' }
    ])
  })

  it('continuarDaMaiorMarca - a próxima marca fica acima da maior já gravada, mesmo com o relógio atrás', async () => {
    const { continuarDaMaiorMarca, marcarAlteracao } = carregarIsolado()
    const maiorGravada = Date.now() + 3600000
    const datastore = Datastore.create()
    await datastore.insert([{ nome: 'semente' }, { nome: 'antigo', alteradoEm: 10 }, { nome: 'novo', alteradoEm: maiorGravada }])

    await continuarDaMaiorMarca(datastore)

    chai.assert.isAbove(marcarAlteracao(), maiorGravada)
  })

  it('continuarDaMaiorMarca - leitura que falha é registrada e o contador segue do relógio', async () => {
    const { continuarDaMaiorMarca, marcarAlteracao } = carregarIsolado()
    const log = sandbox.stub(logger, 'log')
    const datastore = { find: () => Promise.reject(new Error('arquivo ilegível')) }

    await continuarDaMaiorMarca(datastore)

    sandbox.assert.calledOnce(log)
    chai.assert.include(log.firstCall.args[0].message, 'arquivo ilegível')
    chai.assert.isAtLeast(marcarAlteracao(), Date.now() - 1000)
  })

  it('semMarca - tira o campo interno e devolve nulo quando não há documento', () => {
    chai.assert.deepEqual(comoResposta(semMarca({ _id: 'a', alteradoEm: 1 })), { _id: 'a' })
    chai.assert.isNull(semMarca(null))
  })
})
