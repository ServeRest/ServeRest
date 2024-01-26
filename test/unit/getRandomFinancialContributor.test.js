const axios = require('axios')
const chai = require('chai')
const nock = require('nock')
const sinon = require('sinon')

const sandbox = sinon.createSandbox()

const getRandomFinancialContributor = require('../../src/utils/getRandomFinancialContributor')
const logger = require('../../src/utils/logger')

describe('getRandomFinancialContributor', () => {
  afterEach(() => {
    sandbox.restore()
    nock.cleanAll()
  })

  it('Deve retornar apenas 1 apoiador, ignorando ADMIN, HOST e com nome \'Paulo Gonçalves\'', async () => {
    nock('https://opencollective.com')
      .get('/serverest/members/all.json')
      .reply(200, [
        {
          role: 'ADMIN',
          name: 'Jose'
        },
        {
          role: 'HOST',
          name: 'Maria'
        },
        {
          role: 'BACKER',
          name: 'Paulo Gonçalves'
        },
        {
          role: 'BACKER',
          name: 'Sarah'
        },
        {
          role: 'BACKER',
          name: 'Sarah'
        }
      ])

    const user = await getRandomFinancialContributor()

    chai.assert.deepInclude(user, ['Sarah'])
  })

  it('Deve fazer log de erro quando não for possível ter acesso à lista de contribuidores financeiros', async () => {
    const logStub = sandbox.stub(logger, 'log')

    const axiosStub = sandbox.stub(axios, 'get')
    axiosStub.throws(new Error('Network error'))

    await getRandomFinancialContributor()

    sinon.assert.calledOnce(logStub)
    sinon.assert.calledWith(logStub, {
      level: 'error',
      message: 'Failed to get financial contributor.'
    })
  })
})
