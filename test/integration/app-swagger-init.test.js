const path = require('path')

const chai = require('chai')
const supertest = require('supertest')

const appCacheKey = require.resolve(path.resolve(__dirname, '../../src/app'))
const swaggerUiCacheKey = require.resolve('swagger-ui-express')

// O swagger-ui-express guarda o init num módulo. Um app novo com um swagger-ui-express novo reproduz
// o servidor recém iniciado, em que ninguém abriu o /swagger ainda.
describe('app swagger-ui-init.js na inicialização', () => {
  let originalSwaggerUiCache

  afterEach(() => {
    delete require.cache[appCacheKey]
    require.cache[swaggerUiCacheKey] = originalSwaggerUiCache
  })

  it('já serve o init do Swagger UI antes de qualquer página ser aberta - @skipE2E', async () => {
    originalSwaggerUiCache = require.cache[swaggerUiCacheKey]
    delete require.cache[appCacheKey]
    delete require.cache[swaggerUiCacheKey]
    const app = require(appCacheKey)

    const { text } = await supertest(app).get('/swagger-ui-init.js').expect(200)

    chai.expect(text).to.include('SwaggerUIBundle(')
  })
})
