const chai = require('chai')
const express = require('express')
const sinon = require('sinon')
const supertest = require('supertest')
const timeout = require('connect-timeout')

const errorHandler = require('../../../src/middlewares/error-handler')
const pararSeExpirou = require('../../../src/middlewares/parar-se-expirou')

// Reproduz o ERR_HTTP_HEADERS_SENT de 2026-11-07 com a mesma ordem do app.js e um timeout de 50 ms no lugar de
// 5 s: um passo lento termina depois do 408 e chama next(); sem a parada, a requisição chegava ao 405.
describe('Timeout da requisição - @skipE2E', () => {
  const sandbox = sinon.createSandbox()
  afterEach(() => sandbox.restore())

  const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))

  function montarApp () {
    const final = sinon.spy((req, res) => res.status(405).send({ message: 'sem rota' }))
    const app = express()
    app.use(timeout('50ms'))
    app.use((req, res, next) => setTimeout(next, req.query.lento ? 120 : 0))
    app.use(errorHandler)
    app.use(pararSeExpirou)
    app.use(final)
    return { app, final }
  }

  it('Deve responder só o 408 quando um passo comum termina depois do timeout', async () => {
    sandbox.stub(console, 'log')
    const { app, final } = montarApp()

    const { body } = await supertest(app).get('/qualquer?lento=1').expect(408)
    await esperar(150)

    chai.assert.match(body.message, /timeout/i)
    chai.assert.isFalse(final.called, 'a requisição expirada não pode chegar ao 405')
  })

  it('Deve seguir normalmente quando a requisição não expirou', async () => {
    const { app, final } = montarApp()

    await supertest(app).get('/qualquer').expect(405)

    chai.assert.isTrue(final.calledOnce)
  })
})
