const { expect } = require('chai')
const express = require('express')
const sinon = require('sinon')
const supertest = require('supertest')
const { RateLimiterMemory } = require('rate-limiter-flexible')

const { criarLimitador, criarOrcamentoDeBytes, criarRateLimiter } = require('../../src/middlewares/rate-limiter')
const { DOWNLOAD_LIMIT_EXCEEDED, LOAD_TEST_DETECTED } = require('../../src/utils/constants')

// O middleware fica desligado no localhost e nos testes; aqui o mesmo 429 sai de um app com limites pequenos e
// janelas diferentes em cada limite, para o Retry-After mostrar de qual deles veio. O IP chega pelo
// X-Forwarded-For, como atrás do proxy do Cloud Run.
const IP = '203.0.113.7'
const OUTRO_IP = '198.51.100.20'

function app ({ porIp = 1000, global = 3000, bytes = 1000, janelaPorIp = 30, janelaGlobal = 10, janelaDosBytes = 3600, limites } = {}) {
  const limitador = criarLimitador(limites || {
    global: new RateLimiterMemory({ points: global, duration: janelaGlobal }),
    porIp: new RateLimiterMemory({ points: porIp, duration: janelaPorIp }),
    orcamento: criarOrcamentoDeBytes({ bytes, segundos: janelaDosBytes })
  })
  const servidor = express()
  servidor.set('trust proxy', 1)
  servidor.use(criarRateLimiter({ limitador }))
  servidor.get('/usuarios', (req, res) => res.send('x'.repeat(600)))
  return supertest(servidor)
}

const pedir = (cliente, ip = IP) => cliente.get('/usuarios').set('X-Forwarded-For', ip)

describe('Resposta 429 do rate limiter', () => {
  let consoleLog

  beforeEach(() => { consoleLog = sinon.stub(console, 'log') })
  afterEach(() => sinon.restore())

  const bloqueiosLogados = () => consoleLog.args
    .map(([registro]) => registro)
    .filter(registro => typeof registro?.message === 'string' && registro.message.startsWith('Cliente bloqueado pelo limite: '))

  describe('Retry-After de cada limite', () => {
    it('limite por IP: os segundos que faltam para a janela de 30 s do IP acabar', async () => {
      const cliente = app({ porIp: 1 })
      await pedir(cliente).expect(200)
      const { headers } = await pedir(cliente).expect(429)
      expect(headers['retry-after']).to.equal('30')
    })

    it('limite global: os segundos que faltam para a janela de 10 s do global acabar', async () => {
      const cliente = app({ global: 1 })
      await pedir(cliente).expect(200)
      const { headers } = await pedir(cliente, OUTRO_IP).expect(429)
      expect(headers['retry-after']).to.equal('10')
    })

    it('orçamento de bytes: os segundos que faltam para a hora contada do primeiro byte acabar', async () => {
      const cliente = app()
      await pedir(cliente).expect(200)
      await pedir(cliente).expect(200)
      const { headers } = await pedir(cliente).expect(429)
      expect(headers['retry-after']).to.equal('3600')
    })

    it('arredonda os segundos para cima', async () => {
      const cliente = app({ porIp: 1, janelaPorIp: 1.5 })
      await pedir(cliente).expect(200)
      const { headers } = await pedir(cliente).expect(429)
      expect(headers['retry-after']).to.equal('2')
    })

    it('nunca manda zero, mesmo quando a janela acaba no instante do bloqueio', async () => {
      const recusa = { consume: () => Promise.reject({ msBeforeNext: 0 }), duration: 30 } // eslint-disable-line prefer-promise-reject-errors
      const cliente = app({ limites: { global: recusa, porIp: recusa, orcamento: criarOrcamentoDeBytes() } })
      const { headers } = await pedir(cliente).expect(429)
      expect(headers['retry-after']).to.equal('1')
    })

    it('erro do armazenamento, sem o tempo restante: vale a janela inteira do limite', async () => {
      const falha = { consume: () => Promise.reject(new Error('armazenamento fora')), duration: 30 }
      const cliente = app({ limites: { global: falha, porIp: falha, orcamento: criarOrcamentoDeBytes() } })
      const { headers, body } = await pedir(cliente).expect(429)
      expect(headers['retry-after']).to.equal('30')
      expect(body).to.deep.equal({ message: LOAD_TEST_DETECTED })
    })
  })

  describe('Mensagem de cada limite', () => {
    it('limite de requisições por IP mantém a mensagem de teste de carga', async () => {
      const cliente = app({ porIp: 1 })
      await pedir(cliente).expect(200)
      const { body } = await pedir(cliente).expect(429)
      expect(body).to.deep.equal({ message: LOAD_TEST_DETECTED })
    })

    it('limite global de requisições mantém a mensagem de teste de carga', async () => {
      const cliente = app({ global: 1 })
      await pedir(cliente).expect(200)
      const { body } = await pedir(cliente).expect(429)
      expect(body).to.deep.equal({ message: LOAD_TEST_DETECTED })
    })

    it('orçamento de bytes diz que o limite é o de dados baixados', async () => {
      const cliente = app()
      await pedir(cliente).expect(200)
      await pedir(cliente).expect(200)
      const { body } = await pedir(cliente).expect(429)
      expect(body).to.deep.equal({ message: DOWNLOAD_LIMIT_EXCEEDED })
      expect(DOWNLOAD_LIMIT_EXCEEDED).to.not.equal(LOAD_TEST_DETECTED)
    })
  })

  describe('Log do bloqueio', () => {
    it('uma linha por cliente na janela, com o tipo do limite e sem o IP', async () => {
      const cliente = app({ porIp: 1 })
      await pedir(cliente).expect(200)
      for (let i = 0; i < 3; i++) await pedir(cliente).expect(429)
      const registros = bloqueiosLogados()
      expect(registros).to.have.length(1)
      expect(Object.keys(registros[0]).sort()).to.deep.equal(['level', 'message', 'time'])
      expect(registros[0]).to.include({ level: 'warn', message: 'Cliente bloqueado pelo limite: requisicoes-por-ip' })
      expect(JSON.stringify(consoleLog.args)).to.not.include(IP)
    })

    it('cada limite tem o seu tipo na linha', async () => {
      const global = app({ global: 1 })
      await pedir(global).expect(200)
      await pedir(global).expect(429)
      const orcamento = app()
      for (let i = 0; i < 2; i++) await pedir(orcamento).expect(200)
      await pedir(orcamento).expect(429)
      expect(bloqueiosLogados().map(registro => registro.message)).to.deep.equal([
        'Cliente bloqueado pelo limite: requisicoes-global',
        'Cliente bloqueado pelo limite: orcamento-de-bytes'
      ])
    })

    it('outro cliente barrado na mesma janela ganha a sua linha', async () => {
      const cliente = app({ porIp: 1 })
      for (const ip of [IP, OUTRO_IP]) {
        await pedir(cliente, ip).expect(200)
        await pedir(cliente, ip).expect(429)
        await pedir(cliente, ip).expect(429)
      }
      expect(bloqueiosLogados()).to.have.length(2)
      expect(JSON.stringify(consoleLog.args)).to.not.include(IP).and.to.not.include(OUTRO_IP)
    })

    it('o mesmo cliente barrado de novo numa janela nova ganha outra linha', async () => {
      const cliente = app({ porIp: 1, janelaPorIp: 0.5, bytes: 1000000 })
      await pedir(cliente).expect(200)
      await pedir(cliente).expect(429)
      await new Promise(resolve => setTimeout(resolve, 600))
      await pedir(cliente).expect(200)
      await pedir(cliente).expect(429)
      expect(bloqueiosLogados().map(registro => registro.message)).to.deep.equal([
        'Cliente bloqueado pelo limite: requisicoes-por-ip',
        'Cliente bloqueado pelo limite: requisicoes-por-ip'
      ])
    })

    it('requisição que passa não loga nada', async () => {
      await pedir(app()).expect(200)
      expect(bloqueiosLogados()).to.have.length(0)
    })
  })
})
