const { expect } = require('chai')

describe('/swagger GET', () => {
  it('A página do Swagger está retornando status code 200 - #202', async () => {
    await request.get('/swagger').expect(200)
  })
  it('retorna 200 quando lang é válido', async () => {
    await request.get('/swagger').query({ lang: 'en' }).expect(200)
  })
  it('inclui o plugin do painel de fluxo no script da página', async () => {
    const { text } = await request.get('/swagger').expect(200)
    expect(text).to.include('serverestFlowPanelPlugin')
  })
  it('redireciona /swagger/ e /SWAGGER/ para /swagger mantendo a query', async () => {
    const casos = {
      '/swagger/': '/swagger',
      '/swagger/?lang=en': '/swagger?lang=en',
      '/SWAGGER/': '/swagger'
    }
    for (const [origem, destino] of Object.entries(casos)) {
      const res = await request.get(origem).expect(302)
      expect(res.headers.location, origem).to.equal(destino)
    }
  })
})

describe('/swagger-ui-init.js GET', () => {
  it('registra o plugin padrão DownloadUrl e o plugin do painel de fluxo', async () => {
    await request.get('/swagger').expect(200)
    const { text } = await request.get('/swagger-ui-init.js').expect(200)
    expect(text).to.include('window.SwaggerUIBundle.plugins.DownloadUrl.apply')
    expect(text).to.include('serverestFlowPanelPlugin')
  })
})

describe('/swagger.json GET', () => {
  it('retorna 200 e JSON do spec com lang pt-BR por padrão', async () => {
    const { body } = await request.get('/swagger.json').expect(200)
    expect(body).to.have.property('openapi')
    expect(body).to.have.property('info')
  })
  it('retorna 200 e JSON do spec com lang en quando lang=en', async () => {
    const { body } = await request.get('/swagger.json').query({ lang: 'en' }).expect(200)
    expect(body).to.have.property('openapi')
  })
  it('retorna 200 e JSON do spec com lang es quando lang=es', async () => {
    const { body } = await request.get('/swagger.json').query({ lang: 'es' }).expect(200)
    expect(body).to.have.property('openapi')
  })
  it('retorna 200 com spec pt-BR quando lang é inválido (cobre branch fallback)', async () => {
    const { body } = await request.get('/swagger.json').query({ lang: 'fr' }).expect(200)
    expect(body).to.have.property('openapi')
  })
})

describe('/swagger-sw.js GET', () => {
  it('retorna 200 e JavaScript do service worker', async () => {
    const res = await request.get('/swagger-sw.js').expect(200)
    expect(res.headers['content-type']).to.include('javascript')
    expect(res.text).to.be.a('string')
    expect(res.text).to.include('CACHE_NAME')
  })
})
