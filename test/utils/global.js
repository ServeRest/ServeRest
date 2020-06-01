const app = require('../../src/app')
const supertest = require('supertest')

global.request = supertest(app)
