'use strict'

require('express-async-errors')

const cors = require('cors')
const express = require('express')
const morgan = require('morgan')
const queryParser = require('express-query-int')
const timeout = require('connect-timeout')
const { readFileSync } = require('fs')
const { join } = require('path')
const swaggerUi = require('swagger-ui-express')
const ddTrace = require('dd-trace')
const ipfilter = require('express-ipfilter').IpFilter

const {
  aplicacaoExecutandoLocalmente,
  urlDoAmbiente,
  urlDoServerest,
  urlDocumentacao,
  ehAmbienteDeTestes
} = require('./utils/ambiente')
const { conf } = require('./utils/conf')
const errorHandler = require('./middlewares/error-handler')
const moesifMiddleware = require('./middlewares/moesif-monitor-middleware')
const { version } = require('../package.json')
const swaggerDocument = require('../docs/swagger.json')
const rateLimiter = require('./middlewares/rate-limiter')
const { fetchLatestRelease } = require('./utils/github-release')
const { buildCustomJsStr, customCss } = require('./swagger')
const { localizeSwaggerDocument } = require('./swagger/translations')

const forceReleaseBanner = process.env.FORCE_RELEASE_BANNER === 'true'
const supportedLanguages = new Set(['pt-BR', 'en', 'es'])

const app = express()

/* istanbul ignore next */
if (!aplicacaoExecutandoLocalmente()) {
  ddTrace.init()
  ddTrace.use('express')
}

/* istanbul ignore if */
if (process.env.BLOCKED_IPS) {
  app.use(ipfilter(process.env.BLOCKED_IPS.split(','), {
    mode: 'deny',
    log: false
  }))
}

app.set('json spaces', 4)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(queryParser())
app.use(timeout())
app.use(cors())
app.use(moesifMiddleware)
app.use(rateLimiter)

app.disable('etag')

/* istanbul ignore else */
if (!conf.semHeaderDeSeguranca) {
  app.disable('x-powered-by')
  app.disable('Server')
  app.disable('X-Cloud-Trace-Context')
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

const currentUrl = urlDoAmbiente()
const serverestUrl = urlDoServerest()

swaggerDocument.servers = currentUrl === serverestUrl
  ? [{ url: serverestUrl }]
  : [{ url: currentUrl }, { url: serverestUrl }]

swaggerDocument.info.version = version

let latestReleaseInfo = null
let latestReleasePromise = null

async function atualizarReleaseInfo () {
  latestReleasePromise = fetchLatestRelease()
    .then(info => {
      latestReleaseInfo = info
      return info
    })
    .catch(() => {
      latestReleaseInfo = null
      return null
    })
  return latestReleasePromise
}

/* istanbul ignore if */
if (!ehAmbienteDeTestes) {
  atualizarReleaseInfo()
}

const uiOptionsBase = {
  customSiteTitle: 'ServeRest',
  customfavIcon: '/favicon.ico',
  customCss
}

app.use('/', swaggerUi.serve)
app.get('/', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, max-age=0')
  const requestedLanguage = typeof req.query.lang === 'string' ? req.query.lang : ''
  const language = supportedLanguages.has(requestedLanguage) ? requestedLanguage : 'pt-BR'
  const localizedSwagger = localizeSwaggerDocument(swaggerDocument, language)
  const customJsStr = buildCustomJsStr(
    latestReleaseInfo,
    version,
    forceReleaseBanner
  )
  const uiOptions = {
    ...uiOptionsBase,
    customJsStr
  }
  return swaggerUi.setup(localizedSwagger, uiOptions)(req, res, next)
})
app.use('/favicon.ico', express.static(join(__dirname, '../docs/favicon.png')))
app.use('/flags', express.static(join(__dirname, '../docs/flags')))
app.use('/images', express.static(join(__dirname, '../docs/images')))
app.get('/swagger.json', (req, res) => {
  const requestedLanguage = typeof req.query.lang === 'string' ? req.query.lang : ''
  const language = supportedLanguages.has(requestedLanguage) ? requestedLanguage : 'pt-BR'
  res.status(200).json(localizeSwaggerDocument(swaggerDocument, language))
})
app.get('/version', (req, res) => { res.status(200).send({ version }) })
app.get('/swagger-sw.js', (req, res) => {
  const workerCode = readFileSync(join(__dirname, 'swagger/swagger-sw.js'), 'utf8')
    .replace(/__VERSION__/g, version)
  res.set('Content-Type', 'application/javascript; charset=utf-8')
  res.set('Cache-Control', 'no-store')
  res.send(workerCode)
})

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
