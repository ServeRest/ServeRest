const path = require('path')

const chai = require('chai')
const sinon = require('sinon')
const supertest = require('supertest')

const appPath = path.resolve(__dirname, '../../src/app')
const ambientePath = path.resolve(__dirname, '../../src/utils/ambiente')
const githubReleasePath = path.resolve(__dirname, '../../src/utils/github-release')

const appCacheKey = require.resolve(appPath)
const ambienteCacheKey = require.resolve(ambientePath)
const githubReleaseCacheKey = require.resolve(githubReleasePath)
const statusMonitorCacheKey = require.resolve('express-status-monitor')

const { version } = require('../../package.json')

const PAGINA_DE_RELEASES = 'https://github.com/ServeRest/ServeRest/releases'
const originalForceBanner = process.env.FORCE_RELEASE_BANNER

// O app novo dispara a busca da release ao carregar; a página só vê o resultado depois que ela termina.
async function aguardarBuscaDaRelease (fetchStub) {
  await fetchStub.firstCall.returnValue.catch(() => null)
  await new Promise(resolve => setImmediate(resolve))
}

function atributosDoAviso (html) {
  const raiz = /<html [^>]*>/.exec(html)[0]
  return {
    version: /data-notice-version="([^"]*)"/.exec(raiz)[1],
    url: /data-notice-url="([^"]*)"/.exec(raiz)[1]
  }
}

describe('app release info', () => {
  let originalNodeEnv
  let originalEnvironment
  let originalGithubExports
  let originalAmbienteCache

  function loadAppWithReleaseStub (fetchStub, ambienteStub) {
    originalNodeEnv = process.env.NODE_ENV
    originalEnvironment = process.env.ENVIRONMENT
    process.env.NODE_ENV = 'serverest-development'
    delete process.env.ENVIRONMENT

    delete require.cache[appCacheKey]
    delete require.cache[ambienteCacheKey]

    if (ambienteStub) {
      originalAmbienteCache = require.cache[ambienteCacheKey]
      require.cache[ambienteCacheKey] = {
        id: ambienteCacheKey,
        filename: ambienteCacheKey,
        loaded: true,
        exports: ambienteStub
      }
    }

    const githubModule = require(githubReleaseCacheKey)
    originalGithubExports = { ...githubModule }
    require.cache[githubReleaseCacheKey].exports = {
      ...githubModule,
      fetchLatestRelease: fetchStub
    }

    // Como desenvolvimento local, o app monta o express-status-monitor, que não tem como ser desligado:
    // o pidusage dele deixa um setInterval com ref e o mocha sem --exit nunca encerra. Estes testes não usam o monitor.
    require.cache[statusMonitorCacheKey] = {
      id: statusMonitorCacheKey,
      filename: statusMonitorCacheKey,
      loaded: true,
      exports: () => (req, res, next) => next()
    }

    const app = require(appCacheKey)
    process.env.NODE_ENV = originalNodeEnv
    if (typeof originalEnvironment === 'undefined') {
      delete process.env.ENVIRONMENT
    } else {
      process.env.ENVIRONMENT = originalEnvironment
    }
    return app
  }

  afterEach(() => {
    if (typeof originalForceBanner === 'undefined') {
      delete process.env.FORCE_RELEASE_BANNER
    } else {
      process.env.FORCE_RELEASE_BANNER = originalForceBanner
    }
    if (originalGithubExports && require.cache[githubReleaseCacheKey]) {
      require.cache[githubReleaseCacheKey].exports = originalGithubExports
    }
    if (typeof originalAmbienteCache === 'undefined') {
      delete require.cache[ambienteCacheKey]
    } else {
      require.cache[ambienteCacheKey] = originalAmbienteCache
    }
    delete require.cache[appCacheKey]
    delete require.cache[ambienteCacheKey]
    delete require.cache[statusMonitorCacheKey]
    originalGithubExports = null
    originalAmbienteCache = undefined
  })

  it('deve aguardar a busca da release no GET /swagger quando há sucesso', async () => {
    const fetchStub = sinon.stub().resolves({
      tag: 'v1.0.0',
      version: '1.0.0',
      url: 'https://github.com/ServeRest/ServeRest/releases/tag/v1.0.0'
    })
    const ambienteStub = {
      aplicacaoExecutandoLocalmente: () => true,
      urlDoAmbiente: () => 'https://serverest.dev',
      urlDoServerest: () => 'https://serverest.dev',
      urlDocumentacao: () => 'https://serverest.dev',
      ehAmbienteDeTestes: false
    }
    const app = loadAppWithReleaseStub(fetchStub, ambienteStub)

    await supertest(app).get('/swagger').expect(200)

    chai.expect(fetchStub.calledOnce).to.equal(true)
  })

  it('deve continuar no GET /swagger quando a busca da release falha', async () => {
    const fetchStub = sinon.stub().rejects(new Error('network error'))
    const app = loadAppWithReleaseStub(fetchStub)

    await supertest(app).get('/swagger').expect(200)

    chai.expect(fetchStub.calledOnce).to.equal(true)
  })

  describe('aviso de versão da página inicial', () => {
    async function paginaInicial (releaseInfo, { forcado = false, falha = false } = {}) {
      if (forcado) process.env.FORCE_RELEASE_BANNER = 'true'
      else delete process.env.FORCE_RELEASE_BANNER
      const fetchStub = falha ? sinon.stub().rejects(new Error('network error')) : sinon.stub().resolves(releaseInfo)
      const app = loadAppWithReleaseStub(fetchStub)
      await aguardarBuscaDaRelease(fetchStub)
      chai.expect(fetchStub.calledOnce).to.equal(true)
      const { text } = await supertest(app).get('/').expect(200)
      return atributosDoAviso(text)
    }

    it('preenche versão e link quando a release é mais nova', async () => {
      const url = 'https://github.com/ServeRest/ServeRest/releases/tag/v999.0.0'
      const aviso = await paginaInicial({ tag: 'v999.0.0', version: '999.0.0', url })
      chai.expect(aviso).to.deep.equal({ version: '999.0.0', url })
    })

    it('fica vazio quando a release é a versão em execução', async () => {
      const aviso = await paginaInicial({ tag: `v${version}`, version, url: `https://github.com/ServeRest/ServeRest/releases/tag/v${version}` })
      chai.expect(aviso).to.deep.equal({ version: '', url: '' })
    })

    it('fica vazio quando a release é mais velha', async () => {
      const aviso = await paginaInicial({ tag: 'v0.0.1', version: '0.0.1', url: 'https://github.com/ServeRest/ServeRest/releases/tag/v0.0.1' })
      chai.expect(aviso).to.deep.equal({ version: '', url: '' })
    })

    // Um app por teste: o carregamento guarda os exports do módulo da release para o afterEach restaurar.
    const urlsDeFora = ['https://example.com/ServeRest/ServeRest/releases/tag/v999.0.0', 'https://github.com/ServeRest/ServeRestFalso/releases', 'http://github.com/ServeRest/ServeRest/releases', undefined]
    urlsDeFora.forEach(url => {
      it(`troca o link ${String(url)} pela lista de releases`, async () => {
        const aviso = await paginaInicial({ tag: 'v999.0.0', version: '999.0.0', url })
        chai.expect(aviso).to.deep.equal({ version: '999.0.0', url: PAGINA_DE_RELEASES })
      })
    })

    it('escapa os valores do aviso como todo valor do template', async () => {
      const url = 'https://github.com/ServeRest/ServeRest/"><script>&'
      const aviso = await paginaInicial({ tag: 'v999.0.0', version: '999.0.0', url })
      chai.expect(aviso).to.deep.equal({ version: '999.0.0', url: 'https://github.com/ServeRest/ServeRest/&quot;&gt;&lt;script&gt;&amp;' })
    })

    it('forçado e sem dados da release, avisa sem versão e com o link da lista de releases', async () => {
      const aviso = await paginaInicial(null, { forcado: true })
      chai.expect(aviso).to.deep.equal({ version: '', url: PAGINA_DE_RELEASES })
    })

    it('forçado, avisa com a versão da release mesmo quando ela não é mais nova', async () => {
      const url = `https://github.com/ServeRest/ServeRest/releases/tag/v${version}`
      const aviso = await paginaInicial({ tag: `v${version}`, version, url }, { forcado: true })
      chai.expect(aviso).to.deep.equal({ version, url })
    })

    it('fica vazio quando a busca não acha release', async () => {
      chai.expect(await paginaInicial(null)).to.deep.equal({ version: '', url: '' })
    })

    it('fica vazio quando a busca da release falha', async () => {
      chai.expect(await paginaInicial(null, { falha: true })).to.deep.equal({ version: '', url: '' })
    })
  })
})
