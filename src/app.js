'use strict'

const express = require('express')
const logger = require('morgan')
const queryParser = require('express-query-int')
const timeout = require('connect-timeout')

const { conf } = require('./utils/conf')
const { DOC_URL } = require('./utils/constants')
const montarMensagemDeErroDeSchema = require('./utils/montarMensagemDeErroDeSchema')

const app = express()

app.set('json spaces', 4)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(queryParser())
app.use(timeout())

/* istanbul ignore else */
if (!conf.semHeaderDeSeguranca) {
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    res.set('x-dns-prefetch-control', 'off')
    res.set('x-frame-options', 'SAMEORIGIN')
    res.set('strict-transport-security', 'max-age=15552000; includeSubDomains')
    res.set('x-download-options', 'noopen')
    res.set('x-content-type-options', 'nosniff')
    res.set('x-xss-protection', '1; mode=block')
    res.set('content-type', 'application/json; charset=utf-8')
    next()
  })
}

app.get('/favicon.ico', (req, res) => { res.sendStatus(200) })

/* istanbul ignore if */
if (process.env.NODE_ENV !== 'serverest-development') {
  app.use(logger('dev'))
}

app.use('/login', require('./routes/login-route'))
app.use('/usuarios', require('./routes/usuarios-route'))
app.use('/produtos', require('./routes/produtos-route'))
app.use('/carrinhos', require('./routes/carrinhos-route'))

app.use((error, req, res, next) => {
  const erroDeSchema = error.name === 'ValidationError'
  /* istanbul ignore else */
  if (erroDeSchema) {
    return res.status(400).json(montarMensagemDeErroDeSchema(error))
  } else {
    return res.status(500).json({ error })
  }
})

app.use((req, res) => {
  res.status(405).send({
    message: `Não é possível realizar ${req.method} em ${req.url}. Acesse ${DOC_URL} para ver as rotas disponíveis e como utilizá-las.`
  })
})

module.exports = app
