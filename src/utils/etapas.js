'use strict'

const onHeaders = require('on-headers')

const emMilissegundos = nanossegundos => (Number(nanossegundos) / 1e6).toFixed(2)

class Registro {
  constructor () {
    this.entradas = []
    this.regrasDeclaradas = new Map()
    this.aberta = undefined
  }

  planejar (nomes) {
    nomes.forEach(nome => this.entradas.push({ nome, st: 'not_run', detalhes: {} }))
  }

  abrir (nome) {
    this.fechar('ok')
    this.aberta = this.entradas.find(entrada => entrada.nome === nome)
    this.aberta.inicio = process.hrtime.bigint()
  }

  fechar (st) {
    if (!this.aberta) return
    this.aberta.st = st
    this.aberta.dur = emMilissegundos(process.hrtime.bigint() - this.aberta.inicio)
    this.aberta = undefined
  }

  ignorar () {
    this.aberta.st = 'skipped'
    this.aberta = undefined
  }

  detalhar (objeto) {
    Object.assign(this.aberta.detalhes, objeto)
  }

  regras (...nomes) {
    const novas = nomes.map(nome => {
      const entrada = { nome: `${this.aberta.nome}.${nome}`, st: 'not_run', detalhes: {} }
      this.regrasDeclaradas.set(nome, entrada)
      return entrada
    })
    this.entradas.splice(this.entradas.indexOf(this.aberta) + 1, 0, ...novas)
  }

  regra (nome, passou, detalhes) {
    const entrada = this.regrasDeclaradas.get(nome)
    entrada.st = passou ? 'ok' : 'failed'
    Object.assign(entrada.detalhes, detalhes)
  }

  // A etapa ainda aberta quando os headers são escritos é a que produziu a resposta.
  finalizar (statusCode) {
    this.fechar(statusCode >= 400 ? 'failed' : 'ok')
  }

  stages () {
    return this.entradas
      .map(({ nome, st, dur, detalhes }) => [
        nome,
        `st=${st}`,
        ...(dur === undefined ? [] : [`dur=${dur}`]),
        ...Object.entries(detalhes).map(([chave, valor]) => `${chave}=${valor}`)
      ].join(';'))
      .join(', ')
  }
}

exports.iniciar = (req, res, next) => {
  // O cors responde o preflight antes do rate limiter, então não há etapa a relatar.
  if (req.method === 'OPTIONS') return next()
  const registro = res.locals.etapas = new Registro()
  registro.planejar(['body', 'rate_limit'])
  onHeaders(res, () => {
    registro.finalizar(res.statusCode)
    res.setHeader('X-ServeRest-Stages', registro.stages())
  })
  next()
}

// Exatamente três parâmetros: com quatro o Express trataria o retorno como error handler.
exports.etapa = (nome, middleware) => (req, res, next) => {
  const registro = res.locals.etapas
  if (!registro) return middleware(req, res, next)
  registro.abrir(nome)
  return middleware(req, res, erro => {
    registro.fechar(erro ? 'failed' : 'ok')
    next(erro)
  })
}

exports.plano = (...nomes) => (req, res, next) => {
  res.locals.etapas.planejar(nomes)
  next()
}
