const chai = require('chai')
const fs = require('fs')
const http = require('http')
const sinon = require('sinon')
const supertest = require('supertest')
const { Readable } = require('stream')

const app = require('../../../src/app')
const usuariosService = require('../../../src/services/usuarios-service')

// Os casos de 2026-11-07 no app real: um passo lento termina depois de o cliente receber o 408. Para não esperar os
// 5 s do connect-timeout, o teste faz o que o timer dele faz ao vencer (marca req.timedout e emite 'timeout') assim
// que o passo lento começa, e só deixa o passo terminar depois que o cliente recebeu o 408.
describe('Resposta depois do timeout - @skipE2E', () => {
  const sandbox = sinon.createSandbox()
  const { stat, createReadStream } = fs
  const LIMITE_MS = 2000

  let requisicao
  let destruir
  let servidor
  let registros

  function expirar (req) {
    req.timedout = true
    req.emit('timeout', 5000)
  }

  function adiado () {
    let resolver
    const promessa = new Promise(resolve => { resolver = resolve })
    return { promessa, resolver }
  }

  // Resolve quando o log recebe a mensagem; falha se ela não chegar dentro do limite.
  function esperarRegistro (trecho) {
    return new Promise((resolve, reject) => {
      const limite = setTimeout(() => reject(new Error(`sem registro com "${trecho}" em ${LIMITE_MS} ms`)), LIMITE_MS)
      const conferir = () => {
        const registro = registros.find(r => r?.message?.includes(trecho))
        if (!registro) return
        clearTimeout(limite)
        resolve(registro)
      }
      registros.conferir = conferir
      conferir()
    })
  }

  beforeEach(() => {
    registros = []
    sandbox.stub(console, 'log').callsFake(registro => {
      registros.push(registro)
      registros.conferir?.()
    })
    servidor = http.createServer((req, res) => {
      requisicao = req
      destruir = sandbox.spy(req.socket, 'destroy')
      app(req, res)
    })
  })

  afterEach(() => sandbox.restore())

  // O supertest fecha o servidor depois da resposta, e o Node destrói a conexão ociosa antes de a promessa resolver.
  // Só conta o que acontece depois, quando o passo lento termina.
  function soltarPassoLento (liberar) {
    destruir.resetHistory()
    liberar.resolver()
  }

  function semRegistroDeErro () {
    chai.assert.notExists(registros.find(r => r?.level === 'error'), JSON.stringify(registros))
  }

  it('Deve parar o next() atrasado sem chegar ao 405 nem lançar erro', async () => {
    const liberar = adiado()
    const passoTerminou = adiado()
    // O express.static do Swagger procura o arquivo, demora, não acha e chama next(), como em 2026-11-07.
    sandbox.stub(fs, 'stat').callsFake((caminho, ...resto) => {
      if (!caminho.endsWith('arquivo-que-demora.js')) return stat(caminho, ...resto)
      const aoTerminar = resto.pop()
      setImmediate(expirar, requisicao)
      liberar.promessa.then(() => stat(caminho, ...resto, (...argumentos) => {
        aoTerminar(...argumentos)
        passoTerminou.resolver()
      }))
    })

    const { status } = await supertest(servidor).get('/arquivo-que-demora.js')
    soltarPassoLento(liberar)
    await passoTerminou.promessa

    chai.assert.equal(status, 408)
    chai.assert.notExists(registros.find(r => r?.message?.includes('Erro depois da resposta')), JSON.stringify(registros))
    semRegistroDeErro()
    chai.assert.isFalse(destruir.called)
  })

  it('Deve registrar como aviso, com método e caminho, a rota que responde depois do 408', async () => {
    const liberar = adiado()
    sandbox.stub(usuariosService, 'getAll').callsFake(() => {
      setImmediate(expirar, requisicao)
      return liberar.promessa.then(() => [])
    })

    const { status } = await supertest(servidor).get('/usuarios?nome=lento')
    soltarPassoLento(liberar)
    const registro = await esperarRegistro('Erro depois da resposta enviada')

    chai.assert.equal(status, 408)
    chai.assert.equal(registro.level, 'warn')
    chai.assert.include(registro.message, 'GET /usuarios?nome=lento, timedout: true, ERR_HTTP_HEADERS_SENT: ')
    chai.assert.include(registro.message, 'Stack: Error')
    semRegistroDeErro()
    chai.assert.isFalse(destruir.called, 'o 408 já terminou e a conexão dele não precisa ser fechada')
  })

  it('Deve registrar como aviso o next(erro) que chega depois do 408', async () => {
    const liberar = adiado()
    sandbox.stub(usuariosService, 'getAll').callsFake(() => {
      setImmediate(expirar, requisicao)
      return liberar.promessa.then(() => { throw new Error('leitura lenta falhou') })
    })

    const { status } = await supertest(servidor).get('/usuarios')
    soltarPassoLento(liberar)
    const registro = await esperarRegistro('Erro depois da resposta enviada')

    chai.assert.equal(status, 408)
    chai.assert.equal(registro.level, 'warn')
    chai.assert.include(registro.message, 'GET /usuarios, timedout: true, Error: leitura lenta falhou, Stack: ')
    semRegistroDeErro()
    chai.assert.isFalse(destruir.called)
  })

  it('Deve registrar como erro e fechar a conexão quando a resposta falha no meio sem timeout', async () => {
    // O arquivo começa a ser enviado e a leitura falha depois dos headers.
    sandbox.stub(fs, 'createReadStream').callsFake((caminho, opcoes) => {
      if (!caminho.endsWith('swagger-ui.css')) return createReadStream(caminho, opcoes)
      let enviou = false
      return new Readable({
        read () {
          if (enviou) return
          enviou = true
          this.push('body {')
          setImmediate(() => this.destroy(new Error('leitura do disco falhou')))
        }
      })
    })

    const erro = await supertest(servidor).get('/swagger-ui.css').timeout(LIMITE_MS).then(() => null, e => e)
    const registro = await esperarRegistro('Erro depois da resposta enviada')

    chai.assert.exists(erro, 'a resposta cortada não pode chegar como completa')
    chai.assert.notEqual(erro.code, 'ECONNABORTED', 'sem fechar a conexão o cliente fica esperando até o timeout')
    chai.assert.equal(registro.level, 'error')
    chai.assert.include(registro.message, 'GET /swagger-ui.css, timedout: false, Error: leitura do disco falhou, Stack: ')
  })
})
