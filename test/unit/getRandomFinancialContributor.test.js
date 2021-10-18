const chai = require('chai')
const nock = require('nock')

const getRandomFinancialContributor = require('../../src/utils/getRandomFinancialContributor')

describe('getRandomFinancialContributor', () => {
  afterEach(() => nock.cleanAll())

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
})
