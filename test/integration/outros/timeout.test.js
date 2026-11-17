require('express-async-errors')
const chai = require('chai')
const express = require('express')
const sinon = require('sinon')
const supertest = require('supertest')
const timeout = require('connect-timeout')

const app = require('../../../src/app')
const errorHandler = require('../../../src/middlewares/error-handler')
const { pararSeExpirou, descartarErroDepoisDaResposta } = require('../../../src/middlewares/parar-se-expirou')

// Reproduz o ERR_HTTP_HEADERS_SENT de 2026-11-07 com a ordem do app.js e um timeout de 200 ms no lugar de 5 s:
// um passo lento termina depois do 408, e a requisição continua a partir do errorHandler.
describe('Timeout da requisição - @skipE2E', () => {
  const sandbox = sinon.createSandbox()
  afterEach(() => sandbox.restore())

  const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))
  const LENTO = 400

  function montarApp () {
    const final = sinon.spy((req, res) => res.status(405).send({ message: 'sem rota' }))
    const tratadorFinal = sinon.spy((error, req, res, next) => next(error))
    const lab = express()
    lab.use(timeout('200ms'))
    lab.use((req, res, next) => {
      if (req.query.lento === 'next') return setTimeout(next, LENTO)
      if (req.query.lento === 'erro') return setTimeout(() => next(new Error('passo lento falhou')), LENTO)
      next()
    })
    lab.get('/rota-lenta', async (req, res) => {
      await esperar(LENTO)
      res.send({ tarde: true })
    })
    lab.use(errorHandler)
    lab.use(pararSeExpirou)
    lab.use(descartarErroDepoisDaResposta)
    lab.use(final)
    lab.use(tratadorFinal)
    return { lab, final, tratadorFinal }
  }

  async function pedirEsperandoOPassoLento (lab, caminho) {
    const resposta = await supertest(lab).get(caminho)
    await esperar(LENTO)
    return resposta
  }

  it('Deve responder só o 408 quando um passo termina com next() depois do timeout', async () => {
    const { lab, final, tratadorFinal } = montarApp()

    const { status, body } = await pedirEsperandoOPassoLento(lab, '/qualquer?lento=next')

    chai.assert.equal(status, 408)
    chai.assert.match(body.message, /timeout/i)
    chai.assert.isFalse(final.called, 'a requisição expirada não pode chegar ao 405')
    chai.assert.isFalse(tratadorFinal.called)
  })

  it('Deve registrar sem nível de erro o next(erro) que chega depois do 408', async () => {
    const consoleLogStub = sandbox.stub(console, 'log')
    const { lab, tratadorFinal } = montarApp()

    const { status } = await pedirEsperandoOPassoLento(lab, '/qualquer?lento=erro')

    chai.assert.equal(status, 408)
    chai.assert.isFalse(tratadorFinal.called, 'o erro atrasado não pode chegar ao tratador final do Express')
    const registro = consoleLogStub.args.map(([r]) => r).find(r => r?.message?.startsWith('Erro depois da resposta'))
    chai.assert.deepInclude(registro, { level: 'alert', message: 'Erro depois da resposta enviada: passo lento falhou' })
  })

  it('Deve registrar sem nível de erro a rota que tenta responder depois do 408', async () => {
    const consoleLogStub = sandbox.stub(console, 'log')
    const { lab, tratadorFinal } = montarApp()

    const { status } = await pedirEsperandoOPassoLento(lab, '/rota-lenta')

    chai.assert.equal(status, 408)
    chai.assert.isFalse(tratadorFinal.called)
    const mensagens = consoleLogStub.args.map(([r]) => r?.message || '')
    chai.assert.isTrue(mensagens.some(m => m.includes('after they are sent')), mensagens.join(' | '))
  })

  it('Deve seguir normalmente quando a requisição não expirou', async () => {
    const { lab, final } = montarApp()

    await supertest(lab).get('/qualquer').expect(405)

    chai.assert.isTrue(final.calledOnce)
  })

  it('Deve passar adiante o erro de quem ainda não recebeu resposta', () => {
    const next = sinon.spy()
    const erro = new Error('sem resposta')

    descartarErroDepoisDaResposta(erro, {}, { headersSent: false }, next)

    chai.assert.isTrue(next.calledOnceWith(erro))
  })

  it('Deve manter as paradas logo depois do errorHandler no app', () => {
    const nomes = app._router.stack.map(camada => camada.name)
    const posicao = nomes.indexOf('errorHandler')

    chai.assert.deepEqual(nomes.slice(posicao, posicao + 3), ['errorHandler', 'pararSeExpirou', 'descartarErroDepoisDaResposta'])
  })
})
