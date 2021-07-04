const http = require('http')
const { Verifier } = require('@pact-foundation/pact')

const app = require('../../src/app')

const isCI = process.env.CI === 'true'

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

  beforeAll(() => {
    server.listen(3001, () => {
      console.log(`Clients Service listening on ${SERVER_URL}`)
    })
  })

  afterAll(() => {
    server.close()
  })

  it('Validates the expectations of ServeRest', () => {
    const options = {
      provider: 'ServeRest - API Rest',
      logLevel: 'INFO',
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      providerBaseUrl: SERVER_URL,
      providerVersionTags: process.env.GITHUB_BRANCH || gitBranch,
      providerVersion: gitHash,
      publishVerificationResult: isCI
    }

    // https://docs.pact.io/provider/recommended_configuration/#verification-triggered-by-pact-change
    if (process.env.TRIGGERED_BY_PACT_CHANGE) {
      options.pactUrls = [process.env.PACT_URL]
    } else {
      const consumerVersionTags = process.env.CONSUMER_VERSION_TAG
        ? ['production', 'main', process.env.CONSUMER_VERSION_TAG]
        : ['production', 'main']

      options.consumerVersionTags = consumerVersionTags
      options.pactBrokerUrl = process.env.PACT_BROKER_BASE_URL
    }

    return new Verifier(options)
      .verifyProvider()
      .then((output) => {
        console.log('Pact Verification Complete!')
        console.log(output)
      })
  })
})
