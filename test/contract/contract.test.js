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

  const gitBranch = process.env.GITHUB_BRANCH || require('child_process')
    .execSync('git branch --show-current')
    .toString()
    .trim()

  const isDefaultBranch = gitBranch === 'trunk'

  const dateOneMonthAgo = () => {
    const data = new Date()
    data.setMonth(data.getMonth() - 1)
    return data.toISOString()
  }

  before(() => {
    server.listen(3001, () => {
      console.log(`Clients Service listening on ${SERVER_URL}`)
    })
  })

  after(() => {
    server.close()
  })

  it('Validates the expectations of ServeRest', () => {
    const options = {
      provider: 'ServeRest - API Rest',
      logLevel: 'INFO',
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      providerBaseUrl: SERVER_URL,
      providerVersionTags: gitBranch,
      providerVersion: gitHash,
      publishVerificationResult: isCI
    }

    // https://docs.pact.io/provider/recommended_configuration/#verification-triggered-by-pact-change
    if (process.env.TRIGGERED_BY_PACT_CHANGE) {
      options.pactUrls = [process.env.PACT_URL]
    } else {
      options.consumerVersionSelectors = [
        {
          tag: gitBranch,
          fallbackTag: 'main',
          latest: true
        },
        {
          tag: 'production',
          latest: true
        }
      ]
      options.pactBrokerUrl = process.env.PACT_BROKER_BASE_URL
      options.includeWipPactsSince = isDefaultBranch ? dateOneMonthAgo() : undefined
      options.enablePending = true
    }

    return new Verifier(options)
      .verifyProvider()
      .then((output) => {
        console.log('Pact Verification Complete!')
        console.log(output)
      })
  })
})
