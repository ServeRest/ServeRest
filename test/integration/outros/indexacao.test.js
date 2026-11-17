const { expect } = require('chai')

const { version } = require('../../../package.json')

// A API devolve e-mails e senhas da sandbox e não deve aparecer nos buscadores; a página inicial e os assets
// do Swagger, sim. O 413 sai do parser do body, que vem antes do rate limiter: se o header vale nele, vale
// também no 429, que só existe no ServeRest online.
describe('X-Robots-Tag', () => {
  const daApi = [
    ['GET /usuarios', () => request.get('/usuarios'), 200],
    ['GET /USUARIOS', () => request.get('/USUARIOS'), 200],
    ['GET /produtos', () => request.get('/produtos'), 200],
    ['GET /carrinhos', () => request.get('/carrinhos'), 200],
    ['GET /usuarios/:id inexistente', () => request.get('/usuarios/zzzzzzzzzzzzzzzz'), 400],
    ['POST /login sem corpo', () => request.post('/login').send({}), 400],
    ['GET /login, sem a rota', () => request.get('/login'), 405],
    ['DELETE /produtos sem token', () => request.del('/produtos/abc'), 401],
    ['POST /usuarios com corpo grande demais', () => request.post('/usuarios').set('content-type', 'application/json').send(JSON.stringify({ nome: 'a'.repeat(110 * 1024) })), 413],
    ['GET /swagger.json', () => request.get('/swagger.json'), 200],
    ['GET /swagger.json?lang=en', () => request.get('/swagger.json?lang=en'), 200],
    ['GET /swagger.json com v', () => request.get(`/swagger.json?lang=es&v=${version}`), 200]
  ]

  daApi.forEach(([nome, pedir, status]) => {
    it(`${nome}: noindex`, async () => {
      const { headers } = await pedir().expect(status)
      expect(headers['x-robots-tag']).to.equal('noindex')
    })
  })

  const indexaveis = [
    '/',
    '/?lang=en',
    '/swagger',
    '/swagger-ui.css',
    '/swagger-ui-bundle.js',
    '/swagger-ui-init.js',
    `/lab/assets/app.js?v=${version}`,
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ]

  indexaveis.forEach(caminho => {
    it(`${caminho}: sem X-Robots-Tag`, async () => {
      const { headers } = await request.get(caminho).expect(200)
      expect(headers).to.not.have.property('x-robots-tag')
    })
  })
})
