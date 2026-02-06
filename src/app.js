'use strict'

require('express-async-errors')

const cors = require('cors')
const express = require('express')
const morgan = require('morgan')
const queryParser = require('express-query-int')
const timeout = require('connect-timeout')
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
const packageJson = require('../package.json')
const { fetchLatestRelease } = require('./utils/github-release')

const forceReleaseBanner = process.env.FORCE_RELEASE_BANNER === 'true'
const forcedReleaseVersion = process.env.FORCE_RELEASE_VERSION || null

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

swaggerDocument.info.version = packageJson.version

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

function buildCustomJsStr (releaseInfo, currentVersion, forceBanner, forcedVersion) {
  const releaseInfoJson = JSON.stringify(releaseInfo)
  const currentVersionJson = JSON.stringify(currentVersion)
  const forceBannerJson = JSON.stringify(forceBanner)
  const forcedVersionJson = JSON.stringify(forcedVersion)
  return `
  (function () {
    var releaseInfo = ${releaseInfoJson};
    var currentVersion = ${currentVersionJson};
    var forceBanner = ${forceBannerJson};
    var forcedVersion = ${forcedVersionJson};

    function normalizeVersion (version) {
      if (!version) return '';
      return version.toString().trim().replace(/^v/i, '');
    }

    function renderReleaseToast () {
      var current = normalizeVersion(currentVersion);
      var latestVersion = normalizeVersion(releaseInfo && (releaseInfo.version || releaseInfo.tag));
      if (forceBanner) {
        latestVersion = normalizeVersion(forcedVersion || '999.999.999');
      }
      if (!latestVersion || !current) return;
      if (latestVersion === current) return;
      var root = document.querySelector('.swagger-ui');
      if (!root || document.querySelector('.release-toast')) return;
      var toast = document.createElement('div');
      toast.className = 'release-toast';
      toast.setAttribute('aria-live', 'polite');
      var content = document.createElement('div');
      content.className = 'release-toast__content';
      var title = document.createElement('div');
      title.className = 'release-toast__title';
      var titleIcon = document.createElement('span');
      titleIcon.className = 'release-toast__title-icon';
      titleIcon.textContent = '⚡';
      var titleText = document.createElement('span');
      titleText.textContent = 'Nova release disponível';
      title.appendChild(titleIcon);
      title.appendChild(titleText);
      var meta = document.createElement('div');
      meta.className = 'release-toast__meta';
      meta.textContent = 'v' + latestVersion + ' (v' + current + ' instalada)';
      var link = document.createElement('a');
      link.className = 'release-toast__link';
      link.href = (releaseInfo && releaseInfo.url) ? releaseInfo.url : 'https://github.com/ServeRest/ServeRest/releases';
      link.textContent = 'Ver release';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'release-toast__close';
      close.setAttribute('aria-label', 'Fechar aviso de release');
      close.textContent = '×';
      close.addEventListener('click', function () {
        toast.remove();
      });
      content.appendChild(title);
      content.appendChild(meta);
      content.appendChild(link);
      toast.appendChild(content);
      toast.appendChild(close);
      root.appendChild(toast);
    }

    function observe () {
      var root = document.querySelector('.swagger-ui');
      if (!root) {
        setTimeout(observe, 500);
        return;
      }
      setTimeout(renderReleaseToast, 500);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observe);
    } else {
      observe();
    }
  })();
  `
}

const uiOptionsBase = {
  customSiteTitle: 'ServeRest',
  customfavIcon: '/favicon.ico',
  customCss: `
  .swagger-ui .topbar-wrapper .link {
    display: block;
    height: 60px;
    background: url(https://user-images.githubusercontent.com/29241659/118382797-365f3900-b5cf-11eb-9c82-0298a5c75b7e.png) no-repeat center / contain;
  }
  .swagger-ui .topbar-wrapper .link svg { display: none; }
  .swagger-ui .topbar { background-color: #000000; border-bottom: 20px solid #7900e2; }
  .swagger-ui .release-toast {
    position: fixed;
    right: 20px;
    bottom: 20px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    color: #111827;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 14px;
    max-width: 360px;
    box-shadow: 0 12px 24px rgba(121, 0, 226, 0.25);
    z-index: 9999;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    border-left: 3px solid #8b5cf6;
    animation: releaseToastScaleIn 1000ms ease-out;
  }
  @keyframes releaseToastScaleIn {
    0% { transform: scale(0.96); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  .swagger-ui .release-toast__content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .swagger-ui .release-toast__title {
    font-weight: 700;
    font-size: 16px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .swagger-ui .release-toast__title-icon {
    font-size: 16px;
    line-height: 1;
  }
  .swagger-ui .release-toast__meta {
    color: #6b7280;
    font-size: 14px;
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .swagger-ui .release-toast__link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 4px;
    background: #7c3aed;
    color: #ffffff;
    text-decoration: none;
    font-weight: 600;
    text-align: center;
    padding: 6px 10px;
    border-radius: 6px;
  }
  .swagger-ui .release-toast__link:hover {
    background: #6d28d9;
  }
  .swagger-ui .release-toast__close {
    background: transparent;
    border: 0;
    color: inherit;
    font-size: 19px;
    line-height: 1;
    padding: 2px 0 0;
    cursor: pointer;
    opacity: 0.7;
  }
  .swagger-ui .release-toast__close:hover {
    opacity: 1;
    background: rgba(15, 23, 42, 0.08);
    border-radius: 999px;
  }`
}

app.use('/', swaggerUi.serve)
app.get('/', async (req, res, next) => {
  if (latestReleasePromise) {
    await latestReleasePromise
  }
  const uiOptions = {
    ...uiOptionsBase,
    customJsStr: buildCustomJsStr(
      latestReleaseInfo,
      packageJson.version,
      forceReleaseBanner,
      forcedReleaseVersion
    )
  }
  return swaggerUi.setup(swaggerDocument, uiOptions)(req, res, next)
})
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
