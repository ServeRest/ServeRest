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
const { pararSeExpirou, descartarErroDepoisDaResposta } = require('./middlewares/parar-se-expirou')
const { iniciar, etapa } = require('./utils/etapas')
const { fetchLatestRelease, isNewerVersion } = require('./utils/github-release')
const { buildCustomJsStr, customCss } = require('./swagger')
const { ARQUIVOS_GRANDES, pastaPrecomprimida } = require('./swagger/arquivos-grandes')
const { localizeSwaggerDocument } = require('./swagger/translations')
const { paginaPronta, LAB_ASSETS_DIR } = require('./lab')
const { robotsTxt, sitemapXml } = require('./lab/buscadores')
const {
  cacheForaDoLocalhost,
  cacheNoStatic,
  enviarResposta,
  prepararResposta,
  servirPrecomprimidos,
  servirTextos,
  textosDaPasta
} = require('./lab/entrega')

const forceReleaseBanner = process.env.FORCE_RELEASE_BANNER === 'true'
const supportedLanguages = new Set(['pt-BR', 'en', 'es'])

function idiomaDaRequisicao (req) {
  const requestedLanguage = typeof req.query.lang === 'string' ? req.query.lang : ''
  return supportedLanguages.has(requestedLanguage) ? requestedLanguage : 'pt-BR'
}

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
// Confia em exatamente um proxy, que é o do Cloud Run. Sem isso req.ip resolve para o
// endereço do proxy e todos os clientes viram a mesma chave no rate limiter. Com 'true'
// o Express passaria a ler o primeiro endereço do X-Forwarded-For, que o próprio cliente
// pode forjar, então o número de saltos precisa ser explícito.
app.set('trust proxy', 1)
app.use(['/login', '/usuarios', '/produtos', '/carrinhos'], iniciar)
const parsersDoBody = express.Router()
parsersDoBody.use(express.json(), express.urlencoded({ extended: false }))
app.use(etapa('body', parsersDoBody))
app.use(queryParser())
app.use(timeout())
app.use(cors({ exposedHeaders: ['X-ServeRest-Stages'] }))
app.use(moesifMiddleware)
app.use(etapa('rate_limit', rateLimiter))

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

// Com a URL deste ambiente, montados uma vez. Só a produção libera os buscadores.
const textoDoRobots = robotsTxt(currentUrl, currentUrl === serverestUrl)
const textoDoSitemap = sitemapXml(currentUrl)

// O documento como a página inicial o pede, com v: montado e comprimido uma vez por idioma.
const swaggerJsonDaPagina = new Map([...supportedLanguages].map(idioma => [
  idioma,
  prepararResposta(JSON.stringify(localizeSwaggerDocument(swaggerDocument, idioma), null, app.get('json spaces')), 'json')
]))

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

const PAGINA_DE_RELEASES = 'https://github.com/ServeRest/ServeRest/releases'
const PREFIXO_DAS_RELEASES = 'https://github.com/ServeRest/ServeRest/'

// Aviso de versão nova da página inicial, calculado a cada requisição. Forçado e
// sem dados da release, o aviso vai sem versão. O link que a API devolve só é usado se for do
// repositório; qualquer outro vira a lista de releases.
function avisoDeVersao (releaseInfo) {
  const haVersaoNova = releaseInfo !== null && isNewerVersion(releaseInfo.version, version)
  if (!haVersaoNova && !forceReleaseBanner) return null
  if (releaseInfo === null) return { version: '', url: PAGINA_DE_RELEASES }
  const urlConfiavel = typeof releaseInfo.url === 'string' && releaseInfo.url.startsWith(PREFIXO_DAS_RELEASES)
  return { version: releaseInfo.version, url: urlConfiavel ? releaseInfo.url : PAGINA_DE_RELEASES }
}

const uiOptions = {
  customSiteTitle: 'ServeRest',
  customfavIcon: '/favicon.ico',
  customCss,
  customJsStr: buildCustomJsStr(version)
}

function setupDoSwagger (idioma) {
  return swaggerUi.setup(localizeSwaggerDocument(swaggerDocument, idioma), uiOptions)
}

// O swagger-ui-express só preenche o /swagger-ui-init.js quando a página do Swagger é renderizada.
// Sem esta renderização, quem abre só a página inicial faz o service worker guardar um init vazio
// e o /swagger fica em branco para essa pessoa até a próxima versão.
setupDoSwagger('pt-BR')

// O index.html da pasta do Swagger UI é a página de exemplo do pacote, que carrega a Petstore: sob o domínio do
// ServeRest ele parecia uma página do projeto. O endereço leva à página inicial, com a query (o idioma) junto.
// O destino é sempre a raiz: o que vem de quem pede entra só depois do "?", e nunca forma outro endereço.
app.get('/index.html', (req, res) => {
  const inicioDaQuery = req.originalUrl.indexOf('?')
  res.redirect(301, inicioDaQuery === -1 ? '/' : '/?' + req.originalUrl.slice(inicioDaQuery + 1))
})
// Os assets do Swagger UI ficam na raiz: a página em /swagger os referencia com caminho relativo.
// Os maiores saem comprimidos no build para quem aceita; o resto, como sempre.
app.use('/', servirPrecomprimidos(pastaPrecomprimida, ARQUIVOS_GRANDES), swaggerUi.serve)
app.get('/swagger', (req, res, next) => {
  // A mesma rota atende /swagger/ e /SWAGGER; com a barra final os assets relativos não carregariam.
  if (req.path !== '/swagger') {
    const inicioDaQuery = req.originalUrl.indexOf('?')
    const query = inicioDaQuery === -1 ? '' : req.originalUrl.slice(inicioDaQuery)
    return res.redirect(302, '/swagger' + query)
  }
  res.set('Cache-Control', 'no-cache, max-age=0')
  return setupDoSwagger(idiomaDaRequisicao(req))(req, res, next)
})
app.use('/favicon.ico', express.static(join(__dirname, '../docs/favicon.png'), { setHeaders: cacheNoStatic }))
app.use('/flags', express.static(join(__dirname, '../docs/flags'), { setHeaders: cacheNoStatic }))
app.use('/images', express.static(join(__dirname, '../docs/images')))
app.use('/lab/assets', servirTextos(textosDaPasta(LAB_ASSETS_DIR)), express.static(LAB_ASSETS_DIR, { setHeaders: cacheNoStatic }))
// A página volta sempre ao servidor (no-cache), mas quem já a tem recebe um 304 sem corpo.
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache, max-age=0')
  enviarResposta(req, res, paginaPronta(idiomaDaRequisicao(req), avisoDeVersao(latestReleaseInfo)))
})
app.get('/swagger.json', (req, res) => {
  // Só a página inicial pede com v. O Swagger e quem importa no Postman pedem sem v e recebem como antes.
  if (req.query.v !== undefined) {
    const cache = cacheForaDoLocalhost(req)
    if (cache) res.set('Cache-Control', cache)
    return enviarResposta(req, res, swaggerJsonDaPagina.get(idiomaDaRequisicao(req)))
  }
  res.status(200).json(localizeSwaggerDocument(swaggerDocument, idiomaDaRequisicao(req)))
})
app.get('/version', (req, res) => { res.status(200).send({ version }) })
// Sem estas duas rotas os buscadores recebiam o 405 em JSON das URLs desconhecidas, que continua igual para as
// outras: os testes dos alunos podem conferir essa resposta.
app.get('/robots.txt', (req, res) => { res.type('text/plain').send(textoDoRobots) })
app.get('/sitemap.xml', (req, res) => { res.type('application/xml').send(textoDoSitemap) })
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
// Logo depois do errorHandler: é daqui que continua a requisição que já recebeu o 408 (src/middlewares/parar-se-expirou.js).
app.use(pararSeExpirou)
app.use(descartarErroDepoisDaResposta)
app.use((req, res) => {
  res.status(405).send({
    message: `Não é possível realizar ${req.method} em ${req.url}. Acesse ${urlDocumentacao()} para ver as rotas disponíveis e como utilizá-las.`
  })
})

module.exports = app
