const chai = require('chai')
const sandbox = require('sinon').createSandbox()

const carrinhosService = require('../../../src/services/carrinhos-service.js')

describe('Error handler', () => {
  afterEach(() => sandbox.restore())

  it('Deve informar para abrir issue ao ocorrer erro 500 - @skipE2E', async () => {
    sandbox.stub(carrinhosService, 'getAll').throws('Teste de erro 500')

    const { body } = await request.get('/carrinhos').expect(500)

    chai.assert.deepEqual(body, {
      message: 'Abra uma issue informando essa resposta. https://github.com/ServeRest/ServeRest/issues',
      error: { name: 'Teste de erro 500' }
    })
  })
})
