const { expect } = require('chai')

const { robotsTxt } = require('../../../src/lab/buscadores')
const { URL_ANUNCIADA: base } = require('../utils')

const producao = process.env.TEST_TYPE === 'e2e-production'

describe('/robots.txt GET', () => {
  it('responde texto puro e, fora da produção, não deixa indexar nada', async () => {
    const res = await request.get('/robots.txt').expect(200)
    expect(res.headers['content-type']).to.equal('text/plain; charset=utf-8')
    expect(res.text).to.equal(producao
      ? `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n')
  })

  it('na produção deixa indexar tudo e aponta o sitemap - @skipE2E', () => {
    expect(robotsTxt('https://serverest.dev', true)).to.equal('User-agent: *\nAllow: /\n\nSitemap: https://serverest.dev/sitemap.xml\n')
  })
})

describe('/sitemap.xml GET', () => {
  it('lista, com a URL do ambiente, a página inicial nos três idiomas e o Swagger', async () => {
    const res = await request.get('/sitemap.xml').buffer(true).expect(200)
    expect(res.headers['content-type']).to.equal('application/xml; charset=utf-8')
    expect(res.text).to.match(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n/)
    expect(res.text.endsWith('</urlset>\n')).to.equal(true)
    const enderecos = [...res.text.matchAll(/ {2}<url><loc>([^<]+)<\/loc><\/url>\n/g)].map(match => match[1])
    expect(enderecos).to.deep.equal([`${base}/`, `${base}/?lang=en`, `${base}/?lang=es`, `${base}/swagger`])
    expect(res.text.match(/<url>/g)).to.have.length(enderecos.length)
  })

  it('cada endereço do sitemap responde 200', async () => {
    for (const caminho of ['/', '/?lang=en', '/?lang=es', '/swagger']) {
      await request.get(caminho).expect(200)
    }
  })
})

describe('URL desconhecida GET', () => {
  it('continua respondendo o mesmo 405 em JSON, inclusive para o que os navegadores pedem sozinhos', async () => {
    for (const caminho of ['/manifest.json', '/robots', '/sitemap', '/apple-touch-icon.png']) {
      const { body } = await request.get(caminho).expect(405)
      expect(body, caminho).to.deep.equal({
        message: `Não é possível realizar GET em ${caminho}. Acesse ${base} para ver as rotas disponíveis e como utilizá-las.`
      })
    }
  })
})
