const app = require('../../../src/app')
const supertest = require('supertest')

if (process.env.TEST_TYPE === 'e2e') {
  global.request = supertest('http://localhost:3000')
} else {
  global.request = supertest(app)
}
