'use strict'

require('express-async-errors')

const cors = require('cors')
const express = require('express')
const morgan = require('morgan')
const queryParser = require('express-query-int')
const timeout = require('connect-timeout')
const { join } = require('path')

const { formaDeExecucao, urlDocumentacao } = require('./utils/ambiente')
const { conf } = require('./utils/conf')
const errorHandler = require('./middlewares/error-handler')
const monitor = require('./monitor')
const { version } = require('../package.json')

const ehAmbienteDeTestes = process.env.NODE_ENV === 'serverest-test'

const app = express()

app.set('json spaces', 4)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(queryParser())
app.use(timeout())
app.use(cors())

app.disable('etag')

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
    next()
  })
}

/* istanbul ignore if */
if (formaDeExecucao() === 'serverest.dev') {
  app.use(require('express-status-monitor')({ title: 'ServeRest Status' }))
}

monitor(app)

/* istanbul ignore next */
app.get('/', async (req, res) => {
  const pathDocumentacao = (urlDocumentacao() === 'https://serverest.dev') ? '../docs/serverest.dev.html' : '../docs/localhost.html'
  res.sendFile(join(__dirname, pathDocumentacao))
})
app.get('/favicon.ico', (req, res) => { res.sendStatus(204) })
app.get('/version', (req, res) => { res.status(200).send({ version }) })

/* istanbul ignore if */
if (!ehAmbienteDeTestes) {
  app.use(morgan('dev'))
}

app.use('/login', require('./routes/login-route'))
app.use('/usuarios', require('./routes/usuarios-route'))
app.use('/produtos', require('./routes/produtos-route'))
app.use('/carrinhos', require('./routes/carrinhos-route'))

app.use(errorHandler)
app.use(async (req, res) => {
  res.status(405).send({
    message: `Não é possível realizar ${req.method} em ${req.url}. Acesse ${urlDocumentacao()} para ver as rotas disponíveis e como utilizá-las.`
  })
})

module.exports = app
