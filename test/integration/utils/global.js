const app = require('../../../src/app')
const supertest = require('supertest')

if (process.env.TEST_TYPE === 'integration' || process.env.TEST_TYPE === 'mutation') {
  global.request = supertest(app)
  // Só na integração: na mutação a espera da verificação se repetiria a cada mutante.
  if (process.env.TEST_TYPE === 'integration') {
    exports.mochaHooks = require('./timers-pendentes')
  }
} else { // E2E test
  let URL

  if (process.env.TEST_TYPE === 'e2e-staging') {
    URL = 'https://staging.serverest.dev'
  } else if (process.env.TEST_TYPE === 'e2e-production') {
    URL = 'https://serverest.dev'
  } else if (process.env.TEST_TYPE === 'e2e-localhost') {
    URL = 'http://127.0.0.1:3000'
  }

  // Só staging e produção passam pelo rate limiter; no localhost ele não roda.
  const remoto = ['e2e-staging', 'e2e-production'].includes(process.env.TEST_TYPE)
  const limitar = remoto ? require('./limite-de-requisicoes').criarLimitador() : test => test

  // Set 'monitor=true' header to all requests to avoid logging on moesif tool
  const hook = (method = 'post') => (args) =>
    limitar(supertest(URL)[method](args)
      .set('monitor', true))

  global.request = {
    post: hook('post'),
    get: hook('get'),
    head: hook('head'),
    put: hook('put'),
    del: hook('delete')
  }
}
