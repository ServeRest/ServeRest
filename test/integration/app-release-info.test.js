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
    originalGithubExports = null
    originalAmbienteCache = undefined
  })

  it('deve aguardar a busca da release no GET / quando há sucesso', async () => {
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

    await supertest(app).get('/').expect(200)

    chai.expect(fetchStub.calledOnce).to.equal(true)
  })

  it('deve continuar no GET / quando a busca da release falha', async () => {
    const fetchStub = sinon.stub().rejects(new Error('network error'))
    const app = loadAppWithReleaseStub(fetchStub)

    await supertest(app).get('/').expect(200)

    chai.expect(fetchStub.calledOnce).to.equal(true)
  })
})
