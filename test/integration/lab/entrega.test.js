const { expect } = require('chai')
const express = require('express')
const fs = require('fs')
const { copyFileSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } = fs
const http = require('http')
const sinon = require('sinon')
const { Readable } = require('stream')
const supertest = require('supertest')
const { tmpdir } = require('os')
const { join } = require('path')
const zlib = require('zlib')

const utils = require('../utils')
const { version } = require('../../../package.json')
const { paginaPronta } = require('../../../src/lab')
const { servirPrecomprimidos } = require('../../../src/lab/entrega')
const { ARQUIVOS_GRANDES, pastaDoSwaggerUi, pastaPrecomprimida, precomprimir } = require('../../../src/swagger/arquivos-grandes')

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

// Duas pastas temporárias, como no build: a dos arquivos, que o express.static serve, e a dos
// pré-comprimidos.
const pastasTemporarias = []
function pastasDeTeste (arquivos = ARQUIVOS_GRANDES, { comprimir = true } = {}) {
  const origem = mkdtempSync(join(tmpdir(), 'serverest-swagger-ui-'))
  const destino = mkdtempSync(join(tmpdir(), 'serverest-precomprimido-'))
  pastasTemporarias.push(origem, destino)
  for (const arquivo of arquivos) copyFileSync(join(pastaDoSwaggerUi, arquivo), join(origem, arquivo))
  if (comprimir) precomprimir(origem, destino, arquivos)
  return { origem, destino }
}
after(() => pastasTemporarias.forEach(pasta => rmSync(pasta, { recursive: true, force: true })))

// O express.static faz o papel do swagger-ui-express, que serve a pasta do mesmo jeito.
function appDoSwaggerUi ({ origem, destino }, arquivos = ARQUIVOS_GRANDES) {
  return express().use(servirPrecomprimidos(destino, arquivos), express.static(origem))
}

describe('Arquivos grandes do Swagger UI pré-comprimidos no build', () => {
  let pastas
  before(function () {
    this.timeout(60000)
    pastas = pastasDeTeste()
  })
  const servidor = servidorLocal(() => appDoSwaggerUi(pastas))
  const tipos = { '.js': /^application\/javascript; charset=utf-8$/i, '.css': /^text\/css; charset=utf-8$/i }
  const arquivos = ARQUIVOS_GRANDES.map(arquivo => ['/' + arquivo, tipos[arquivo.slice(arquivo.lastIndexOf('.'))]])
  const original = caminho => readFileSync(join(pastas.origem, caminho))
  const comprimido = caminho => readFileSync(join(pastas.destino, caminho))

  it('manda o .br a quem aceita br, com Vary e o Cache-Control de hoje - @skipE2E', async () => {
    for (const [caminho, tipo] of arquivos) {
      const br = await servidor.pedir(caminho, { 'accept-encoding': 'gzip, deflate, br, zstd' })
      expect(br.status, caminho).to.equal(200)
      expect(br.headers['content-encoding'], caminho).to.equal('br')
      expect(br.headers.vary, caminho).to.equal('Accept-Encoding')
      expect(br.headers['content-type'], caminho).to.match(tipo)
      expect(br.headers['cache-control'], caminho).to.equal('public, max-age=0')
      expect(br.headers.etag, caminho).to.match(/^W\/"/)
      expect(br.headers, caminho).to.have.property('last-modified')
      expect(br.corpo.equals(comprimido(caminho + '.br')), caminho).to.equal(true)
      expect(zlib.brotliDecompressSync(br.corpo).equals(original(caminho)), caminho).to.equal(true)
      expect(br.corpo.length, caminho).to.be.lessThan(original(caminho).length / 3)
    }
  })

  it('manda o .gz a quem aceita gzip e não br - @skipE2E', async () => {
    for (const [caminho, tipo] of arquivos) {
      const gzip = await servidor.pedir(caminho, { 'accept-encoding': 'gzip, deflate' })
      expect(gzip.status, caminho).to.equal(200)
      expect(gzip.headers['content-encoding'], caminho).to.equal('gzip')
      expect(gzip.headers.vary, caminho).to.equal('Accept-Encoding')
      expect(gzip.headers['content-type'], caminho).to.match(tipo)
      expect(zlib.gunzipSync(gzip.corpo).equals(original(caminho)), caminho).to.equal(true)
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
        expect(cru.corpo.equals(original(caminho)), caminho).to.equal(true)
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
    expect(Number(res.headers['content-length'])).to.equal(comprimido('swagger-ui.css.br').length)
    expect(res.corpo.length).to.equal(0)
  })

  it('atende Range no arquivo comprimido - @skipE2E', async () => {
    const br = comprimido('swagger-ui-bundle.js.br')
    const res = await servidor.pedir('/swagger-ui-bundle.js', { 'accept-encoding': 'br', range: 'bytes=0-99' })
    expect(res.status).to.equal(206)
    expect(res.headers['content-encoding']).to.equal('br')
    expect(res.headers['content-range']).to.equal(`bytes 0-99/${br.length}`)
    expect(res.corpo.equals(br.subarray(0, 100))).to.equal(true)
  })

  it('responde 416 a um Range além do comprimido e 412 a um If-Match de outro arquivo, sem corpo e sem Content-Encoding - @skipE2E', async () => {
    const br = comprimido('swagger-ui.css.br')
    const alem = await servidor.pedir('/swagger-ui.css', { 'accept-encoding': 'br', range: `bytes=${br.length + 10}-` })
    expect(alem.status).to.equal(416)
    expect(alem.headers['content-range']).to.equal(`bytes */${br.length}`)
    expect(alem.headers).to.not.have.property('content-encoding')
    expect(alem.headers).to.not.have.property('content-type')
    expect(alem.corpo.length).to.equal(0)
    const outro = await servidor.pedir('/swagger-ui.css', { 'accept-encoding': 'br', 'if-match': '"outro"' })
    expect(outro.status).to.equal(412)
    expect(outro.headers).to.not.have.property('content-encoding')
    expect(outro.corpo.length).to.equal(0)
  })

  it('não serve o .br como arquivo - @skipE2E', async () => {
    for (const [caminho] of arquivos) {
      for (const extensao of ['.br', '.gz']) {
        const res = await servidor.pedir(caminho + extensao, { 'accept-encoding': 'br' })
        expect(res.status, caminho + extensao).to.equal(404)
      }
    }
  })

  it('um POST num dos arquivos segue para o express.static, como antes - @skipE2E', async () => {
    const res = await servidor.pedir('/swagger-ui.css', { 'accept-encoding': 'br' }, 'POST')
    expect(res.status).to.equal(404)
    expect(res.headers).to.not.have.property('content-encoding')
  })
})

describe('servirPrecomprimidos sem todos os arquivos do build', () => {
  it('sem nenhum pré-comprimido o arquivo sai exatamente como antes, sem Vary, e um nome que não existe não quebra - @skipE2E', async () => {
    const pastas = pastasDeTeste(['swagger-ui.css'], { comprimir: false })
    const app = appDoSwaggerUi(pastas, ['swagger-ui.css', 'arquivo-renomeado.js'])
    const res = await supertest(app).get('/swagger-ui.css').set('Accept-Encoding', 'br').expect(200)
    expect(res.headers).to.not.have.property('content-encoding')
    expect(res.headers).to.not.have.property('vary')
    await supertest(app).get('/arquivo-renomeado.js').set('Accept-Encoding', 'br').expect(404)
  })

  it('sem o .br manda o .gz a quem aceita gzip, e o original a quem só aceita br - @skipE2E', async () => {
    const pastas = pastasDeTeste(['swagger-ui.css'])
    unlinkSync(join(pastas.destino, 'swagger-ui.css.br'))
    const app = appDoSwaggerUi(pastas, ['swagger-ui.css'])
    const gzip = await supertest(app).get('/swagger-ui.css').set('Accept-Encoding', 'br, gzip').expect(200)
    expect(gzip.headers['content-encoding']).to.equal('gzip')
    const cru = await supertest(app).get('/swagger-ui.css').set('Accept-Encoding', 'br').expect(200)
    expect(cru.headers).to.not.have.property('content-encoding')
    expect(cru.headers.vary).to.equal('Accept-Encoding')
  })

  it('serve sem compressão quando o .br some depois de o servidor subir - @skipE2E', async () => {
    const pastas = pastasDeTeste(['swagger-ui.css'])
    const app = appDoSwaggerUi(pastas, ['swagger-ui.css'])
    unlinkSync(join(pastas.destino, 'swagger-ui.css.br'))
    const res = await supertest(app).get('/swagger-ui.css').set('Accept-Encoding', 'br').expect(200)
    expect(res.headers).to.not.have.property('content-encoding')
    expect(res.headers['content-type']).to.equal('text/css; charset=UTF-8')
    expect(res.text).to.equal(readFileSync(join(pastas.origem, 'swagger-ui.css'), 'utf8'))
  })

  it('serve sem compressão, sem chegar ao tratamento de erro, quando a pasta dos pré-comprimidos vira arquivo (ENOTDIR) - @skipE2E', async () => {
    const pastas = pastasDeTeste(['swagger-ui.css'])
    let erros = 0
    const app = appDoSwaggerUi(pastas, ['swagger-ui.css'])
      .use((erro, req, res, next) => {
        erros++
        next(erro)
      })
    rmSync(pastas.destino, { recursive: true })
    writeFileSync(pastas.destino, '')
    const res = await supertest(app).get('/swagger-ui.css').set('Accept-Encoding', 'br').expect(200)
    expect(res.headers).to.not.have.property('content-encoding')
    expect(res.headers['content-type']).to.equal('text/css; charset=UTF-8')
    expect(res.text).to.equal(readFileSync(join(pastas.origem, 'swagger-ui.css'), 'utf8'))
    expect(erros).to.equal(0)
  })

  it('serve sem compressão, sem chegar ao tratamento de erro, um erro do disco antes dos headers - @skipE2E', async () => {
    const pastas = pastasDeTeste(['swagger-ui.css'])
    let erros = 0
    const app = express()
      .use((req, res, next) => {
        // Um erro de leitura do disco antes da resposta começar, que o send entrega como 500.
        res.sendFile = (caminho, opcoes, callback) => callback(Object.assign(new Error('EIO'), { code: 'EIO', status: 500 }))
        next()
      })
      .use(servirPrecomprimidos(pastas.destino, ['swagger-ui.css']), express.static(pastas.origem))
      .use((erro, req, res, next) => {
        erros++
        next(erro)
      })
    const res = await supertest(app).get('/swagger-ui.css').set('Accept-Encoding', 'br').expect(200)
    expect(res.headers).to.not.have.property('content-encoding')
    expect(res.text).to.equal(readFileSync(join(pastas.origem, 'swagger-ui.css'), 'utf8'))
    expect(erros).to.equal(0)
  })

  describe('erro de leitura do disco depois dos headers', () => {
    afterEach(() => sinon.restore())

    it('fecha a conexão sem lançar exceção, sem seguir adiante e com uma linha de log - @skipE2E', async () => {
      const { origem, destino } = pastasDeTeste([], { comprimir: false })
      writeFileSync(join(origem, 'grande.css'), '')
      writeFileSync(join(destino, 'grande.css.br'), Buffer.alloc(1024 * 1024))
      // O primeiro pedaço sai, os headers vão junto, e o disco falha no seguinte, como um EIO real.
      const createReadStream = fs.createReadStream
      sinon.stub(fs, 'createReadStream').callsFake((caminho, opcoes) => {
        if (!caminho.endsWith('grande.css.br')) return createReadStream(caminho, opcoes)
        let lidos = 0
        return new Readable({
          read () {
            if (lidos++ === 0) return this.push(Buffer.alloc(1024))
            setImmediate(() => this.destroy(Object.assign(new Error('EIO: i/o error, read'), { code: 'EIO', syscall: 'read' })))
          }
        })
      })
      let seguiu = 0
      let erros = 0
      let respostaDoServidor
      let fimDoSendFile
      const sendFileTerminou = new Promise(resolve => { fimDoSendFile = resolve })
      const app = express()
        .use((req, res, next) => {
          respostaDoServidor = res
          const sendFile = res.sendFile
          // O callback do middleware roda antes de a promessa resolver: uma exceção dele chega ao mocha
          // como não capturada e reprova o teste.
          res.sendFile = (caminho, opcoes, callback) => sendFile.call(res, caminho, opcoes, erro => {
            callback(erro)
            fimDoSendFile(erro)
          })
          next()
        })
        .use(servirPrecomprimidos(destino, ['grande.css']), (req, res, next) => {
          seguiu++
          next()
        })
        .use((erro, req, res, next) => {
          erros++
          next(erro)
        })
      const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
      const linhas = []
      const consoleLog = console.log
      sinon.stub(console, 'log').callsFake((...args) => {
        if (args[0] && args[0].level) linhas.push(args[0])
        else consoleLog(...args)
      })
      const respostaDoCliente = new Promise(resolve => {
        http.get({ port: servidor.address().port, path: '/grande.css', headers: { 'accept-encoding': 'br' }, agent: false }, res => {
          res.on('error', () => {}).on('close', () => resolve(res)).resume()
        }).on('error', () => {})
      })
      const erro = await sendFileTerminou
      const cliente = await respostaDoCliente
      console.log.restore()
      await new Promise(resolve => servidor.close(resolve))
      expect(erro.code).to.equal('EIO')
      expect(cliente.statusCode).to.equal(200)
      expect(cliente.headers['content-encoding']).to.equal('br')
      expect(cliente.complete).to.equal(false)
      expect(respostaDoServidor.destroyed).to.equal(true)
      expect(seguiu).to.equal(0)
      expect(erros).to.equal(0)
      expect(linhas).to.have.lengthOf(1)
      expect(linhas[0].level).to.equal('warn')
      expect(linhas[0].message).to.include('/grande.css').and.include('EIO')
    })
  })

  it('não segue adiante nem trata como erro quando a conexão cai no meio da resposta - @skipE2E', async () => {
    const { origem, destino } = pastasDeTeste([], { comprimir: false })
    writeFileSync(join(origem, 'grande.css'), '')
    writeFileSync(join(destino, 'grande.css.br'), Buffer.alloc(1024 * 1024))
    let seguiu = 0
    let erros = 0
    let fimDoSendFile
    const sendFileTerminou = new Promise(resolve => { fimDoSendFile = resolve })
    const app = express()
      .use((req, res, next) => {
        const sendFile = res.sendFile
        res.sendFile = (caminho, opcoes, callback) => sendFile.call(res, caminho, opcoes, erro => {
          callback(erro)
          fimDoSendFile(erro)
        })
        // Derruba a conexão logo depois do primeiro pedaço do corpo, como quem desiste no meio.
        const escrever = res.write
        res.write = function (...args) {
          res.write = escrever
          const resultado = escrever.apply(this, args)
          res.socket.destroy()
          return resultado
        }
        next()
      })
      .use(servirPrecomprimidos(destino, ['grande.css']), (req, res, next) => {
        seguiu++
        next()
      })
      .use((erro, req, res, next) => {
        erros++
        next(erro)
      })
    const servidor = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)) })
    http.get({ port: servidor.address().port, path: '/grande.css', headers: { 'accept-encoding': 'br' }, agent: false }, res => {
      res.on('error', () => {}).resume()
    }).on('error', () => {})
    const erro = await sendFileTerminou
    await new Promise(resolve => servidor.close(resolve))
    expect(erro.code).to.equal('ECONNABORTED')
    expect(seguiu).to.equal(0)
    expect(erros).to.equal(0)
  })
})

describe('Pasta dos pré-comprimidos do Swagger UI', () => {
  const VARIAVEL = 'SWAGGER_UI_PRECOMPRESSED_DIR'
  let original
  beforeEach(() => { original = process.env[VARIAVEL] })
  afterEach(() => {
    if (original === undefined) delete process.env[VARIAVEL]
    else process.env[VARIAVEL] = original
  })

  it('sem a variável é a do build, com a versão do swagger-ui-dist que o app serve - @skipE2E', () => {
    delete process.env[VARIAVEL]
    const { version: versaoDoSwaggerUi } = JSON.parse(readFileSync(join(pastaDoSwaggerUi, 'package.json')))
    expect(pastaPrecomprimida()).to.equal(join(__dirname, '../../../swagger-ui-precomprimido', versaoDoSwaggerUi))
  })

  it('com a variável é a pasta que ela indica - @skipE2E', () => {
    process.env[VARIAVEL] = join(tmpdir(), 'outra-pasta')
    expect(pastaPrecomprimida()).to.equal(join(tmpdir(), 'outra-pasta'))
  })
})

// O app dos testes procura os pré-comprimidos numa pasta temporária que não existe
// (test/integration/utils/global.js), como um clone sem o build do Dockerfile.gcloud.
describe('Arquivos grandes do Swagger UI no app, sem os pré-comprimidos', () => {
  const servidor = servidorLocal()

  it('saem pelo express.static exatamente como antes, sem Vary - @skipE2E', async () => {
    for (const arquivo of ARQUIVOS_GRANDES) {
      const res = await servidor.pedir('/' + arquivo, { 'accept-encoding': 'gzip, deflate, br' })
      expect(res.status, arquivo).to.equal(200)
      expect(res.headers, arquivo).to.not.have.property('content-encoding')
      expect(res.headers, arquivo).to.not.have.property('vary')
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

describe('Arquivos grandes do Swagger UI no app, com os pré-comprimidos do build', () => {
  const appCacheKey = require.resolve('../../../src/app')
  const VARIAVEL = 'SWAGGER_UI_PRECOMPRESSED_DIR'
  let destino
  let pastaOriginal
  let appOriginal

  // Grava os pré-comprimidos numa pasta temporária, como o build, e carrega um app novo apontado para
  // ela, que os procura ao subir. Depois volta a variável e o app de antes, para os outros testes.
  before(function () {
    this.timeout(60000)
    destino = pastasDeTeste().destino
    pastaOriginal = process.env[VARIAVEL]
    process.env[VARIAVEL] = destino
    appOriginal = require.cache[appCacheKey]
    delete require.cache[appCacheKey]
  })
  after(() => {
    if (pastaOriginal === undefined) delete process.env[VARIAVEL]
    else process.env[VARIAVEL] = pastaOriginal
    if (appOriginal) require.cache[appCacheKey] = appOriginal
    else delete require.cache[appCacheKey]
  })
  const servidor = servidorLocal()
  const br = () => readFileSync(join(destino, 'swagger-ui-bundle.js.br'))

  it('manda o .br do bundle a quem aceita, e o original com Vary a quem não aceita - @skipE2E', async () => {
    const comprimido = await servidor.pedir('/swagger-ui-bundle.js', { 'accept-encoding': 'br, gzip' })
    expect(comprimido.status).to.equal(200)
    expect(comprimido.headers['content-encoding']).to.equal('br')
    expect(comprimido.corpo.equals(br())).to.equal(true)
    const cru = await servidor.pedir('/swagger-ui-bundle.js')
    expect(cru.headers).to.not.have.property('content-encoding')
    expect(cru.headers.vary).to.equal('Accept-Encoding')
    expect(cru.corpo.equals(readFileSync(join(pastaDoSwaggerUi, 'swagger-ui-bundle.js')))).to.equal(true)
  })

  it('responde 416 com o Content-Range do comprimido e 412, sem Content-Encoding - @skipE2E', async () => {
    const tamanho = br().length
    const alem = await servidor.pedir('/swagger-ui-bundle.js', { 'accept-encoding': 'br', range: `bytes=${tamanho + 10}-` })
    expect(alem.status).to.equal(416)
    expect(alem.headers['content-range']).to.equal(`bytes */${tamanho}`)
    expect(alem.headers).to.not.have.property('content-encoding')
    expect(alem.corpo.length).to.equal(0)
    const outro = await servidor.pedir('/swagger-ui-bundle.js', { 'accept-encoding': 'br', 'if-match': '"outro"' })
    expect(outro.status).to.equal(412)
    expect(outro.headers).to.not.have.property('content-encoding')
    expect(outro.corpo.length).to.equal(0)
  })

  it('o .br e o .gz não são URLs: respondem como qualquer rota que não existe - @skipE2E', async () => {
    for (const arquivo of ARQUIVOS_GRANDES) {
      for (const extensao of ['.br', '.gz']) {
        const res = await servidor.pedir('/' + arquivo + extensao, { 'accept-encoding': 'br' })
        expect(res.status, arquivo + extensao).to.equal(405)
        expect(res.headers['content-type'], arquivo + extensao).to.match(/^application\/json/)
      }
    }
  })
})
