const { expect } = require('chai')

const ptBr = require('../../../src/swagger/translations/pt-BR')
const en = require('../../../src/swagger/translations/en')
const es = require('../../../src/swagger/translations/es')

const tiposDosArquivos = {
  'core.js': /javascript/,
  'app.js': /javascript/,
  'lab.css': /text\/css/
}

function blocoDeTextos (html) {
  const match = /<script type="application\/json" id="lab-texts">([\s\S]*?)<\/script>/.exec(html)
  return match ? match[1] : null
}

describe('/lab GET', () => {
  it('retorna a página em pt-BR, sem cache e sem o header de etapas', async () => {
    const res = await request.get('/lab').expect(200)
    expect(res.headers['content-type']).to.include('text/html')
    expect(res.headers['cache-control']).to.equal('no-cache, max-age=0')
    expect(res.headers).to.not.have.property('x-serverest-stages')
    expect(res.text).to.include('<html lang="pt-BR"')
    expect(res.text).to.include(`<title>${ptBr['lab.page.title']}</title>`)
  })

  it('retorna o título no idioma de lang e volta para pt-BR com idioma desconhecido', async () => {
    const ingles = await request.get('/lab').query({ lang: 'en' }).expect(200)
    expect(ingles.text).to.include('<html lang="en"')
    expect(ingles.text).to.include(`<title>${en['lab.page.title']}</title>`)
    const espanhol = await request.get('/lab').query({ lang: 'es' }).expect(200)
    expect(espanhol.text).to.include('<html lang="es"')
    expect(espanhol.text).to.include(`<title>${es['lab.page.title']}</title>`)
    const frances = await request.get('/lab').query({ lang: 'fr' }).expect(200)
    expect(frances.text).to.include('<html lang="pt-BR"')
    expect(frances.text).to.include(`<title>${ptBr['lab.page.title']}</title>`)
  })

  it('o bloco lab-texts é JSON com os textos do fluxo e não contém <', async () => {
    const { text } = await request.get('/lab').query({ lang: 'en' }).expect(200)
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
    const { text } = await request.get('/lab').expect(200)
    for (const arquivo of Object.keys(tiposDosArquivos)) {
      const caminho = `/lab/assets/${arquivo}?v=${body.version}`
      expect(text).to.include(`"${caminho}"`)
      const res = await request.get(caminho).expect(200)
      expect(res.headers['content-type']).to.match(tiposDosArquivos[arquivo])
    }
  })

  // Com um campo de senha preenchido, o Chrome trata a troca de rota como login enviado,
  // consulta a senha de exemplo no serviço de senhas vazadas e abre um aviso que bloqueia a aba.
  it('não tem campo do tipo senha, para o gerenciador de senhas do navegador não agir na página', async () => {
    const { text } = await request.get('/lab').expect(200)
    expect(text).to.not.match(/type="password"/i)
    expect(text).to.not.match(/autocomplete="(current-password|new-password|username)"/i)
  })

  it('não deixa marcador de template sem substituir', async () => {
    for (const lang of ['pt-BR', 'en', 'es']) {
      const { text } = await request.get('/lab').query({ lang }).expect(200)
      expect(text, lang).to.not.include('{{')
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
