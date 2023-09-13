const chai = require('chai')
const sinon = require('sinon')
const sandbox = sinon.createSandbox()

const carrinhosService = require('../../../src/services/carrinhos-service.js')

describe('Error handler', () => {
  const fixedDate = 1694600359846
  beforeEach(() => sandbox.useFakeTimers({ now: fixedDate }))

  afterEach(() => sandbox.restore())

  it('Deve retornar erro informando sobre formatação quando encontrar erro "entity.parse.failed" - @skipE2E', async () => {
    const consoleLogStub = sandbox.stub(console, 'log')
    sandbox.stub(carrinhosService, 'getAll').throws({ type: 'entity.parse.failed' })

    const { body } = await request.get('/carrinhos').expect(400)

    chai.assert.deepEqual(body, {
      message: 'Adicione aspas em todos os valores. Para mais informações acesse a issue https://github.com/ServeRest/ServeRest/issues/225'
    })
    sinon.assert.calledOnce(consoleLogStub)
    sinon.assert.calledWith(consoleLogStub, sinon.match({
      time: new Date(fixedDate).toISOString(),
      level: 'alert',
      message: 'Entity parse error, user sending request without proper quotation marks.'
    }))
  })

  it('Deve retornar erro "Payload too large" quando encontrar erro "entity.too.large" - @skipE2E', async () => {
    sandbox.stub(carrinhosService, 'getAll').throws({ type: 'entity.too.large' })

    const { body } = await request.get('/carrinhos').expect(413)

    chai.assert.deepEqual(body, {
      message: 'Payload too large'
    })
  })

  it('Deve retornar erro "Unsupported charset" e o tipo de charset quando encontrar erro "charset.unsupported" - @skipE2E', async () => {
    sandbox.stub(carrinhosService, 'getAll').throws({ type: 'charset.unsupported', charset: 'ISO-8859-1' })

    const { body } = await request.get('/carrinhos').expect(415)

    chai.assert.deepEqual(body, {
      message: 'Unsupported charset',
      charset: 'ISO-8859-1'
    })
  })

  it('Deve informar para abrir issue ao ocorrer erro 500 com o tipo de erro ao ter "error.type" - @skipE2E', async () => {
    const consoleLogStub = sandbox.stub(console, 'log')
    sandbox.stub(carrinhosService, 'getAll').throws({ type: 'test' })

    const { body } = await request.get('/carrinhos').expect(500)

    chai.assert.deepEqual(body, {
      message: 'Abra uma issue informando essa resposta. https://github.com/ServeRest/ServeRest/issues',
      error: 'test'
    })

    sinon.assert.calledOnce(consoleLogStub)
    sinon.assert.calledWith(consoleLogStub, sinon.match({
      time: new Date(fixedDate).toISOString(),
      level: 'error',
      message: 'test'
    }))
  })

  it('Deve informar para abrir issue ao ocorrer erro 500 com toda a mensagem de erro ao não ter "error.type" - @skipE2E', async () => {
    const consoleLogStub = sandbox.stub(console, 'log')
    sandbox.stub(carrinhosService, 'getAll').throws('Teste de erro 500')

    const { body } = await request.get('/carrinhos').expect(500)

    chai.assert.deepEqual(body, {
      message: 'Abra uma issue informando essa resposta. https://github.com/ServeRest/ServeRest/issues',
      error: { name: 'Teste de erro 500' }
    })

    sinon.assert.calledOnce(consoleLogStub)
    sinon.assert.calledWith(consoleLogStub, sinon.match({
      time: new Date(fixedDate).toISOString(),
      level: 'error',
      message: { name: 'Teste de erro 500' }
    }))
  })
})
