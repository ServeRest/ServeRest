const { tmpdir } = require('os')
const { join } = require('path')

// O app dos testes procura os pré-comprimidos do Swagger UI numa pasta que não existe, e não na do
// repositório: um build local do Dockerfile.gcloud não muda o que os testes veem. Quem precisa dos
// arquivos grava os seus numa pasta temporária e carrega um app novo apontado para ela.
process.env.SWAGGER_UI_PRECOMPRESSED_DIR = join(tmpdir(), `serverest-sem-precomprimido-${process.pid}`)

const app = require('../../../src/app')
const supertest = require('supertest')

const limpeza = require('./limpeza')

if (process.env.TEST_TYPE === 'integration' || process.env.TEST_TYPE === 'mutation') {
  global.request = supertest(app)
  // Só na integração: na mutação a espera da verificação se repetiria a cada mutante, e a limpeza
  // reprovaria mutantes por uma exclusão que nenhum teste confere.
  if (process.env.TEST_TYPE === 'integration') {
    limpeza.registrarCadastros(global.request)
    const [esperarTimersSemRef, falharSeSobrouTimerComRef] = require('./timers-pendentes').afterAll
    exports.mochaHooks = {
      // A limpeza faz requisições; a contagem dos timers vem depois dela. Um hook da raiz que falha faz o
      // mocha pular os seguintes, então as duas verificações rodam juntas e a falha da limpeza vem por último.
      afterAll: [
        limpeza.limparCadastros,
        esperarTimersSemRef,
        function verificarTimersELimpeza () {
          const erros = []
          for (const verificar of [falharSeSobrouTimerComRef, limpeza.relatarFalhasDaLimpeza]) {
            try {
              verificar()
            } catch (erro) {
              erros.push(erro.message)
            }
          }
          if (erros.length) throw new Error(erros.join('\n\n'))
        }
      ]
    }
  }
} else { // E2E test
  let URL

  if (process.env.TEST_TYPE === 'e2e-staging') {
    URL = 'https://staging.serverest.dev'
  } else if (process.env.TEST_TYPE === 'e2e-production') {
    URL = 'https://serverest.dev'
  } else if (process.env.TEST_TYPE === 'e2e-localhost') {
    URL = 'http://127.0.0.1:3000'
  }

  // O deploy roda o smoke na URL da revisão nova antes de ela receber tráfego. Só o smoke de produção
  // aceita a URL de fora: num outro tipo, um SERVEREST_URL esquecido no ambiente levaria a suíte inteira,
  // que cria e apaga dados, para um servidor que ela não deveria tocar.
  if (process.env.SERVEREST_URL) {
    if (process.env.TEST_TYPE !== 'e2e-production') {
      throw new Error(`SERVEREST_URL só vale com TEST_TYPE=e2e-production, não com TEST_TYPE=${process.env.TEST_TYPE}`)
    }
    URL = process.env.SERVEREST_URL
  }
  console.log(`E2E ${process.env.TEST_TYPE} em ${URL}`)

  // Só staging e produção passam pelo rate limiter; no localhost ele não roda.
  const remoto = ['e2e-staging', 'e2e-production'].includes(process.env.TEST_TYPE)
  const limitar = remoto ? require('./limite-de-requisicoes').criarLimitador() : test => test

  // Set 'monitor=true' header to all requests to avoid logging on moesif tool
  const hook = (method = 'post') => (args) =>
    limitar(supertest(URL)[method](args)
      .set('monitor', true))

  global.request = limpeza.registrarCadastros({
    post: hook('post'),
    get: hook('get'),
    head: hook('head'),
    put: hook('put'),
    del: hook('delete')
  })
  exports.mochaHooks = limpeza.mochaHooks
}
