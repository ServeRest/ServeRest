const { expect } = require('chai')
const { createHash } = require('crypto')
const { readFileSync } = require('fs')
const { join } = require('path')

const ptBr = require('../../../src/swagger/translations/pt-BR')
const en = require('../../../src/swagger/translations/en')
const es = require('../../../src/swagger/translations/es')

const tiposDosArquivos = {
  'core.js': /javascript/,
  'app.js': /javascript/,
  'lab.css': /text\/css/
}

// Os dois scripts de antes da primeira pintura vão dentro da página, iguais aos arquivos de public/.
const scriptsEmbutidos = ['legacy-links.js', 'prefs-boot.js']
  .map(arquivo => readFileSync(join(__dirname, '../../../src/lab/public', arquivo), 'utf8'))

function blocoDeTextos (html) {
  const match = /<script type="application\/json" id="lab-texts">([\s\S]*?)<\/script>/.exec(html)
  return match ? match[1] : null
}

function escaparHtml (texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Cada zona: o id da seção, o id do h2 que a nomeia e a chave do texto do h2.
const zonas = [
  ['routes', 'routes-title', 'lab.routes.title'],
  ['request-zone', 'request-zone-title', 'lab.request.title'],
  ['result', 'result-title', 'lab.result.title'],
  ['history', 'hist-title', 'lab.history.title']
]

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

  it('descreve a página para os buscadores, em uma ou duas frases de até 160 caracteres, nos três idiomas', async () => {
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const descricao = textos['lab.page.description']
      expect(descricao.length, lang).to.be.within(50, 160)
      expect(text.split('<meta name="description"').length - 1, lang).to.equal(1)
      expect(text, lang).to.include(`<meta name="description" content="${escaparHtml(descricao)}">`)
    }
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

  it('traz dentro da página, antes do CSS, o encaminhamento dos links antigos do Swagger', async () => {
    const { text } = await request.get('/').expect(200)
    const posicao = text.indexOf(`<script>${scriptsEmbutidos[0]}</script>`)
    expect(posicao).to.be.greaterThan(-1)
    expect(posicao).to.be.lessThan(text.indexOf('/lab/assets/lab.css'))
    expect(text).to.not.include('/lab/assets/legacy-links.js')
  })

  // O nome curto (Swagger) fica escondido do leitor de tela: o nome do link é sempre o inteiro.
  it('aponta o link da documentação para /swagger no idioma da página, numa aba nova', async () => {
    const { text } = await request.get('/').query({ lang: 'en' }).expect(200)
    expect(text).to.include(`href="/swagger?lang=en" target="_blank" rel="noopener"><span class="docs-long">${en['lab.topbar.docs_full']}</span><span class="docs-short" aria-hidden="true">Swagger</span><span class="m-arrow" aria-hidden="true">↗</span><span class="sr-only"> ${en['lab.link.new_tab']}</span></a>`)
  })

  // Com um campo de senha preenchido, o Chrome trata a troca de rota como login enviado,
  // consulta a senha de exemplo no serviço de senhas vazadas e abre um aviso que bloqueia a aba.
  it('não tem campo do tipo senha, para o gerenciador de senhas do navegador não agir na página', async () => {
    const { text } = await request.get('/').expect(200)
    expect(text).to.not.match(/type="password"/i)
    expect(text).to.not.match(/autocomplete="(current-password|new-password|username)"/i)
  })

  // Os campos montados por app.js recebem a lista inteira de core.FIELD_ASSISTS_OFF; no HTML fica o body,
  // com que o 1Password ignora a página inteira, inclusive um campo novo que esqueça a lista.
  it('marca o body para o 1Password ignorar a página inteira', async () => {
    const { text } = await request.get('/').expect(200)
    expect(text).to.match(/<body data-1p-ignore>/)
  })

  it('traz dentro da página o tema e o tamanho do texto guardados, depois dos links antigos e antes do CSS', async () => {
    const { text } = await request.get('/').expect(200)
    const posicao = text.indexOf(`<script>${scriptsEmbutidos[1]}</script>`)
    expect(posicao).to.be.greaterThan(text.indexOf(`<script>${scriptsEmbutidos[0]}</script>`))
    expect(posicao).to.be.lessThan(text.indexOf('/lab/assets/lab.css'))
    expect(text).to.not.include('/lab/assets/prefs-boot.js')
  })

  it('não deixa marcador de template sem substituir', async () => {
    for (const lang of ['pt-BR', 'en', 'es']) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      expect(text, lang).to.not.include('{{')
    }
  })
})

describe('/ GET (marcação da página inicial)', () => {
  it('tem um <main> só, com as quatro zonas dentro, cada uma uma seção nomeada pelo seu h2', async () => {
    const { text } = await request.get('/').expect(200)
    expect(text.match(/<main\b/g)).to.have.length(1)
    const main = /<main\b[^>]*>([\s\S]*)<\/main>/.exec(text)[1]
    zonas.forEach(([id, titulo]) => {
      expect(main, id).to.match(new RegExp(`<section [^>]*id="${id}" aria-labelledby="${titulo}"`))
      expect(main, id).to.match(new RegExp(`<h2 [^>]*id="${titulo}"`))
    })
  })

  it('dá a cada zona o título traduzido, nos três idiomas', async () => {
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      zonas.forEach(([, titulo, chave]) => {
        expect(text, `${lang} ${chave}`).to.include(`id="${titulo}">${escaparHtml(textos[chave])}</h2>`)
      })
    }
  })

  it('só tem como script inline os dois de antes da primeira pintura, e nenhum handler de evento na marcação', async () => {
    const { text } = await request.get('/').expect(200)
    const scripts = [...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script[^>]*>/gi)]
    expect(scripts.filter(([, atributos]) => atributos === '').map(([, , conteudo]) => conteudo)).to.deep.equal(scriptsEmbutidos)
    scripts.forEach(([, atributos, conteudo]) => {
      if (atributos === '' || atributos === ' type="application/json" id="lab-texts"') return
      expect(atributos).to.match(/ src="\/lab\/assets\/[a-z-]+\.js\?v=[^"]+"/)
      expect(conteudo).to.equal('')
    })
    const tags = text.match(/<[a-zA-Z][^>]*>/g)
    expect(tags.filter(tag => /\son[a-z]+\s*=/i.test(tag))).to.deep.equal([])
  })

  it('não pede nada a outro domínio: nenhum src, href ou url( absoluto, nem preconnect ou @import', async () => {
    const { body } = await request.get('/version').expect(200)
    const { text: html } = await request.get('/').expect(200)
    const { text: css } = await request.get(`/lab/assets/lab.css?v=${body.version}`).expect(200)
    const absoluto = /(?:src|href)\s*=\s*["']?\s*(?:[a-z][a-z0-9+.-]*:|\/\/)/gi
    // O canonical e os alternates precisam do endereço absoluto e o navegador não os pede; o teste deles confere
    // que apontam para o próprio ambiente.
    expect(html.replace(/<link rel="(?:canonical|alternate)" [^>]*>/g, '').match(absoluto)).to.equal(null)
    for (const fonte of [html, css]) {
      expect(fonte.match(/url\(\s*["']?\s*(?:https?:|\/\/)/gi)).to.equal(null)
      expect(fonte).to.not.include('@import')
    }
    expect(html).to.not.match(/rel="preconnect"/)
    expect(css).to.include('url("fonts/open-sans-latin-wght-normal.woff2")')
  })

  it('não tem mais o painel Preferências nem chave lab.prefs.*, nos três idiomas', async () => {
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      expect(text, lang).to.not.match(/prefs-(btn|panel)|name="pref-/)
      expect(Object.keys(textos).filter(chave => chave.startsWith('lab.prefs.')), lang).to.deep.equal([])
      expect(JSON.parse(blocoDeTextos(text)), lang).to.not.have.any.keys('lab.prefs.title')
    }
  })

  it('abre a barra com a marca e a etiqueta da versão, antes de "Como usar", da documentação e do idioma', async () => {
    const { body } = await request.get('/version').expect(200)
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const barra = /<header class="topbar">([\s\S]*?)<\/header>/.exec(text)[1]
      const ordem = ['class="logo"', 'id="version"', 'id="guide-open"', 'id="docs-link"', 'id="lang-btn"', 'id="prefs"', 'id="more-btn"', 'id="feedback-band"']
      const posicoes = ordem.map(trecho => barra.indexOf(trecho))
      expect(posicoes, lang).to.not.include(-1)
      expect(posicoes, lang).to.deep.equal([...posicoes].sort((x, y) => x - y))
      const etiqueta = /<a class="version-tag" id="version"[^>]*>([\s\S]*?)<\/a>/.exec(barra)
      expect(etiqueta[0], lang).to.not.include('href=')
      expect(etiqueta[1], lang).to.include(`<span class="v-short" aria-hidden="true">v${body.version}</span>`)
      expect(etiqueta[1], lang).to.include(`<span class="v-long">${escaparHtml(textos['lab.topbar.version'].replace('{version}', body.version))}</span>`)
    }
  })

  // Os idiomas são links comuns na mesma aba (funcionam antes do script e para os buscadores), com data-lang,
  // que outras partes da página usam para reconhecer a troca de idioma.
  it('tem o menu de idiomas com três links pelo nome nativo, e só o do idioma da página marcado, nos três idiomas', async () => {
    const nomes = { 'pt-BR': 'lab.lang.pt_br', en: 'lab.lang.en', es: 'lab.lang.es' }
    const bandeiras = { 'pt-BR': 'flag_brazil.svg', en: 'flag_uk.svg', es: 'flag_peru.svg' }
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const menu = /<div class="menu lang-menu" id="lang-menu" hidden>([\s\S]*?)<\/ul>/.exec(text)[1]
      const links = [...menu.matchAll(/<a class="m-item"([^>]*)><img src="\/flags\/([a-z_]+\.svg)" alt="" width="20" height="14">([^<]+)</g)]
      expect(links.map(([, atributos]) => /data-lang="([^"]+)"/.exec(atributos)[1]), lang).to.deep.equal(['pt-BR', 'es', 'en'])
      links.forEach(([, atributos, bandeira, nome]) => {
        const codigo = /data-lang="([^"]+)"/.exec(atributos)[1]
        expect(atributos, `${lang} ${codigo}`).to.include(` href="?lang=${codigo}" hreflang="${codigo}" lang="${codigo}"`)
        expect(atributos, `${lang} ${codigo}`).to.not.include('target=')
        expect(bandeira, `${lang} ${codigo}`).to.equal(bandeiras[codigo])
        expect(nome, `${lang} ${codigo}`).to.equal(escaparHtml(textos[nomes[codigo]]))
        if (codigo === lang) expect(atributos, codigo).to.include('aria-current="true"')
        else expect(atributos, codigo).to.not.include('aria-current')
      })
      expect(menu, lang).to.include(`<p class="m-h" id="lang-menu-title">${escaparHtml(textos['lab.topbar.languages'])}</p>`)
      expect(menu, lang).to.include('<ul class="m-list" aria-labelledby="lang-menu-title">')
    }
  })

  it('mostra no botão do idioma a bandeira e a sigla do idioma da página, com o nome dele e o que o botão faz, nos três idiomas', async () => {
    const esperado = { 'pt-BR': ['flag_brazil.svg', 'PT', ptBr], en: ['flag_uk.svg', 'EN', en], es: ['flag_peru.svg', 'ES', es] }
    const nomes = { 'pt-BR': 'lab.lang.pt_br', en: 'lab.lang.en', es: 'lab.lang.es' }
    for (const [lang, [bandeira, sigla, textos]] of Object.entries(esperado)) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const botao = /<button class="cap lang-btn"([^>]*)>([\s\S]*?)<\/button>/.exec(text)
      expect(botao[1], lang).to.include('data-menu aria-expanded="false" aria-controls="lang-menu"')
      expect(botao[2], lang).to.include(`<img src="/flags/${bandeira}" alt="" width="20" height="14"><span class="lang-code">${sigla}</span>`)
      expect(botao[2], lang).to.include(`<span class="sr-only">, ${escaparHtml(textos[nomes[lang]])}. ${escaparHtml(textos['lab.topbar.lang_change'])}</span>`)
    }
  })

  it('tem o botão "Mais opções" com o nome traduzido, que abre o menu do telefone, nos três idiomas', async () => {
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const botao = /<button class="cap more-btn"([^>]*)>([\s\S]*?)<\/button>/.exec(text)
      expect(botao[1], lang).to.include('data-menu aria-expanded="false" aria-controls="more-menu"')
      expect(botao[2], lang).to.include(`<span class="sr-only">${escaparHtml(textos['lab.topbar.more'])}</span>`)
      expect(text, lang).to.match(/<div class="menu more-menu" id="more-menu" hidden>/)
    }
  })

  // O title repetia o nome dos controles: o leitor de tela lia duas vezes e a dica não acrescentava nada.
  it('não tem title nos controles da barra', async () => {
    const { text } = await request.get('/').expect(200)
    const barra = /<header class="topbar">([\s\S]*?)<\/header>/.exec(text)[1]
    expect(barra).to.not.match(/\stitle=/)
  })

  it('tem os botões de tamanho do texto e de tema com os nomes traduzidos, nos três idiomas', async () => {
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const nome = id => new RegExp(`<button [^>]*${id}[^>]*>`).exec(text)[0]
      expect(nome('id="text-down"'), lang).to.include(`aria-label="A− ${escaparHtml(textos['lab.topbar.text_smaller'])}"`)
      expect(nome('id="text-up"'), lang).to.include(`aria-label="A+ ${escaparHtml(textos['lab.topbar.text_larger'])}"`)
      expect(nome('data-theme-choice="light"'), lang).to.include(`aria-label="${escaparHtml(textos['lab.topbar.theme_light'])}"`)
      expect(nome('data-theme-choice="dark"'), lang).to.include(`aria-label="${escaparHtml(textos['lab.topbar.theme_dark'])}"`)
      expect(text, lang).to.include(`role="group" aria-label="${escaparHtml(textos['lab.topbar.text_size'])}"`)
      expect(text, lang).to.include(`role="group" aria-label="${escaparHtml(textos['lab.topbar.theme'])}"`)
    }
  })

  it('tem na barra o botão "Como usar" do guia, traduzido, e não pede guia.js: ele só é baixado ao abrir, nos três idiomas', async () => {
    const { body } = await request.get('/version').expect(200)
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const botao = /<button [^>]*id="guide-open"[^>]*>([\s\S]*?)<\/button>/.exec(text)
      expect(botao, lang).to.not.equal(null)
      expect(botao[0], lang).to.include('aria-haspopup="dialog"')
      expect(botao[1].replace(/<svg[\s\S]*<\/svg>/, ''), lang).to.equal(`<span class="guide-label">${escaparHtml(textos['lab.guide.open'])}</span>`)
      expect(text, lang).to.not.include('guia.js')
      expect(JSON.parse(blocoDeTextos(text)), lang).to.have.property('lab.guide.learn.name', textos['lab.guide.learn.name'])
    }
    const guia = await request.get(`/lab/assets/guia.js?v=${body.version}`).expect(200)
    expect(guia.headers['content-type']).to.match(/javascript/)
    expect(guia.text).to.include('window.serverestGuide')
  })

  it('traz no começo do body o sprite dos ícones do Executar, com a origem e a licença', async () => {
    const { text } = await request.get('/').expect(200)
    const sprite = /<!--([\s\S]*?)-->\s*<svg class="sprite"[^>]*aria-hidden="true"[^>]*>([\s\S]*?)<\/svg>/.exec(text)
    expect(sprite).to.not.equal(null)
    expect(sprite[1]).to.include('Lucide')
    expect(sprite[1]).to.include('ISC')
    ;['i-snail', 'i-setas', 'i-chev', 'i-check'].forEach(id => expect(sprite[2]).to.include(`<symbol id="${id}"`))
    expect(text.indexOf('class="sprite"')).to.be.lessThan(text.indexOf('class="skip-link"'))
  })

  // A única caixa de marcar da página é a dos tempos do curl, na aba da requisição enviada.
  it('não tem mais a caixa Câmera lenta: o modo fica no Executar dividido', async () => {
    const { text } = await request.get('/').expect(200)
    expect(text.match(/type="checkbox"/g)).to.have.lengthOf(1)
    expect(text).to.include('<input type="checkbox" id="sent-out-times">')
    expect(text).to.not.include('id="slow"')
  })

  it('tem as abas Resposta e Foi enviado do Resultado com os nomes traduzidos, nos três idiomas', async () => {
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      expect(text, lang).to.include(`id="result-tabs" role="tablist" aria-label="${escaparHtml(textos['lab.result_tabs.label'])}"`)
      expect(/<button [^>]*id="res-tab-resposta"[^>]*>([\s\S]*?)<\/button>/.exec(text)[1], lang).to.include(escaparHtml(textos['lab.response.title']))
      expect(/<button [^>]*id="res-tab-enviado"[^>]*>([\s\S]*?)<\/button>/.exec(text)[1], lang).to.include(escaparHtml(textos['lab.sent_out.title']))
      expect(text, lang).to.include('id="response" role="tabpanel" aria-labelledby="res-tab-resposta"')
      expect(text, lang).to.include('id="sent-out" role="tabpanel" aria-labelledby="res-tab-enviado"')
      expect(text, lang).to.include(`>${escaparHtml(textos['lab.history.undo'])}</button>`)
    }
  })

  it('deixa o link do aviso de versão sem href: o script o preenche com data-notice-url', async () => {
    const { text } = await request.get('/').expect(200)
    const aviso = /<a [^>]*id="version-notice"[^>]*>/.exec(text)[0]
    expect(aviso).to.not.include('href=')
    expect(aviso).to.include('hidden')
  })

  it('traz o botão do aviso com número e o painel dele escondidos, logo depois do link, sem texto de versão', async () => {
    const { text } = await request.get('/').expect(200)
    const caixa = /<div class="version-box" id="version-box">([\s\S]*?)<\/div>\s*<\/div>\s*<button class="guide-open"/.exec(text)[1]
    const botao = /<button [^>]*id="release-btn"[^>]*>/.exec(caixa)[0]
    expect(botao).to.include('aria-expanded="false"')
    expect(botao).to.include('aria-controls="release-panel"')
    expect(botao).to.include('hidden')
    const painel = /<div [^>]*id="release-panel"[^>]*>/.exec(caixa)[0]
    expect(painel).to.include('role="region"')
    expect(painel).to.include('hidden')
    expect(caixa.indexOf('id="release-btn"')).to.be.lessThan(caixa.indexOf('id="release-panel"'))
  })

  // A linha vem do servidor, mas a faixa nasce fina: só prefs-boot.js, antes da primeira pintura, põe
  // data-feedback na raiz nos dias em que ela aparece. O endereço do formulário é de app.js.
  it('traz na faixa roxa a linha de opinião escondida, com o link sem href, nos três idiomas', async () => {
    const linhas = {
      'pt-BR': ['Tem 2 minutos?', 'Ajude a melhorar esta página'],
      en: ['Got 2 minutes?', 'Help improve this page'],
      es: ['¿Tiene 2 minutos?', 'Ayude a mejorar esta página']
    }
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      expect(text, lang).to.not.include('data-feedback=')
      const faixa = /<div class="topbar-band">\s*<p class="fb-line" id="feedback-band">([\s\S]*?)<\/p>\s*<\/div>\s*<\/header>/.exec(text)
      expect(faixa, lang).to.not.equal(null)
      expect(faixa[1], lang).to.equal(`${escaparHtml(linhas[lang][0])} <a class="fb-link" id="feedback-band-link" target="_blank" rel="noopener">${escaparHtml(linhas[lang][1])}<span aria-hidden="true"> ↗</span><span class="sr-only"> ${escaparHtml(textos['lab.link.new_tab'])}</span></a>`)
      expect(textos['lab.feedback.band'], lang).to.equal(linhas[lang][0])
    }
  })

  it('mostra sempre o rodapé Sobre, com a apresentação e os títulos dos grupos vindos do servidor, nos três idiomas', async () => {
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const rodape = /<footer [^>]*>([\s\S]*?)<\/footer>/.exec(text)
      expect(rodape[0], lang).to.match(/<footer class="about wrap" id="about" aria-labelledby="about-title">/)
      expect(rodape[1], lang).to.include(`<h2 class="sr-only" id="about-title">${escaparHtml(textos['lab.about.title'])}</h2>`)
      expect(rodape[1], lang).to.include(`<p>${escaparHtml(textos['lab.about.intro'])}</p>`)
      ;['lab.about.group_beyond', 'lab.about.group_help', 'lab.about.group_support'].forEach(chave => {
        expect(rodape[1], `${lang} ${chave}`).to.match(new RegExp(`<h3 class="foot-h" id="[a-z-]+">${escaparHtml(textos[chave])}</h3>`))
      })
      // As listas vêm vazias: os links (e os endereços) são de app.js.
      expect(rodape[1].match(/<ul class="foot-list" id="[a-z-]+" aria-labelledby="[a-z-]+"><\/ul>/g), lang).to.have.length(3)
      expect(rodape[1], lang).to.not.include('<a ')
    }
  })

  it('usa o ícone da página servido em /lab/assets/img, sem endereço de fora', async () => {
    const { text } = await request.get('/').expect(200)
    expect(text).to.include('<link rel="icon" type="image/svg+xml" href="/lab/assets/img/favicon.svg">')
  })

  it('sem release mais nova, os atributos do aviso de versão ficam vazios - @skipE2E', async () => {
    const { text } = await request.get('/').expect(200)
    const raiz = /<html [^>]*>/.exec(text)[0]
    expect(raiz).to.include('data-notice-version=""')
    expect(raiz).to.include('data-notice-url=""')
  })
})

describe('/ GET (endereços e cartão de compartilhamento)', () => {
  // A URL do servidor que o teste usa, que é a que a página anuncia.
  const BASES = { 'e2e-staging': 'https://staging.serverest.dev', 'e2e-production': 'https://serverest.dev' }
  const base = BASES[process.env.TEST_TYPE] || 'http://localhost:3000'
  const enderecos = { 'pt-BR': `${base}/`, en: `${base}/?lang=en`, es: `${base}/?lang=es` }
  const locais = { 'pt-BR': 'pt_BR', en: 'en_GB', es: 'es_PE' }
  const imagem = '/lab/assets/img/serverest-og.png'
  const idiomas = [['pt-BR', ptBr], ['en', en], ['es', es]]

  function cabecalho (html) {
    return /<head>([\s\S]*?)<\/head>/.exec(html)[1]
  }

  function links (head, rel) {
    return [...head.matchAll(new RegExp(`<link rel="${rel}"([^>]*)>`, 'g'))].map(([, atributos]) => ({
      hreflang: (/ hreflang="([^"]+)"/.exec(atributos) || [])[1],
      href: / href="([^"]+)"/.exec(atributos)[1]
    }))
  }

  // O conteúdo de cada meta com aquele property ou name; uma meta repetida aparece duas vezes.
  function metas (head, atributo, nome) {
    return [...head.matchAll(new RegExp(`<meta ${atributo}="${nome}" content="([^"]*)">`, 'g'))].map(([, conteudo]) => conteudo)
  }

  it('tem um canonical, o endereço do idioma, e um alternate para cada idioma e o x-default, nos três idiomas', async () => {
    for (const [lang] of idiomas) {
      const head = cabecalho((await request.get('/').query({ lang }).expect(200)).text)
      expect(links(head, 'canonical'), lang).to.deep.equal([{ hreflang: undefined, href: enderecos[lang] }])
      expect(links(head, 'alternate'), lang).to.deep.equal([
        { hreflang: 'pt-BR', href: enderecos['pt-BR'] },
        { hreflang: 'en', href: enderecos.en },
        { hreflang: 'es', href: enderecos.es },
        { hreflang: 'x-default', href: enderecos['pt-BR'] }
      ])
    }
  })

  it('com lang desconhecido, ou pt-BR escrito na URL, responde 200 e o canonical é a raiz', async () => {
    for (const lang of ['xx', 'fr', 'pt-BR', '']) {
      const head = cabecalho((await request.get('/').query({ lang }).expect(200)).text)
      expect(links(head, 'canonical'), lang).to.deep.equal([{ hreflang: undefined, href: `${base}/` }])
    }
  })

  it('traz Open Graph e Twitter com o título e a descrição do idioma e a imagem de 1200x630, nos três idiomas', async () => {
    for (const [lang, textos] of idiomas) {
      const head = cabecalho((await request.get('/').query({ lang }).expect(200)).text)
      const esperado = {
        property: {
          'og:type': 'website',
          'og:site_name': 'ServeRest',
          'og:title': escaparHtml(textos['lab.page.title']),
          'og:description': escaparHtml(textos['lab.page.description']),
          'og:url': enderecos[lang],
          'og:locale': locais[lang],
          'og:image': base + imagem,
          'og:image:width': '1200',
          'og:image:height': '630',
          'og:image:alt': escaparHtml(textos['lab.page.image_alt'])
        },
        name: {
          'twitter:card': 'summary_large_image',
          'twitter:title': escaparHtml(textos['lab.page.title']),
          'twitter:description': escaparHtml(textos['lab.page.description']),
          'twitter:image': base + imagem,
          'twitter:image:alt': escaparHtml(textos['lab.page.image_alt'])
        }
      }
      for (const [atributo, nomes] of Object.entries(esperado)) {
        for (const [nome, conteudo] of Object.entries(nomes)) {
          expect(metas(head, atributo, nome), `${lang} ${nome}`).to.deep.equal([conteudo])
        }
      }
      expect(head.match(/<meta property="og:/g), lang).to.have.length(Object.keys(esperado.property).length)
      expect(head.match(/<meta name="twitter:/g), lang).to.have.length(Object.keys(esperado.name).length)
    }
  })

  it('serve a imagem de compartilhar como PNG de 1200x630 com menos de 60 KB', async () => {
    const res = await request.get(imagem).buffer(true).parse(corpoBinario).expect(200)
    expect(res.headers['content-type']).to.match(/^image\/png/)
    expect(res.body.subarray(1, 4).toString('ascii')).to.equal('PNG')
    expect([res.body.readUInt32BE(16), res.body.readUInt32BE(20)]).to.deep.equal([1200, 630])
    expect(res.body.length).to.be.below(60 * 1024)
  })
})

describe('/index.html GET', () => {
  it('leva à página inicial em vez da página de exemplo do Swagger UI, com a Petstore', async () => {
    const res = await request.get('/index.html').expect(301)
    expect(res.headers.location).to.equal('/')
    const pagina = await request.get('/').expect(200)
    expect(pagina.text).to.not.include('petstore')
  })

  it('mantém a query na volta, para o idioma escolhido continuar', async () => {
    const res = await request.get('/index.html?lang=en').expect(301)
    expect(res.headers.location).to.equal('/?lang=en')
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

// SHA-256 de cada imagem da marca: a logo de assets/logos/serverest-2-cor-cortado.png dos protótipos,
// de 4005 x 1536, reduzida por média de área para 229 x 88 (o dobro dos 44 px da barra), e o ícone
// decodificado do data URI de v-refino2.html, sem redesenhar.
const imagens = {
  'serverest-logo.png': ['image/png', 'd555e4fc45f830cf977d1a32d7a4b98263476c8ab51671a3f40e68f20e5f4a75'],
  'favicon.svg': ['image/svg+xml', '70bee0e1dee1c8d10043405785d5be22771944bf43f8d44688b397e6569267d5']
}
// As setas do Resultado vazio, decodificadas dos data URIs de v-refino2.html sem redesenhar, voltam a ser
// data URI dentro do CSS, com os mesmos bytes.
const setas = {
  '--setas-p': '4ed319f7b4fadaff3d71ab526986866670bfb6a82f4ec12cbfb41ed53575219b',
  '--setas-d': '89239d9c3c444b36644688f31fa196a32efd0638cbccd98e951b5799ebd7191c'
}

describe('/lab/assets/img GET', () => {
  it('serve cada imagem da marca com o tipo certo e os bytes da fonte original', async () => {
    for (const [arquivo, [tipo, sha256]] of Object.entries(imagens)) {
      const res = await request.get(`/lab/assets/img/${arquivo}`).buffer(true).parse(corpoBinario).expect(200)
      expect(res.headers['content-type'], arquivo).to.match(new RegExp(`^${tipo.replace('+', '\\+')}`))
      expect(createHash('sha256').update(res.body).digest('hex'), arquivo).to.equal(sha256)
    }
  })

  it('o CSS usa as imagens por endereço relativo, e a página não usa mais o SVG da logo do Swagger', async () => {
    const { body } = await request.get('/version').expect(200)
    const { text: css } = await request.get(`/lab/assets/lab.css?v=${body.version}`).expect(200)
    const { text: html } = await request.get('/').expect(200)
    expect(css).to.include('url("img/serverest-logo.png")')
    expect(css).to.not.include('img/setas-')
    expect(css + html).to.not.include('serverest_logo.svg')
  })

  it('o CSS traz as setas do Resultado como data URI, com os bytes da arte original', async () => {
    const { body } = await request.get('/version').expect(200)
    const { text: css } = await request.get(`/lab/assets/lab.css?v=${body.version}`).expect(200)
    for (const [propriedade, sha256] of Object.entries(setas)) {
      const uri = new RegExp(`${propriedade}: url\\("data:image/png;base64,([A-Za-z0-9+/=]+)"\\)`).exec(css)
      expect(uri, propriedade).to.not.equal(null)
      expect(createHash('sha256').update(Buffer.from(uri[1], 'base64')).digest('hex'), propriedade).to.equal(sha256)
      expect(css, propriedade).to.include(`var(${propriedade})`)
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
