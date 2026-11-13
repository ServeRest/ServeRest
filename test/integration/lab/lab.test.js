const { expect } = require('chai')
const { createHash } = require('crypto')

const ptBr = require('../../../src/swagger/translations/pt-BR')
const en = require('../../../src/swagger/translations/en')
const es = require('../../../src/swagger/translations/es')

const tiposDosArquivos = {
  'legacy-links.js': /javascript/,
  'core.js': /javascript/,
  'app.js': /javascript/,
  'lab.css': /text\/css/
}

function blocoDeTextos (html) {
  const match = /<script type="application\/json" id="lab-texts">([\s\S]*?)<\/script>/.exec(html)
  return match ? match[1] : null
}

describe('/ GET (página inicial)', () => {
  it('retorna a página em pt-BR, sem cache e sem o header de etapas', async () => {
    const res = await request.get('/').expect(200)
    expect(res.headers['content-type']).to.include('text/html')
    expect(res.headers['cache-control']).to.equal('no-cache, max-age=0')
    expect(res.headers).to.not.have.property('x-serverest-stages')
    expect(res.text).to.include('<html lang="pt-BR"')
    expect(res.text).to.include(`<title>${ptBr['lab.page.title']}</title>`)
  })

  it('retorna o título no idioma de lang e volta para pt-BR com idioma desconhecido', async () => {
    const ingles = await request.get('/').query({ lang: 'en' }).expect(200)
    expect(ingles.text).to.include('<html lang="en"')
    expect(ingles.text).to.include(`<title>${en['lab.page.title']}</title>`)
    const espanhol = await request.get('/').query({ lang: 'es' }).expect(200)
    expect(espanhol.text).to.include('<html lang="es"')
    expect(espanhol.text).to.include(`<title>${es['lab.page.title']}</title>`)
    const frances = await request.get('/').query({ lang: 'fr' }).expect(200)
    expect(frances.text).to.include('<html lang="pt-BR"')
    expect(frances.text).to.include(`<title>${ptBr['lab.page.title']}</title>`)
  })

  it('o bloco lab-texts é JSON com os textos do fluxo e não contém <', async () => {
    const { text } = await request.get('/').query({ lang: 'en' }).expect(200)
    const bruto = blocoDeTextos(text)
    expect(bruto).to.be.a('string')
    expect(bruto).to.not.include('<')
    const textos = JSON.parse(bruto)
    expect(textos).to.have.property('ui.flow.title', en['ui.flow.title'])
    expect(textos).to.have.property('ui.response', en['ui.response'])
    expect(textos).to.have.property('lab.page.title', en['lab.page.title'])
  })

  it('referencia os arquivos da página com a versão do servidor e cada um responde 200', async () => {
    const { body } = await request.get('/version').expect(200)
    const { text } = await request.get('/').expect(200)
    for (const arquivo of Object.keys(tiposDosArquivos)) {
      const caminho = `/lab/assets/${arquivo}?v=${body.version}`
      expect(text).to.include(`"${caminho}"`)
      const res = await request.get(caminho).expect(200)
      expect(res.headers['content-type']).to.match(tiposDosArquivos[arquivo])
    }
  })

  it('carrega o encaminhamento dos links antigos do Swagger antes do CSS e sem defer', async () => {
    const { text } = await request.get('/').expect(200)
    const tag = /<script src="\/lab\/assets\/legacy-links\.js\?v=[^"]+"[^>]*>/.exec(text)
    expect(tag).to.not.equal(null)
    expect(tag[0]).to.not.include('defer')
    expect(tag.index).to.be.lessThan(text.indexOf('/lab/assets/lab.css'))
  })

  it('aponta o link da documentação para /swagger no idioma da página', async () => {
    const { text } = await request.get('/').query({ lang: 'en' }).expect(200)
    expect(text).to.include(`href="/swagger?lang=en">${en['lab.topbar.docs']}</a>`)
  })

  // Com um campo de senha preenchido, o Chrome trata a troca de rota como login enviado,
  // consulta a senha de exemplo no serviço de senhas vazadas e abre um aviso que bloqueia a aba.
  it('não tem campo do tipo senha, para o gerenciador de senhas do navegador não agir na página', async () => {
    const { text } = await request.get('/').expect(200)
    expect(text).to.not.match(/type="password"/i)
    expect(text).to.not.match(/autocomplete="(current-password|new-password|username)"/i)
  })

  it('não deixa marcador de template sem substituir', async () => {
    for (const lang of ['pt-BR', 'en', 'es']) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      expect(text, lang).to.not.include('{{')
    }
  })
})

describe('/lab GET', () => {
  it('não existe mais: responde 405, e os arquivos em /lab/assets continuam servidos', async () => {
    await request.get('/lab').expect(405)
    await request.get('/lab/assets/app.js').expect(200)
  })
})

// SHA-256 de cada arquivo como veio do pacote Fontsource, sem alteração. Um arquivo trocado precisa de
// outro nome, porque lab.css não tem versão no conteúdo e o navegador guardaria a fonte antiga.
const fontes = {
  'open-sans-latin-wght-normal.woff2': 'd8e4fe0452aa2076429a9bb5d8757d00a994dd95986cf950e9a1a371b9a072a0',
  'open-sans-latin-400-italic.woff2': '3b50909a098195a8a3fda73fe29c260724e6f9ca624dd750cb8af7cb0c9198e2',
  'source-code-pro-latin-wght-normal.woff2': '8b774aaa5137a38ef40f4ac9d36db9a5eee152b2f66589dfdc82ff007fc87135',
  'titillium-web-latin-400-normal.woff2': '861b80b49d2a634d8746e2e45c672309d9ba69a2fdd95da2af034d7a1d09b3f9',
  'titillium-web-latin-600-normal.woff2': 'f356ff5613e1b6789a47ae3bd6b72fa6fb61d44493811bcb758fb4229b7a8bcb',
  'titillium-web-latin-700-normal.woff2': '9e3162d81ed6681322ab34791660f1b45c79945197e7a7dbb217005b2926caf4'
}
const licencasDasFontes = ['open-sans-OFL.txt', 'source-code-pro-OFL.txt', 'titillium-web-OFL.txt']

function corpoBinario (res, callback) {
  const pedacos = []
  res.on('data', pedaco => pedacos.push(pedaco))
  res.on('end', () => callback(null, Buffer.concat(pedacos)))
}

describe('/lab/assets/fonts GET', () => {
  it('serve cada fonte como font/woff2, com os bytes do pacote original', async () => {
    for (const [arquivo, sha256] of Object.entries(fontes)) {
      const res = await request.get(`/lab/assets/fonts/${arquivo}`).buffer(true).parse(corpoBinario).expect(200)
      expect(res.headers['content-type'], arquivo).to.match(/^font\/woff2/)
      expect(createHash('sha256').update(res.body).digest('hex'), arquivo).to.equal(sha256)
    }
  })

  it('serve ao lado das fontes a licença OFL de cada família', async () => {
    for (const arquivo of licencasDasFontes) {
      const res = await request.get(`/lab/assets/fonts/${arquivo}`).expect(200)
      expect(res.headers['content-type'], arquivo).to.match(/^text\/plain/)
      expect(res.text, arquivo).to.include('SIL Open Font License')
    }
  })
})

describe('renderTemplate do lab', () => {
  it('lança erro com marcador desconhecido e mantém $& do valor - @skipE2E', () => {
    const { renderTemplate } = require('../../../src/lab')
    expect(() => renderTemplate('<p>{{lab.nao.existe}}</p>', {})).to.throw('{{lab.nao.existe}}')
    expect(renderTemplate('<p>{{lab.x}}</p>', { 'lab.x': 'custa $& e $1' })).to.equal('<p>custa $& e $1</p>')
  })
})
