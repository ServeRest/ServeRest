const chai = require('chai')
const sinon = require('sinon')
const sandbox = sinon.createSandbox()

const carrinhosService = require('../../../src/services/carrinhos-service.js')
const { version } = require('../../../package.json')

describe('Error handler', () => {
  const fixedDate = 1694600359846
  const timestampToleranceInMillis = 50
  beforeEach(() => sandbox.useFakeTimers({ now: fixedDate, shouldAdvanceTime: true }))

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
      time: sinon.match((value) => {
        const loggedAt = Date.parse(value)
        return Math.abs(loggedAt - fixedDate) <= timestampToleranceInMillis
      }, 'time within tolerance'),
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

  it('Deve informar para abrir issue ao ocorrer erro 500 com o tipo de erro ao ter "error.type" e não for erro de schema - @skipE2E', async () => {
    const consoleLogStub = sandbox.stub(console, 'log')
    sandbox.stub(carrinhosService, 'getAll').throws({ type: 'test' })

    const { body } = await request.get('/carrinhos').expect(500)

    chai.assert.deepEqual(body, {
      message: 'Abra uma issue informando essa resposta. https://github.com/ServeRest/ServeRest/issues',
      error: 'test',
      version
    })

    sinon.assert.calledOnce(consoleLogStub)
    sinon.assert.calledWith(consoleLogStub, sinon.match({
      time: sinon.match((value) => {
        const loggedAt = Date.parse(value)
        return Math.abs(loggedAt - fixedDate) <= timestampToleranceInMillis
      }, 'time within tolerance'),
      level: 'error',
      message: 'Error: test, Stack: No stack available, Request body: {}'
    }))
  })

  it('Deve informar para abrir issue ao ocorrer erro 500 com toda a mensagem de erro ao não ter "error.type" - @skipE2E', async () => {
    const consoleLogStub = sandbox.stub(console, 'log')
    sandbox.stub(carrinhosService, 'getAll').throws({ message: 'Teste de erro 500', stack: '.src/stack' })

    const { body } = await request.get('/carrinhos').expect(500)

    chai.assert.deepEqual(body, {
      message: 'Abra uma issue informando essa resposta. https://github.com/ServeRest/ServeRest/issues',
      error: { message: 'Teste de erro 500', stack: '.src/stack' },
      version
    })

    sinon.assert.calledOnce(consoleLogStub)
    sinon.assert.calledWith(consoleLogStub, sinon.match({
      time: sinon.match((value) => {
        const loggedAt = Date.parse(value)
        return Math.abs(loggedAt - fixedDate) <= timestampToleranceInMillis
      }, 'time within tolerance'),
      level: 'error',
      message: 'Error: {"message":"Teste de erro 500","stack":".src/stack"}, Stack: .src/stack, Request body: {}'
    }))
  })

  it('Deve informar para abrir issue ao retornar erro de schema que ainda não foi mapeado" - @skipE2E', async () => {
    sandbox.stub(carrinhosService, 'getAll').throws({
      name: 'ValidationError',
      details: {
        body: [{
          context: {
            label: 'preco'
          },
          type: 'something.test', // Tipo de erro não mapeado
          message: 'some message'
        },
        {
          context: {
            label: 'descricao'
          },
          type: 'string.base', // Tipo de erro mapeado
          message: 'other'
        }]
      }
    })

    const { body } = await request.get('/carrinhos').expect(400)

    chai.assert.deepEqual(body, {
      preco: 'some message - Erro something.test - Abra uma issue informando essa resposta. https://github.com/ServeRest/ServeRest/issues',
      descricao: 'descricao deve ser uma string'
    })
  })

  it('should return 400 for malformed URL parameters - @skipE2E', async () => {
    const consoleLogStub = sandbox.stub(console, 'log')

    const { body, status } = await request.get('/usuarios/%%C2%A8%&74745754jfhjfbmurt745gfj6jfjrg')

    chai.expect(status).to.equal(400)
    chai.expect(body.message).to.include('Parâmetro de URL inválido')

    sinon.assert.calledOnce(consoleLogStub)
    sinon.assert.calledWith(consoleLogStub, sinon.match({
      time: sinon.match((value) => {
        const loggedAt = Date.parse(value)
        return Math.abs(loggedAt - fixedDate) <= timestampToleranceInMillis
      }, 'time within tolerance'),
      level: 'alert',
      message: sinon.match(/URI decode error: Failed to decode param '%%C2%A8%&74745754jfhjfbmurt745gfj6jfjrg'/)
    }))
  })
})
