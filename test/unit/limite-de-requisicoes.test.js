const http = require('http')
const chai = require('chai')
const supertest = require('supertest')

const { criarLimitador, INTERVALO_MS, JANELA_MS } = require('../integration/utils/limite-de-requisicoes')

describe('Limite de requisições do E2E remoto', () => {
  let servidor
  let url
  let recebidas
  let status
  let esperas
  let relogio

  before(done => {
    servidor = http.createServer((req, res) => {
      let corpo = ''
      req.on('data', parte => { corpo += parte })
      req.on('end', () => {
        recebidas.push({ metodo: req.method, url: req.url, authorization: req.headers.authorization, corpo })
        const resposta = status[Math.min(recebidas.length, status.length) - 1]
        if (resposta === 'derrubar') return req.socket.destroy()
        res.writeHead(resposta, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ tentativa: recebidas.length }))
      })
    })
    servidor.listen(0, '127.0.0.1', () => {
      url = `http://127.0.0.1:${servidor.address().port}`
      done()
    })
  })

  after(done => {
    servidor.closeAllConnections()
    servidor.close(done)
  })

  beforeEach(() => {
    recebidas = []
    esperas = []
    relogio = 1000
  })

  // Relógio controlado e esperas instantâneas que só registram quanto seria esperado.
  const opcoes = {
    agora: () => relogio,
    esperar: ms => {
      esperas.push(ms)
      return Promise.resolve()
    }
  }
  const limitador = () => criarLimitador(opcoes)

  it('espaça em um intervalo as requisições que pedem a vez juntas', async () => {
    status = [200]
    const limitar = limitador()

    await Promise.all([1, 2, 3].map(() => limitar(supertest(url).get('/rota')).expect(200)))

    chai.expect(esperas).to.deep.equal([0, INTERVALO_MS, 2 * INTERVALO_MS])
    chai.expect(INTERVALO_MS).to.equal(120)
    chai.expect(recebidas).to.have.length(3)
  })

  it('não espera quando o intervalo desde o último envio já passou', async () => {
    status = [200]
    const limitar = limitador()

    await limitar(supertest(url).get('/rota')).expect(200)
    relogio += INTERVALO_MS
    await limitar(supertest(url).get('/rota')).expect(200)

    chai.expect(esperas).to.deep.equal([0, 0])
  })

  it('reenvia a mesma requisição depois da janela quando recebe 429', async () => {
    status = [429, 429, 201]
    const limitar = limitador()

    const { body } = await limitar(supertest(url).post('/rota'))
      .query({ pagina: 1 })
      .set('authorization', 'token')
      .send({ nome: 'produto' })
      .expect(201)

    chai.expect(body).to.deep.equal({ tentativa: 3 })
    const enviada = { metodo: 'POST', url: '/rota?pagina=1', authorization: 'token', corpo: '{"nome":"produto"}' }
    chai.expect(recebidas).to.deep.equal([enviada, enviada, enviada])
    chai.expect(esperas).to.deep.equal([0, JANELA_MS, INTERVALO_MS, JANELA_MS, 2 * INTERVALO_MS])
  })

  it('desiste depois de duas novas tentativas e deixa o 429 chegar à asserção', async () => {
    status = [429]
    const limitar = limitador()

    const erro = await limitar(supertest(url).get('/rota')).expect(200).then(() => null, erro => erro)

    chai.expect(erro.message).to.equal('expected 200 "OK", got 429 "Too Many Requests"')
    chai.expect(recebidas).to.have.length(3)
  })

  it('não reenvia outros erros, nem os que o superagent repetiria por padrão', async () => {
    status = [503]
    const limitar = limitador()

    await limitar(supertest(url).get('/rota')).expect(503)

    chai.expect(recebidas).to.have.length(1)
    chai.expect(esperas).to.deep.equal([0])
  })

  it('mostra a falha de rede do reenvio em vez de deixar o teste parado', async () => {
    status = [429, 'derrubar']
    const limitar = limitador()

    const erro = await limitar(supertest(url).get('/rota')).expect(200).then(() => null, erro => erro)

    chai.expect(erro.message).to.equal('socket hang up')
    chai.expect(recebidas).to.have.length(2)
  })
})
