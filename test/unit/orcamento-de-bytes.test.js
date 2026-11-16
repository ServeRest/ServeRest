const { EventEmitter } = require('events')
const { expect } = require('chai')
const { RateLimiterMemory } = require('rate-limiter-flexible')

const { criarLimitador, criarOrcamentoDeBytes } = require('../../src/middlewares/rate-limiter')

// O middleware fica desligado no localhost e nos testes; aqui a mesma lógica roda com um orçamento de
// 1.000 bytes e limites de requisição próprios, para não depender dos valores de produção.
function resposta (tamanho) {
  const res = new EventEmitter()
  res.getHeader = nome => (nome === 'Content-Length' && tamanho !== undefined ? String(tamanho) : undefined)
  return res
}

function limitador ({ bytes = 1000, segundos = 3600, requisicoes = 1000 } = {}) {
  return criarLimitador({
    global: new RateLimiterMemory({ points: requisicoes * 3, duration: 30 }),
    porIp: new RateLimiterMemory({ points: requisicoes, duration: 30 }),
    orcamento: criarOrcamentoDeBytes({ bytes, segundos })
  })
}

// O Node emite close ao fim de toda resposta, completa ou interrompida pelo cliente.
async function pedir (permitir, { method = 'GET', path = '/usuarios', ip = '10.0.0.1', tamanho } = {}) {
  const res = resposta(tamanho)
  const permitido = await permitir({ method, path, ip }, res)
  res.emit('close')
  return permitido
}

describe('Orçamento de bytes por IP', () => {
  it('deixa passar até o orçamento e barra depois que um cliente o consome', async () => {
    const permitir = limitador()
    expect(await pedir(permitir, { tamanho: 600 })).to.equal(true)
    expect(await pedir(permitir, { tamanho: 600 })).to.equal(true)
    expect(await pedir(permitir, { tamanho: 10 })).to.equal(false)
  })

  it('conta cada cliente separado', async () => {
    const permitir = limitador()
    await pedir(permitir, { tamanho: 1000 })
    expect(await pedir(permitir, { ip: '10.0.0.2', tamanho: 10 })).to.equal(true)
    expect(await pedir(permitir, { tamanho: 10 })).to.equal(false)
  })

  it('conta só as rotas da API e barra só elas', async () => {
    const permitir = limitador()
    for (const path of ['/', '/swagger/swagger-ui-bundle.js', '/swagger.json', '/loginx', '/lab/assets/app.js']) {
      expect(await pedir(permitir, { path, tamanho: 5000 }), path).to.equal(true)
    }
    for (const path of ['/login', '/usuarios/abc', '/produtos', '/carrinhos/concluir-compra']) {
      expect(await pedir(permitir, { path, tamanho: 300 }), path).to.equal(true)
    }
    expect(await pedir(permitir, { path: '/produtos', tamanho: 10 })).to.equal(false)
    expect(await pedir(permitir, { path: '/swagger.json', tamanho: 10 })).to.equal(true)
  })

  it('conta a rota com outra caixa, que o Express atende igual', async () => {
    const permitir = limitador()
    await pedir(permitir, { path: '/USUARIOS', tamanho: 1000 })
    expect(await pedir(permitir, { path: '/Produtos', tamanho: 10 })).to.equal(false)
  })

  it('não conta HEAD, que não manda corpo', async () => {
    const permitir = limitador()
    for (let i = 0; i < 3; i++) expect(await pedir(permitir, { method: 'HEAD', tamanho: 1000 })).to.equal(true)
    expect(await pedir(permitir, { tamanho: 10 })).to.equal(true)
  })

  it('ignora resposta sem Content-Length', async () => {
    const permitir = limitador()
    for (let i = 0; i < 5; i++) expect(await pedir(permitir, {})).to.equal(true)
  })

  it('libera o cliente quando a janela acaba', async () => {
    const permitir = limitador({ segundos: 1 })
    await pedir(permitir, { tamanho: 1000 })
    expect(await pedir(permitir, { tamanho: 10 })).to.equal(false)
    await new Promise(resolve => setTimeout(resolve, 1100))
    expect(await pedir(permitir, { tamanho: 10 })).to.equal(true)
  })

  it('segue barrando pelo número de requisições, como antes', async () => {
    const permitir = limitador({ requisicoes: 2 })
    expect(await pedir(permitir, { path: '/swagger.json' })).to.equal(true)
    expect(await pedir(permitir, { path: '/swagger.json' })).to.equal(true)
    expect(await pedir(permitir, { path: '/swagger.json' })).to.equal(false)
  })

  it('não gasta a cota de requisições de quem já esgotou o orçamento', async () => {
    const porIp = new RateLimiterMemory({ points: 100, duration: 30 })
    const permitir = criarLimitador({ global: new RateLimiterMemory({ points: 300, duration: 30 }), porIp, orcamento: criarOrcamentoDeBytes({ bytes: 1000 }) })
    await pedir(permitir, { tamanho: 1000 })
    const antes = (await porIp.get('10.0.0.1')).consumedPoints
    expect(await pedir(permitir, { tamanho: 10 })).to.equal(false)
    expect((await porIp.get('10.0.0.1')).consumedPoints).to.equal(antes)
  })
})
