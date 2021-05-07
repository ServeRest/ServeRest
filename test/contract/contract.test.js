const http = require('http')
const isCI = require('is-ci')
const { Verifier } = require('@pact-foundation/pact')

const app = require('../../src/app')

describe('ServeRest - Verificação do contrato', () => {
  const SERVER_URL = 'http://localhost:3001'
  const server = http.createServer(app)

  const gitHash = require('child_process')
    .execSync('git rev-parse HEAD')
    .toString()
    .trim()

  const gitBranch = require('child_process')
    .execSync('git branch --show-current')
    .toString()
    .trim()

  before(() => {
    server.listen(3001, () => {
      console.log(`Clients Service listening on ${SERVER_URL}`)
    })
  })

  after(() => {
    server.close()
  })

  const consumerVersionTags = process.env.CONSUMER_VERSION_TAG
    ? ['production', process.env.CONSUMER_VERSION_TAG]
    : ['production']

  it('Validates the expectations of ServeRest', () => {
    const options = {
      provider: 'ServeRest - API Rest',
      logLevel: 'INFO',
      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      providerBaseUrl: SERVER_URL,
      consumerVersionTags,
      providerVersionTags: process.env.GITHUB_BRANCH || gitBranch,
      providerVersion: gitHash,
      publishVerificationResult: isCI
    }

    return new Verifier(options)
      .verifyProvider()
      .then((output) => {
        console.log('Pact Verification Complete!')
        console.log(output)
      })
  })
})
