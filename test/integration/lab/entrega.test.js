const { expect } = require('chai')
const express = require('express')
const { copyFileSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } = require('fs')
const http = require('http')
const supertest = require('supertest')
const { tmpdir } = require('os')
const { join } = require('path')
const zlib = require('zlib')

const utils = require('../utils')
const { version } = require('../../../package.json')
const { paginaPronta } = require('../../../src/lab')
const { servirPrecomprimidos } = require('../../../src/lab/entrega')
const { ARQUIVOS_GRANDES, pastaDoSwaggerUi, precomprimir } = require('../../../src/swagger/arquivos-grandes')

// A API não muda com o cache e a compressão da página: nenhum header a mais, nem ETag nem Content-Encoding,
// no localhost e fora dele. A lista é a de antes do cache da página, igual nos dois casos.
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
function servidorLocal (criarApp = () => require('../../../src/app')) {
  const servidor = {}
  before(done => {
    servidor.http = criarApp().listen(0, done)
  })
  after(done => {
    servidor.http.closeAllConnections()
    servidor.http.close(done)
  })
  servidor.pedir = (caminho, headers = {}, method = 'GET') => new Promise((resolve, reject) => {
    const opcoes = { port: servidor.http.address().port, path: caminho, method, headers: { connection: 'close', ...headers }, agent: false }
    http.request(opcoes, res => {
      const pedacos = []
      res.on('data', pedaco => pedacos.push(pedaco))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, corpo: Buffer.concat(pedacos) }))
    }).on('error', reject).end()
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

// Uma pasta temporária com os três arquivos e as versões que o build grava ao lado deles.
function pastaPrecomprimida (arquivos = ARQUIVOS_GRANDES) {
  const pasta = mkdtempSync(join(tmpdir(), 'serverest-swagger-ui-'))
  for (const arquivo of arquivos) copyFileSync(join(pastaDoSwaggerUi, arquivo), join(pasta, arquivo))
  precomprimir(pasta, arquivos)
  return pasta
}

describe('Arquivos grandes do Swagger UI pré-comprimidos no build', () => {
  let pasta
  before(function () {
    this.timeout(60000)
    pasta = pastaPrecomprimida()
  })
  after(() => rmSync(pasta, { recursive: true, force: true }))
  // O express.static faz o papel do swagger-ui-express, que serve a pasta do mesmo jeito; o último
  // middleware só responde o erro do send sem imprimir o stack.
  const servidor = servidorLocal(() => express()
    .use(servirPrecomprimidos(pasta, ARQUIVOS_GRANDES), express.static(pasta))
    .use((erro, req, res, next) => res.sendStatus(erro.status)))
  const tipos = { '.js': /^application\/javascript; charset=utf-8$/i, '.css': /^text\/css; charset=utf-8$/i }
  const arquivos = ARQUIVOS_GRANDES.map(arquivo => ['/' + arquivo, tipos[arquivo.slice(arquivo.lastIndexOf('.'))]])

  it('manda o .br a quem aceita br, com Vary e o Cache-Control de hoje - @skipE2E', async () => {
    for (const [caminho, tipo] of arquivos) {
      const original = readFileSync(join(pasta, caminho))
      const br = await servidor.pedir(caminho, { 'accept-encoding': 'gzip, deflate, br, zstd' })
      expect(br.status, caminho).to.equal(200)
      expect(br.headers['content-encoding'], caminho).to.equal('br')
      expect(br.headers.vary, caminho).to.equal('Accept-Encoding')
      expect(br.headers['content-type'], caminho).to.match(tipo)
      expect(br.headers['cache-control'], caminho).to.equal('public, max-age=0')
      expect(br.headers.etag, caminho).to.match(/^W\/"/)
      expect(br.headers, caminho).to.have.property('last-modified')
      expect(br.corpo.equals(readFileSync(join(pasta, caminho + '.br'))), caminho).to.equal(true)
      expect(zlib.brotliDecompressSync(br.corpo).equals(original), caminho).to.equal(true)
      expect(br.corpo.length, caminho).to.be.lessThan(original.length / 3)
    }
  })

  it('manda o .gz a quem aceita gzip e não br - @skipE2E', async () => {
    for (const [caminho, tipo] of arquivos) {
      const gzip = await servidor.pedir(caminho, { 'accept-encoding': 'gzip, deflate' })
      expect(gzip.status, caminho).to.equal(200)
      expect(gzip.headers['content-encoding'], caminho).to.equal('gzip')
      expect(gzip.headers.vary, caminho).to.equal('Accept-Encoding')
      expect(gzip.headers['content-type'], caminho).to.match(tipo)
      expect(zlib.gunzipSync(gzip.corpo).equals(readFileSync(join(pasta, caminho))), caminho).to.equal(true)
    }
  })

  it('manda o arquivo como está, pelo express.static, a quem não aceita br nem gzip - @skipE2E', async () => {
    for (const [caminho, tipo] of arquivos) {
      for (const headers of [{}, { 'accept-encoding': 'identity' }, { 'accept-encoding': 'br;q=0, gzip;q=0' }]) {
        const cru = await servidor.pedir(caminho, headers)
        expect(cru.status, caminho).to.equal(200)
        expect(cru.headers, caminho).to.not.have.property('content-encoding')
        expect(cru.headers.vary, caminho).to.equal('Accept-Encoding')
        expect(cru.headers['accept-ranges'], caminho).to.equal('bytes')
        expect(cru.headers['content-type'], caminho).to.match(tipo)
        expect(cru.corpo.equals(readFileSync(join(pasta, caminho))), caminho).to.equal(true)
      }
    }
  })

  it('responde 304 sem corpo nos dois caminhos a quem traz o ETag que recebeu - @skipE2E', async () => {
    for (const [caminho] of arquivos) {
      for (const aceita of ['br', 'gzip', 'identity']) {
        const { headers } = await servidor.pedir(caminho, { 'accept-encoding': aceita })
        const res = await servidor.pedir(caminho, { 'accept-encoding': aceita, 'if-none-match': headers.etag })
        expect(res.status, `${caminho} ${aceita}`).to.equal(304)
        expect(res.corpo.length, `${caminho} ${aceita}`).to.equal(0)
        expect(res.headers, `${caminho} ${aceita}`).to.not.have.property('content-encoding')
      }
    }
  })

  it('responde o HEAD comprimido com os headers e sem corpo - @skipE2E', async () => {
    const res = await servidor.pedir('/swagger-ui.css', { 'accept-encoding': 'br' }, 'HEAD')
    expect(res.status).to.equal(200)
    expect(res.headers['content-encoding']).to.equal('br')
    expect(Number(res.headers['content-length'])).to.equal(readFileSync(join(pasta, 'swagger-ui.css.br')).length)
    expect(res.corpo.length).to.equal(0)
  })

  it('atende Range no arquivo comprimido - @skipE2E', async () => {
    const br = readFileSync(join(pasta, 'swagger-ui-bundle.js.br'))
    const res = await servidor.pedir('/swagger-ui-bundle.js', { 'accept-encoding': 'br', range: 'bytes=0-99' })
    expect(res.status).to.equal(206)
    expect(res.headers['content-encoding']).to.equal('br')
    expect(res.headers['content-range']).to.equal(`bytes 0-99/${br.length}`)
    expect(res.corpo.equals(br.subarray(0, 100))).to.equal(true)
  })

  it('quando o comprimido não atende, o pedido segue para o express.static sem os headers dele - @skipE2E', async () => {
    const original = readFileSync(join(pasta, 'swagger-ui.css'))
    // Este trecho existe no arquivo original e não no .br, bem menor.
    const trecho = await servidor.pedir('/swagger-ui.css', { 'accept-encoding': 'br', range: 'bytes=100000-100009' })
    expect(trecho.status).to.equal(206)
    expect(trecho.headers).to.not.have.property('content-encoding')
    expect(trecho.headers['content-range']).to.equal(`bytes 100000-100009/${original.length}`)
    expect(trecho.corpo.equals(original.subarray(100000, 100010))).to.equal(true)
    const cru = await servidor.pedir('/swagger-ui.css', { 'if-match': '"outro"' })
    const comprimido = await servidor.pedir('/swagger-ui.css', { 'accept-encoding': 'br', 'if-match': '"outro"' })
    expect(comprimido.status).to.equal(412)
    expect(comprimido.headers).to.deep.equal({ ...cru.headers, date: comprimido.headers.date })
  })

  it('um POST num dos arquivos segue para o express.static, como antes - @skipE2E', async () => {
    const res = await servidor.pedir('/swagger-ui.css', { 'accept-encoding': 'br' }, 'POST')
    expect(res.status).to.equal(404)
    expect(res.headers).to.not.have.property('content-encoding')
  })
})

describe('servirPrecomprimidos sem os arquivos do build', () => {
  const pastas = []
  after(() => pastas.forEach(pasta => rmSync(pasta, { recursive: true, force: true })))

  function appSobre (pasta, arquivos) {
    pastas.push(pasta)
    return express().use(servirPrecomprimidos(pasta, arquivos), express.static(pasta))
  }

  it('não quebra com arquivo que não existe e serve sem compressão o que não foi pré-comprimido - @skipE2E', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'serverest-swagger-ui-'))
    copyFileSync(join(pastaDoSwaggerUi, 'swagger-ui.css'), join(pasta, 'swagger-ui.css'))
    const app = appSobre(pasta, ['swagger-ui.css', 'arquivo-renomeado.js'])
    const res = await supertest(app).get('/swagger-ui.css').set('Accept-Encoding', 'br').expect(200)
    expect(res.headers).to.not.have.property('content-encoding')
    expect(res.headers.vary).to.equal('Accept-Encoding')
    await supertest(app).get('/arquivo-renomeado.js').set('Accept-Encoding', 'br').expect(404)
  })

  it('serve sem compressão quando o .br some depois de o servidor subir - @skipE2E', async () => {
    const pasta = pastaPrecomprimida(['swagger-ui.css'])
    const app = appSobre(pasta, ['swagger-ui.css'])
    unlinkSync(join(pasta, 'swagger-ui.css.br'))
    const res = await supertest(app).get('/swagger-ui.css').set('Accept-Encoding', 'br').expect(200)
    expect(res.headers).to.not.have.property('content-encoding')
    expect(res.text).to.equal(readFileSync(join(pasta, 'swagger-ui.css'), 'utf8'))
  })

  it('não segue adiante quando quem pediu desiste no meio da resposta - @skipE2E', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'serverest-swagger-ui-'))
    writeFileSync(join(pasta, 'grande.css'), '')
    writeFileSync(join(pasta, 'grande.css.br'), Buffer.alloc(64 * 1024 * 1024))
    let seguiuDepoisDeEnviar = 0
    const app = express().use(servirPrecomprimidos(pasta, ['grande.css']), (req, res, next) => {
      if (res.headersSent) seguiuDepoisDeEnviar++
      next()
    })
    pastas.push(pasta)
    const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
    const fechou = new Promise(resolve => servidor.on('request', (req, res) => res.on('close', resolve)))
    await new Promise((resolve, reject) => {
      const pedido = http.get({ port: servidor.address().port, path: '/grande.css', headers: { 'accept-encoding': 'br' }, agent: false }, res => {
        res.once('data', () => { pedido.destroy(); resolve() })
      }).on('error', reject)
    })
    await fechou
    await new Promise(resolve => setTimeout(resolve, 50))
    servidor.closeAllConnections()
    await new Promise(resolve => servidor.close(resolve))
    expect(seguiuDepoisDeEnviar).to.equal(0)
  })
})

describe('Arquivos grandes do Swagger UI no app', () => {
  const servidor = servidorLocal()

  it('saem pelo express.static com Vary a quem não aceita compressão - @skipE2E', async () => {
    for (const arquivo of ARQUIVOS_GRANDES) {
      const res = await servidor.pedir('/' + arquivo)
      expect(res.status, arquivo).to.equal(200)
      expect(res.headers, arquivo).to.not.have.property('content-encoding')
      expect(res.headers.vary, arquivo).to.equal('Accept-Encoding')
      expect(res.corpo.equals(readFileSync(join(pastaDoSwaggerUi, arquivo))), arquivo).to.equal(true)
    }
  })

  it('o /swagger-ui-init.js sai como antes, sem compressão e sem Vary - @skipE2E', async () => {
    const res = await servidor.pedir('/swagger-ui-init.js', { 'accept-encoding': 'gzip, deflate, br' })
    expect(res.status).to.equal(200)
    expect(res.headers).to.not.have.property('content-encoding')
    expect(res.headers).to.not.have.property('vary')
  })
})
