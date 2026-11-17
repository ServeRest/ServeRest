const chai = require('chai')
const sandbox = require('sinon').createSandbox()

const { doMaisNovoAoMaisAntigo, marcarAlteracao, semMarca } = require('../../src/utils/ordemDeAlteracao')

describe('ordemDeAlteracao', () => {
  afterEach(() => sandbox.restore())

  it('marcarAlteracao - duas gravações no mesmo milissegundo continuam em ordem crescente', () => {
    sandbox.stub(Date, 'now').returns(1)
    const primeira = marcarAlteracao()
    const segunda = marcarAlteracao()

    chai.assert.equal(segunda, primeira + 1)
  })

  it('doMaisNovoAoMaisAntigo - mais novo primeiro, semente no fim na ordem do _id, sem o campo interno', () => {
    const documentos = [
      { _id: 'semente-b' },
      { _id: 'antigo', alteradoEm: 10 },
      { _id: 'semente-a' },
      { _id: 'novo', alteradoEm: 20 }
    ]

    chai.assert.deepEqual(doMaisNovoAoMaisAntigo(documentos), [
      { _id: 'novo' },
      { _id: 'antigo' },
      { _id: 'semente-a' },
      { _id: 'semente-b' }
    ])
  })

  it('semMarca - tira o campo interno e devolve nulo quando não há documento', () => {
    chai.assert.deepEqual(semMarca({ _id: 'a', alteradoEm: 1 }), { _id: 'a' })
    chai.assert.isNull(semMarca(null))
  })
})
