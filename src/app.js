'use strict'

require('express-async-errors')

const cors = require('cors')
const express = require('express')
const morgan = require('morgan')
const queryParser = require('express-query-int')
const timeout = require('connect-timeout')
const { join } = require('path')
const swaggerUi = require('swagger-ui-express')

const { aplicacaoExecutandoLocalmente, formaDeExecucao, urlDocumentacao } = require('./utils/ambiente')
const { conf } = require('./utils/conf')
const errorHandler = require('./middlewares/error-handler')
const logger = require('./utils/logger')
const { version } = require('../package.json')
const swaggerDocument = require('../docs/swagger.json')
const rateLimiter = require('./middlewares/rate-limiter')
const packageJson = require('../package.json')

const ehAmbienteDeTestes = process.env.NODE_ENV === 'serverest-test'

const app = express()

app.set('json spaces', 4)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(queryParser())
app.use(timeout())
app.use(cors())
app.use(rateLimiter)

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

/* istanbul ignore next */
if (aplicacaoExecutandoLocalmente() && !ehAmbienteDeTestes) {
  app.use(require('express-status-monitor')({ title: 'ServeRest Status' }))
}

logger(app)

/* istanbul ignore next */
switch (formaDeExecucao()) {
  case 'serverest.dev':
    swaggerDocument.host = 'serverest.dev'
    break
  case 'staging.serverest.dev':
    swaggerDocument.host = 'staging.serverest.dev'
    break
  case 'agilizei':
    swaggerDocument.host = 'agilizei.serverest.dev'
    break
}

swaggerDocument.info.version = packageJson.version

const uiOptions = {
  customSiteTitle: 'ServeRest',
  customfavIcon: '/favicon.ico',
  customCss: `
  .topbar-wrapper img { content:url(https://user-images.githubusercontent.com/29241659/118382797-365f3900-b5cf-11eb-9c82-0298a5c75b7e.png); width:150px; height:auto; }
  .swagger-ui .topbar { background-color: #000000; border-bottom: 20px solid #7900e2; }`
}

app.use('/', swaggerUi.serve)
app.get('/', swaggerUi.setup(swaggerDocument, uiOptions))
app.use('/favicon.ico', express.static(join(__dirname, '../docs/favicon.png')))
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
app.use((req, res) => {
  res.status(405).send({
    message: `Não é possível realizar ${req.method} em ${req.url}. Acesse ${urlDocumentacao()} para ver as rotas disponíveis e como utilizá-las.`
  })
})

module.exports = app
