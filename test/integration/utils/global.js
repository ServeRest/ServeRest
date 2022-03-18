const app = require('../../../src/app')
const supertest = require('supertest')

if (process.env.TEST_TYPE === 'integration' || process.env.TEST_TYPE === 'mutation') {
  global.request = supertest(app)
} else { // E2E test
  let URL

  if (process.env.TEST_TYPE === 'e2e-staging') {
    URL = 'https://staging.serverest.dev'
  } else if (process.env.TEST_TYPE === 'e2e-production') {
    URL = 'https://serverest.dev'
  } else if (process.env.TEST_TYPE === 'e2e-localhost') {
    URL = 'http://localhost:3000'
  }

  // Set 'monitor=true' header to all requests to avoid logging on moesif tool
  const hook = (method = 'post') => (args) =>
    supertest(URL)[method](args)
      .set('monitor', true)

  global.request = {
    post: hook('post'),
    get: hook('get'),
    put: hook('put'),
    del: hook('delete')
  }
}
