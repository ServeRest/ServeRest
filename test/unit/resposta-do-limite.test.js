const { expect } = require('chai')
const express = require('express')
const sinon = require('sinon')
const supertest = require('supertest')
const { RateLimiterMemory, RateLimiterRes } = require('rate-limiter-flexible')

const { BYTES_POR_HORA, criarLimitador, criarOrcamentoDeBytes, criarRateLimiter } = require('../../src/middlewares/rate-limiter')
const { DOWNLOAD_LIMIT_EXCEEDED, LOAD_TEST_DETECTED, SERVER_BUSY } = require('../../src/utils/constants')

// O middleware fica desligado no localhost e nos testes; aqui o mesmo 429 sai de um app com limites pequenos e
// janelas diferentes em cada limite, para o Retry-After mostrar de qual deles veio. O IP chega pelo
// X-Forwarded-For, como atrás do proxy do Cloud Run.
const IP = '203.0.113.7'
const OUTRO_IP = '198.51.100.20'
const TERCEIRO_IP = '192.0.2.33'

function servir (limitador, opcoes = {}) {
  const servidor = express()
  servidor.set('trust proxy', 1)
  servidor.use(criarRateLimiter({ limitador, ...opcoes }))
  servidor.get('/usuarios', (req, res) => res.send('x'.repeat(600)))
  return supertest(servidor)
}

function app ({ porIp = 1000, global = 3000, bytes = 1000, janelaPorIp = 30, janelaGlobal = 10, janelaDosBytes = 3600, limites } = {}) {
  return servir(criarLimitador(limites || {
    global: new RateLimiterMemory({ points: global, duration: janelaGlobal }),
    porIp: new RateLimiterMemory({ points: porIp, duration: janelaPorIp }),
    orcamento: criarOrcamentoDeBytes({ bytes, segundos: janelaDosBytes })
  }))
}

// Um limitador que barra sempre, com o tempo restante que o teste manda, para posicionar cada bloqueio na janela.
function barrandoSempre (tipo = 'requisicoes-por-ip') {
  const limitador = async () => ({ tipo, ms: limitador.ms })
  limitador.ms = 30000
  return limitador
}

const pedir = (cliente, ip = IP) => cliente.get('/usuarios').set('X-Forwarded-For', ip)
const falhaDoArmazenamento = () => ({ consume: () => Promise.reject(new Error('armazenamento fora')), duration: 30 })

describe('Resposta 429 do rate limiter', () => {
  let consoleLog

  beforeEach(() => { consoleLog = sinon.stub(console, 'log') })
  afterEach(() => sinon.restore())

  const registros = () => consoleLog.args.map(([registro]) => registro)
  const bloqueiosLogados = () => registros()
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
      const recusa = { consume: () => Promise.reject(new RateLimiterRes(0, 0, 1)), duration: 30 }
      const cliente = app({ limites: { global: recusa, porIp: recusa, orcamento: criarOrcamentoDeBytes() } })
      const { headers } = await pedir(cliente).expect(429)
      expect(headers['retry-after']).to.equal('1')
    })
  })

  describe('Mensagem de cada limite', () => {
    it('limite de requisições por IP mantém a mensagem de teste de carga', async () => {
      const cliente = app({ porIp: 1 })
      await pedir(cliente).expect(200)
      const { body } = await pedir(cliente).expect(429)
      expect(body).to.deep.equal({ message: LOAD_TEST_DETECTED })
    })

    it('limite global diz que o servidor está ocupado com o tráfego de todos', async () => {
      const cliente = app({ global: 1 })
      await pedir(cliente).expect(200)
      const { body } = await pedir(cliente).expect(429)
      expect(body).to.deep.equal({ message: SERVER_BUSY })
    })

    it('orçamento de bytes diz que o limite é o de dados baixados', async () => {
      const cliente = app()
      await pedir(cliente).expect(200)
      await pedir(cliente).expect(200)
      const { body } = await pedir(cliente).expect(429)
      expect(body).to.deep.equal({ message: DOWNLOAD_LIMIT_EXCEEDED })
    })

    it('as três mensagens são diferentes', () => {
      expect(new Set([LOAD_TEST_DETECTED, SERVER_BUSY, DOWNLOAD_LIMIT_EXCEEDED]).size).to.equal(3)
    })

    it('a mensagem do orçamento cita o mesmo valor que o limite aplica', () => {
      expect(DOWNLOAD_LIMIT_EXCEEDED).to.include(`até ${BYTES_POR_HORA / (1024 * 1024)} MiB por hora`)
    })
  })

  describe('Log do bloqueio', () => {
    it('uma linha por cliente na janela, com o tipo do limite e sem o IP', async () => {
      const cliente = app({ porIp: 1 })
      await pedir(cliente).expect(200)
      for (let i = 0; i < 3; i++) await pedir(cliente).expect(429)
      const linhas = bloqueiosLogados()
      expect(linhas).to.have.length(1)
      expect(Object.keys(linhas[0]).sort()).to.deep.equal(['level', 'message', 'time'])
      expect(linhas[0]).to.include({ level: 'warn', message: 'Cliente bloqueado pelo limite: requisicoes-por-ip' })
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
      const cliente = app({ porIp: 1, janelaPorIp: 1.5, bytes: 1000000 })
      await pedir(cliente).expect(200)
      await pedir(cliente).expect(429)
      await new Promise(resolve => setTimeout(resolve, 1600))
      await pedir(cliente).expect(200)
      await pedir(cliente).expect(429)
      expect(bloqueiosLogados().map(registro => registro.message)).to.deep.equal([
        'Cliente bloqueado pelo limite: requisicoes-por-ip',
        'Cliente bloqueado pelo limite: requisicoes-por-ip'
      ])
    })

    it('requisição que passa não loga nada', async () => {
      await pedir(app()).expect(200)
      expect(registros()).to.have.length(0)
    })
  })

  // A marca segue o fim da janela que o limite informa em cada bloqueio, e não um timer próprio. O relógio falso
  // move só o Date, para posicionar cada bloqueio na janela sem depender do event loop.
  describe('Marca do primeiro bloqueio nas bordas da janela', () => {
    let relogio

    beforeEach(() => { relogio = sinon.useFakeTimers({ now: 1_000_000, toFake: ['Date'] }) })

    it('um bloqueio atrasado, no último milissegundo da mesma janela, não ganha outra linha', async () => {
      const limitador = barrandoSempre()
      const cliente = servir(limitador)
      await pedir(cliente).expect(429)
      relogio.tick(29999)
      limitador.ms = 1
      await pedir(cliente).expect(429)
      expect(bloqueiosLogados()).to.have.length(1)
    })

    it('o fim da janela que varia alguns ms entre bloqueios, mesmo cruzando um segundo, não ganha outra linha', async () => {
      const limitador = barrandoSempre()
      const cliente = servir(limitador)
      limitador.ms = 29499
      await pedir(cliente).expect(429)
      limitador.ms = 29502
      await pedir(cliente).expect(429)
      expect(bloqueiosLogados()).to.have.length(1)
    })

    it('o primeiro bloqueio da janela seguinte, logo depois do fim da anterior, ganha a sua linha', async () => {
      const limitador = barrandoSempre()
      const cliente = servir(limitador)
      await pedir(cliente).expect(429)
      relogio.tick(30001)
      await pedir(cliente).expect(429)
      expect(bloqueiosLogados()).to.have.length(2)
    })

    it('cheio, o mapa descarta primeiro as marcas de janelas que já acabaram', async () => {
      const limitador = barrandoSempre()
      const cliente = servir(limitador, { maximoDeMarcas: 2 })
      limitador.ms = 3600000
      await pedir(cliente, IP).expect(429)
      limitador.ms = 1000
      await pedir(cliente, OUTRO_IP).expect(429)
      relogio.tick(2000)
      limitador.ms = 3600000 - 2000
      await pedir(cliente, TERCEIRO_IP).expect(429)
      await pedir(cliente, IP).expect(429)
      expect(bloqueiosLogados()).to.have.length(3)
    })

    it('cheio e sem marca vencida, descarta a mais antiga e não passa do teto', async () => {
      const limitador = barrandoSempre()
      const cliente = servir(limitador, { maximoDeMarcas: 2 })
      limitador.ms = 3600000
      for (const ip of [IP, OUTRO_IP, TERCEIRO_IP]) await pedir(cliente, ip).expect(429)
      await pedir(cliente, TERCEIRO_IP).expect(429)
      await pedir(cliente, OUTRO_IP).expect(429)
      expect(bloqueiosLogados()).to.have.length(3)
      await pedir(cliente, IP).expect(429)
      expect(bloqueiosLogados()).to.have.length(4)
    })
  })

  describe('Erro do armazenamento', () => {
    it('limite de requisições: falha fechada, com 429, a janela inteira no Retry-After e uma linha de erro', async () => {
      const cliente = app({ limites: { global: falhaDoArmazenamento(), porIp: falhaDoArmazenamento(), orcamento: criarOrcamentoDeBytes() } })
      const { headers, body } = await pedir(cliente).expect(429)
      expect(headers['retry-after']).to.equal('30')
      expect(body).to.deep.equal({ message: SERVER_BUSY })
      expect(registros()).to.have.length(1)
      expect(registros()[0]).to.include({ level: 'error', message: 'Falha no armazenamento do rate limiter: requisicoes-global' })
      expect(bloqueiosLogados()).to.have.length(0)
    })

    it('limite por IP: a linha de erro sai a cada falha e nunca como cliente bloqueado', async () => {
      const cliente = app({ limites: { global: new RateLimiterMemory({ points: 100, duration: 30 }), porIp: falhaDoArmazenamento(), orcamento: criarOrcamentoDeBytes() } })
      await pedir(cliente).expect(429)
      await pedir(cliente).expect(429)
      expect(registros().map(registro => registro.message)).to.deep.equal([
        'Falha no armazenamento do rate limiter: requisicoes-por-ip',
        'Falha no armazenamento do rate limiter: requisicoes-por-ip'
      ])
      expect(JSON.stringify(consoleLog.args)).to.not.include(IP)
    })

    it('orçamento de bytes: falha fechada também, com a hora inteira no Retry-After', async () => {
      const orcamento = { msAteLiberar: () => Promise.reject(new Error('armazenamento fora')), registrar () {}, duracaoMs: 3600000 }
      const cliente = app({ limites: { global: new RateLimiterMemory({ points: 100, duration: 30 }), porIp: new RateLimiterMemory({ points: 100, duration: 30 }), orcamento } })
      const { headers, body } = await pedir(cliente).expect(429)
      expect(headers['retry-after']).to.equal('3600')
      expect(body).to.deep.equal({ message: DOWNLOAD_LIMIT_EXCEEDED })
      expect(registros().map(registro => registro.level)).to.deep.equal(['error'])
    })
  })
})
