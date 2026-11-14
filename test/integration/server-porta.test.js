const http = require('http')
const path = require('path')

const chai = require('chai')
const sinon = require('sinon')
const supertest = require('supertest')

const { conf } = require('../../src/utils/conf')

const serverCacheKey = require.resolve(path.resolve(__dirname, '../../src/server'))
const appCacheKey = require.resolve(path.resolve(__dirname, '../../src/app'))
const swaggerDocumentCacheKey = require.resolve(path.resolve(__dirname, '../../docs/swagger.json'))
const swaggerUiCacheKey = require.resolve('swagger-ui-express')

const PORTA_INFORMADA = 4000
const URL_LOCAL = `http://localhost:${PORTA_INFORMADA}`
const EVENTOS_DO_PROCESSO = ['uncaughtException', 'unhandledRejection']

// O server.js é carregado como o npx serverest faria, mas sem abrir porta: o app sai do http.createServer.
describe('server com a porta informada na linha de comando', () => {
  let originais

  afterEach(() => {
    if (!originais) return
    sinon.restore()
    process.argv = originais.argv
    Object.keys(conf).forEach(chave => { delete conf[chave] })
    Object.assign(conf, originais.conf)
    require.cache[swaggerDocumentCacheKey] = originais.swaggerDocumentCache
    require.cache[swaggerUiCacheKey] = originais.swaggerUiCache
    delete require.cache[serverCacheKey]
    delete require.cache[appCacheKey]
    originais = undefined
  })

  function carregarServer (...argumentos) {
    originais = {
      argv: process.argv,
      conf: { ...conf },
      swaggerDocumentCache: require.cache[swaggerDocumentCacheKey],
      swaggerUiCache: require.cache[swaggerUiCacheKey]
    }
    const listenersAntes = Object.fromEntries(EVENTOS_DO_PROCESSO.map(evento => [evento, process.listeners(evento)]))
    process.argv = [process.execPath, serverCacheKey, ...argumentos]
    const createServer = sinon.stub(http, 'createServer').returns({ listen () {}, on () {} })
    // Documento e swagger-ui-express novos: o app recarregado não muda o Swagger do app dos outros testes.
    delete require.cache[swaggerDocumentCacheKey]
    delete require.cache[swaggerUiCacheKey]
    delete require.cache[serverCacheKey]
    delete require.cache[appCacheKey]
    try {
      require(serverCacheKey)
    } finally {
      // O supertest também cria o servidor pelo http.createServer.
      createServer.restore()
      // Os handlers do server.js encerram o processo, o que derrubaria o mocha no primeiro erro não capturado.
      EVENTOS_DO_PROCESSO.forEach(evento => {
        process.listeners(evento)
          .filter(listener => !listenersAntes[evento].includes(listener))
          .forEach(listener => process.removeListener(evento, listener))
      })
    }
    return createServer.firstCall.args[0]
  }

  it('Swagger e mensagem de rota inexistente apontam para a porta do -p - @skipE2E', async () => {
    const app = carregarServer('-p', String(PORTA_INFORMADA), '--nodoc')

    const { body: documento } = await supertest(app).get('/swagger.json').expect(200)
    chai.expect(documento.servers[0].url).to.equal(URL_LOCAL)

    const { text: init } = await supertest(app).get('/swagger-ui-init.js').expect(200)
    chai.expect(init).to.include(URL_LOCAL)

    const { body: rotaInexistente } = await supertest(app).get('/api-doc').expect(405)
    chai.expect(rotaInexistente.message).to.include(URL_LOCAL)
  })
})
