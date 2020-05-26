const app = require('../../src/app')
const supertest = require('supertest')

global.joiAssert = require('@hapi/joi').assert
global.request = supertest(app)
