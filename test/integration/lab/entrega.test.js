const { expect } = require('chai')
const express = require('express')
const { readFileSync } = require('fs')
const http = require('http')
const { join } = require('path')
const sinon = require('sinon')
const supertest = require('supertest')
const zlib = require('zlib')

const utils = require('../utils')
const { version } = require('../../../package.json')
const { paginaPronta } = require('../../../src/lab')
const { comprimirSobDemanda } = require('../../../src/lab/entrega')

// A API não muda com o cache e a compressão da página: nenhum header a mais, nem ETag nem Content-Encoding,
// no localhost e fora dele. A lista é a de antes do cache da página, igual nos dois casos, mais o X-Robots-Tag
// que tira a API dos buscadores.
const HEADERS_DA_API = [
  'access-control-allow-origin',
  'access-control-expose-headers',
  'connection',
  'content-length',
  'content-type',
  'date',
  'strict-transport-security',
  'x-content-type-options',
  'x-dns-prefetch-control',
  'x-download-options',
  'x-frame-options',
  'x-robots-tag',
  'x-serverest-stages',
  'x-xss-protection'
]

// Fora do localhost é o ENVIRONMENT de um ServeRest online; ele é lido a cada requisição.
function noAmbiente (valor) {
  let original
  before(() => {
    original = process.env.ENVIRONMENT
    if (valor === undefined) delete process.env.ENVIRONMENT
    else process.env.ENVIRONMENT = valor
  })
  after(() => {
    if (original === undefined) delete process.env.ENVIRONMENT
    else process.env.ENVIRONMENT = original
  })
}

const ambientes = [['no localhost', undefined], ['fora do localhost', 'staging.serverest.dev']]

// Os textos da página que saem comprimidos: o HTML, os arquivos de public/ e o documento que a página pede.
const textosComprimidos = [
  '/',
  '/?lang=en',
  `/lab/assets/app.js?v=${version}`,
  `/lab/assets/core.js?v=${version}`,
  `/lab/assets/lab.css?v=${version}`,
  `/lab/assets/guia.js?v=${version}`,
  '/lab/assets/img/favicon.svg',
  `/swagger.json?lang=es&v=${version}`
]

// O supertest descomprime o corpo; aqui vêm os bytes como saíram do servidor, de um app ouvindo numa porta
// livre. O app só carrega no hook, para o E2E, que pula estes testes, não subir um servidor local.
function servidorLocal () {
  const servidor = {}
  before(done => {
    servidor.http = require('../../../src/app').listen(0, done)
  })
  after(done => {
    servidor.http.closeAllConnections()
    servidor.http.close(done)
  })
  servidor.pedir = (caminho, headers = {}) => new Promise((resolve, reject) => {
    const opcoes = { port: servidor.http.address().port, path: caminho, headers: { connection: 'close', ...headers }, agent: false }
    http.get(opcoes, res => {
      const pedacos = []
      res.on('data', pedaco => pedacos.push(pedaco))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, corpo: Buffer.concat(pedacos) }))
    }).on('error', reject)
  })
  return servidor
}

describe('/ GET (resposta guardada da página inicial)', () => {
  it('leva um ETag fraco e responde 304 sem corpo a quem já tem a página', async () => {
    const primeira = await request.get('/').expect(200)
    expect(primeira.headers.etag).to.match(/^W\/"[A-Za-z0-9_-]+"$/)
    const segunda = await request.get('/').set('If-None-Match', primeira.headers.etag).expect(304)
    expect(segunda.text).to.equal('')
    expect(segunda.headers).to.not.have.property('content-length')
    expect(segunda.headers).to.not.have.property('content-type')
    expect(segunda.headers.etag).to.equal(primeira.headers.etag)
    expect(segunda.headers['cache-control']).to.equal('no-cache, max-age=0')
  })

  it('responde a página inteira a quem traz outro ETag', async () => {
    const res = await request.get('/').set('If-None-Match', 'W/"outro"').expect(200)
    expect(res.text).to.include('<html lang="pt-BR"')
  })

  it('dá a cada idioma o seu ETag', async () => {
    const etags = []
    for (const lang of ['pt-BR', 'en', 'es']) {
      const { headers } = await request.get('/').query({ lang }).expect(200)
      etags.push(headers.etag)
    }
    expect(new Set(etags).size).to.equal(3)
  })

  it('monta cada combinação de idioma e aviso de versão uma vez só - @skipE2E', () => {
    const aviso = { version: '9.9.9', url: 'https://github.com/ServeRest/ServeRest/releases/tag/v9.9.9' }
    expect(paginaPronta('en', null)).to.equal(paginaPronta('en', null))
    expect(paginaPronta('en', { ...aviso })).to.equal(paginaPronta('en', { ...aviso }))
    expect(paginaPronta('en', aviso)).to.not.equal(paginaPronta('en', null))
    expect(paginaPronta('es', null)).to.not.equal(paginaPronta('en', null))
    expect(paginaPronta('en', aviso).corpos.identity.toString()).to.include('data-notice-version="9.9.9"')
  })
})

describe('API sem ETag, sem compressão e sem header novo', () => {
  ambientes.forEach(([nome, valor]) => {
    describe(nome, () => {
      noAmbiente(valor)

      it('GET /usuarios - @skipE2E', async () => {
        const { headers } = await request.get('/usuarios').set('Accept-Encoding', 'gzip, deflate, br').expect(200)
        expect(Object.keys(headers).sort()).to.deep.equal(HEADERS_DA_API)
      })

      it('POST /login - @skipE2E', async () => {
        const { email, password } = await utils.cadastrarUsuario()
        const { headers } = await request.post('/login').set('Accept-Encoding', 'gzip, deflate, br').send({ email, password }).expect(200)
        expect(Object.keys(headers).sort()).to.deep.equal(HEADERS_DA_API)
      })
    })
  })
})

describe('Compressão dos textos da página, feita uma vez', () => {
  const servidor = servidorLocal()

  it('manda br a quem aceita br, mesmo com gzip antes no Accept-Encoding, com Vary e o tamanho comprimido - @skipE2E', async () => {
    for (const caminho of textosComprimidos) {
      const cru = await servidor.pedir(caminho)
      const br = await servidor.pedir(caminho, { 'accept-encoding': 'gzip, deflate, br, zstd' })
      expect(br.status, caminho).to.equal(200)
      expect(br.headers['content-encoding'], caminho).to.equal('br')
      expect(br.headers.vary, caminho).to.include('Accept-Encoding')
      expect(Number(br.headers['content-length']), caminho).to.equal(br.corpo.length)
      expect(br.corpo.length, caminho).to.be.lessThan(cru.corpo.length)
      expect(zlib.brotliDecompressSync(br.corpo).equals(cru.corpo), caminho).to.equal(true)
      expect(br.headers.etag, caminho).to.equal(cru.headers.etag)
    }
  })

  it('manda gzip a quem aceita gzip e não br - @skipE2E', async () => {
    for (const caminho of textosComprimidos) {
      const cru = await servidor.pedir(caminho)
      const gzip = await servidor.pedir(caminho, { 'accept-encoding': 'gzip, deflate' })
      expect(gzip.headers['content-encoding'], caminho).to.equal('gzip')
      expect(Number(gzip.headers['content-length']), caminho).to.equal(gzip.corpo.length)
      expect(zlib.gunzipSync(gzip.corpo).equals(cru.corpo), caminho).to.equal(true)
      expect(gzip.headers.etag, caminho).to.equal(cru.headers.etag)
    }
  })

  it('manda sem compressão a quem não pede nenhuma ou recusa br e gzip - @skipE2E', async () => {
    for (const caminho of textosComprimidos) {
      for (const headers of [{}, { 'accept-encoding': 'br;q=0, gzip;q=0, deflate' }]) {
        const cru = await servidor.pedir(caminho, headers)
        expect(cru.status, caminho).to.equal(200)
        expect(cru.headers, caminho).to.not.have.property('content-encoding')
        expect(cru.headers.vary, caminho).to.include('Accept-Encoding')
        expect(Number(cru.headers['content-length']), caminho).to.equal(cru.corpo.length)
      }
    }
  })

  it('responde 304 sem corpo e sem Content-Encoding a quem já tem o texto, com o ETag de qualquer codificação - @skipE2E', async () => {
    for (const caminho of textosComprimidos) {
      const { headers } = await servidor.pedir(caminho, { 'accept-encoding': 'gzip' })
      const res = await servidor.pedir(caminho, { 'accept-encoding': 'br', 'if-none-match': headers.etag })
      expect(res.status, caminho).to.equal(304)
      expect(res.corpo.length, caminho).to.equal(0)
      expect(res.headers, caminho).to.not.have.property('content-encoding')
      expect(res.headers.vary, caminho).to.include('Accept-Encoding')
    }
  })

  it('não comprime fontes nem imagens PNG, que já são comprimidas - @skipE2E', async () => {
    for (const caminho of ['/lab/assets/fonts/open-sans-latin-wght-normal.woff2', '/lab/assets/img/serverest-logo.png']) {
      const res = await servidor.pedir(caminho, { 'accept-encoding': 'gzip, deflate, br' })
      expect(res.status, caminho).to.equal(200)
      expect(res.headers, caminho).to.not.have.property('content-encoding')
    }
  })

  it('/swagger.json sem v sai como antes: sem compressão e sem ETag - @skipE2E', async () => {
    const res = await servidor.pedir('/swagger.json?lang=en', { 'accept-encoding': 'gzip, deflate, br' })
    expect(res.status).to.equal(200)
    expect(res.headers).to.not.have.property('content-encoding')
    expect(res.headers).to.not.have.property('etag')
    expect(res.headers).to.not.have.property('vary')
  })
})

describe('Textos da página servidos já prontos', () => {
  it('o /swagger.json com v traz o mesmo documento que sem v, em cada idioma', async () => {
    for (const lang of ['pt-BR', 'en', 'es', 'fr']) {
      const semV = await request.get('/swagger.json').query({ lang }).expect(200)
      const comV = await request.get('/swagger.json').query({ lang, v: version }).expect(200)
      expect(comV.headers['content-type'], lang).to.equal(semV.headers['content-type'])
      expect(comV.text, lang).to.equal(semV.text)
    }
  })

  it('serve o HEAD de um texto com os headers e sem corpo', async () => {
    const res = await request.head(`/lab/assets/app.js?v=${version}`).expect(200)
    expect(res.headers['content-type']).to.match(/javascript/)
    expect(res.headers.etag).to.match(/^W\//)
    expect(res.text).to.equal(undefined)
  })

  it('um POST num texto da pasta segue para o fim, como antes', async () => {
    await request.post(`/lab/assets/app.js?v=${version}`).expect(405)
  })
})

const UM_ANO = 'public, max-age=31536000, immutable'
const UMA_SEMANA = 'public, max-age=604800'

async function cacheDe (caminho, status = 200) {
  const { headers } = await request.get(caminho).expect(status)
  return headers['cache-control']
}

describe('Cache dos arquivos da página', () => {
  describe('fora do localhost', () => {
    noAmbiente('staging.serverest.dev')

    it('guarda por um ano, imutável, o que leva v na URL - @skipE2E', async () => {
      for (const caminho of [`/lab/assets/app.js?v=${version}`, `/lab/assets/core.js?v=${version}`, `/lab/assets/lab.css?v=${version}`, `/swagger.json?lang=en&v=${version}`]) {
        expect(await cacheDe(caminho), caminho).to.equal(UM_ANO)
      }
    })

    it('guarda por uma semana as fontes, as imagens, as bandeiras e o ícone, que não levam v - @skipE2E', async () => {
      const caminhos = [
        '/lab/assets/fonts/open-sans-latin-wght-normal.woff2',
        '/lab/assets/img/serverest-logo.png',
        '/lab/assets/img/favicon.svg',
        '/flags/flag_brazil.svg',
        '/favicon.ico'
      ]
      for (const caminho of caminhos) expect(await cacheDe(caminho), caminho).to.equal(UMA_SEMANA)
    })

    it('não guarda por um ano o v de outra versão, que pode vir de um deploy em andamento - @skipE2E', async () => {
      expect(await cacheDe('/lab/assets/app.js?v=9.9.9')).to.equal('public, max-age=0')
      expect(await cacheDe('/swagger.json?lang=en&v=9.9.9')).to.equal(undefined)
      expect(await cacheDe('/flags/flag_uk.svg?v=9.9.9')).to.equal(UMA_SEMANA)
    })

    it('mantém o de hoje no HTML, num texto sem v e no /swagger.json sem v - @skipE2E', async () => {
      expect(await cacheDe('/')).to.equal('no-cache, max-age=0')
      expect(await cacheDe('/lab/assets/app.js')).to.equal('public, max-age=0')
      expect(await cacheDe('/swagger.json?lang=en')).to.equal(undefined)
    })

    it('não guarda a resposta 405 de um arquivo que não existe - @skipE2E', async () => {
      for (const caminho of ['/lab/assets/img/nao-existe.png', '/flags/nao-existe.svg?v=1']) {
        expect(await cacheDe(caminho, 405), caminho).to.equal(undefined)
      }
    })
  })

  describe('no localhost', () => {
    noAmbiente(undefined)

    it('mantém o cache de hoje, mesmo com v na URL: uma rodada local repete a versão - @skipE2E', async () => {
      const caminhos = [
        '/lab/assets/app.js?v=x',
        '/lab/assets/img/favicon.svg',
        '/lab/assets/fonts/open-sans-latin-wght-normal.woff2',
        '/flags/flag_brazil.svg?v=x',
        '/favicon.ico'
      ]
      for (const caminho of caminhos) expect(await cacheDe(caminho), caminho).to.equal('public, max-age=0')
      expect(await cacheDe('/swagger.json?lang=en&v=x')).to.equal(undefined)
    })
  })
})

// Os três maiores arquivos do Swagger UI, que o express.static servia sem compressão.
const PASTA_DO_SWAGGER_UI = require('swagger-ui-dist/absolute-path')()
const SWAGGER_UI_GRANDES = [
  ['/swagger-ui-bundle.js', 'application/javascript; charset=UTF-8'],
  ['/swagger-ui-standalone-preset.js', 'application/javascript; charset=UTF-8'],
  ['/swagger-ui.css', 'text/css; charset=UTF-8']
]

describe('Compressão dos arquivos grandes do Swagger UI, feita no primeiro pedido', () => {
  const servidor = servidorLocal()

  it('manda br a quem aceita br, com Vary e os headers de cache do arquivo - @skipE2E', async () => {
    for (const [caminho, tipo] of SWAGGER_UI_GRANDES) {
      const cru = await servidor.pedir(caminho)
      const br = await servidor.pedir(caminho, { 'accept-encoding': 'gzip, deflate, br, zstd' })
      expect(br.status, caminho).to.equal(200)
      expect(br.headers['content-encoding'], caminho).to.equal('br')
      expect(br.headers.vary, caminho).to.include('Accept-Encoding')
      expect(br.headers['content-type'], caminho).to.equal(tipo)
      expect(br.headers['cache-control'], caminho).to.equal('public, max-age=0')
      expect(br.headers.etag, caminho).to.equal(cru.headers.etag)
      expect(br.headers['last-modified'], caminho).to.equal(cru.headers['last-modified'])
      expect(Number(br.headers['content-length']), caminho).to.equal(br.corpo.length)
      expect(br.corpo.length, caminho).to.be.lessThan(cru.corpo.length / 3)
      expect(zlib.brotliDecompressSync(br.corpo).equals(cru.corpo), caminho).to.equal(true)
    }
  })

  it('manda gzip a quem aceita gzip e não br - @skipE2E', async () => {
    for (const [caminho, tipo] of SWAGGER_UI_GRANDES) {
      const cru = await servidor.pedir(caminho)
      const gzip = await servidor.pedir(caminho, { 'accept-encoding': 'gzip, deflate' })
      expect(gzip.status, caminho).to.equal(200)
      expect(gzip.headers['content-encoding'], caminho).to.equal('gzip')
      expect(gzip.headers.vary, caminho).to.include('Accept-Encoding')
      expect(gzip.headers['content-type'], caminho).to.equal(tipo)
      expect(gzip.headers.etag, caminho).to.equal(cru.headers.etag)
      expect(zlib.gunzipSync(gzip.corpo).equals(cru.corpo), caminho).to.equal(true)
    }
  })

  it('manda o arquivo como está, pelo express.static, a quem não aceita br nem gzip - @skipE2E', async () => {
    for (const [caminho, tipo] of SWAGGER_UI_GRANDES) {
      const arquivo = readFileSync(join(PASTA_DO_SWAGGER_UI, caminho))
      for (const headers of [{}, { 'accept-encoding': 'identity' }, { 'accept-encoding': 'br;q=0, gzip;q=0' }]) {
        const cru = await servidor.pedir(caminho, headers)
        expect(cru.status, caminho).to.equal(200)
        expect(cru.headers, caminho).to.not.have.property('content-encoding')
        expect(cru.headers['accept-ranges'], caminho).to.equal('bytes')
        expect(cru.headers['content-type'], caminho).to.equal(tipo)
        expect(cru.headers['cache-control'], caminho).to.equal('public, max-age=0')
        expect(cru.corpo.equals(arquivo), caminho).to.equal(true)
      }
    }
  })

  it('responde 304 sem corpo a quem já tem o arquivo, com o ETag de qualquer codificação - @skipE2E', async () => {
    for (const [caminho] of SWAGGER_UI_GRANDES) {
      const { headers } = await servidor.pedir(caminho)
      for (const aceita of ['br', 'gzip', 'identity']) {
        const res = await servidor.pedir(caminho, { 'accept-encoding': aceita, 'if-none-match': headers.etag })
        expect(res.status, `${caminho} ${aceita}`).to.equal(304)
        expect(res.corpo.length, `${caminho} ${aceita}`).to.equal(0)
        expect(res.headers, `${caminho} ${aceita}`).to.not.have.property('content-encoding')
      }
    }
  })

  it('serve o HEAD comprimido com os headers e sem corpo - @skipE2E', async () => {
    const res = await request.head('/swagger-ui.css').set('Accept-Encoding', 'br').expect(200)
    expect(res.headers['content-encoding']).to.equal('br')
    expect(res.text).to.equal(undefined)
  })

  it('um POST num arquivo do Swagger UI segue para o fim, como antes - @skipE2E', async () => {
    await request.post('/swagger-ui.css').set('Accept-Encoding', 'br').expect(405)
  })

  it('o /swagger-ui-init.js sai como antes, sem compressão - @skipE2E', async () => {
    const res = await servidor.pedir('/swagger-ui-init.js', { 'accept-encoding': 'gzip, deflate, br' })
    expect(res.status).to.equal(200)
    expect(res.headers).to.not.have.property('content-encoding')
    expect(res.headers).to.not.have.property('vary')
  })
})

describe('comprimirSobDemanda', () => {
  function appSo (arquivo) {
    return express().use(comprimirSobDemanda(PASTA_DO_SWAGGER_UI, [arquivo]))
  }

  afterEach(() => sinon.restore())

  it('não comprime nada ao montar e comprime cada codificação uma vez só - @skipE2E', async () => {
    const brotli = sinon.spy(zlib, 'brotliCompressSync')
    const gzip = sinon.spy(zlib, 'gzipSync')
    const app = appSo('swagger-ui.css')
    expect(brotli.callCount + gzip.callCount).to.equal(0)
    const pedir = aceita => supertest(app).get('/swagger-ui.css').set('Accept-Encoding', aceita).expect(200)
    const primeiro = await pedir('br')
    const segundo = await pedir('br')
    expect(brotli.callCount).to.equal(1)
    expect(segundo.text).to.equal(primeiro.text)
    await pedir('gzip')
    await pedir('gzip')
    expect(gzip.callCount).to.equal(1)
    expect(brotli.callCount).to.equal(1)
  })

  it('não comprime para responder 304 - @skipE2E', async () => {
    const { etag } = (await request.get('/swagger-ui.css').expect(200)).headers
    const brotli = sinon.spy(zlib, 'brotliCompressSync')
    await supertest(appSo('swagger-ui.css')).get('/swagger-ui.css')
      .set('Accept-Encoding', 'br').set('If-None-Match', etag).expect(304)
    expect(brotli.callCount).to.equal(0)
  })
})
