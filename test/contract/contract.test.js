const http = require('http')
const isCI = require('is-ci')
const { Verifier } = require('@pact-foundation/pact')

const app = require('../../src/app')
const {
  dateOneMonthAgo,
  currentGitBranch,
  currentGitHash,
  isMainBranch
} = require('./util')

describe('ServeRest - Verificação do contrato', () => {
  const PORT = 3001
  const SERVER_URL = `http://localhost:${PORT}`
  const server = http.createServer(app)

  before(() => {
    server.listen(PORT, () => console.log(`Server listening on ${SERVER_URL}`))
  })

  after(() => {
    server.close()
  })

  it('Validates the expectations of ServeRest', () => {
    const baseOptions = {
      provider: 'ServeRest - API Rest',
      logLevel: 'INFO',
      verbose: false,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      providerBaseUrl: SERVER_URL,
      providerVersionBranch: process.env.GIT_BRANCH ?? currentGitBranch,
      providerVersion: process.env.GIT_COMMIT ?? currentGitHash,
      publishVerificationResult: isCI
    }

    // Para builds que foram 'trigados' por webhook de 'mudança de conteúdo de contrato' é preciso verificar apenas o contrato (pact) alterado.
    // A URL (env PACT_URL) será passada pelo webhook para o job de CI.
    // https://docs.pact.io/provider/recommended_configurtion/#verification-triggered-by-pact-change
    const pactChangedOptions = {
      pactUrls: [process.env.PACT_URL]
    }

    const fetchPactsDynamicallyOptions = {
      pactBrokerUrl: 'https://paulogoncalves.pactflow.io',
      consumerVersionSelectors: [
        {
          mainBranch: true
        },
        {
          matchingBranch: true
        },
        {
          deployed: true
        }
      ],
      ...(isMainBranch ? { includeWipPactsSince: dateOneMonthAgo() } : {}),
      enablePending: isMainBranch
    }

    return new Verifier({
      ...baseOptions,
      ...(process.env.PACT_URL ? pactChangedOptions : fetchPactsDynamicallyOptions)
    })
      .verifyProvider()
      .then((output) => {
        console.log('Pact Verification Complete!')
        console.log(output)
      })
  })
})
