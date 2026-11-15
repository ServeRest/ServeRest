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

  it('aponta o link da documentação para /swagger no idioma da página, numa aba nova', async () => {
    const { text } = await request.get('/').query({ lang: 'en' }).expect(200)
    expect(text).to.include(`href="/swagger?lang=en" target="_blank" rel="noopener">${en['lab.topbar.docs']}<span class="hover-arrow" aria-hidden="true">↗</span><span class="sr-only"> ${en['lab.link.new_tab']}</span></a>`)
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
    const scripts = [...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
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
    expect(html.match(absoluto)).to.equal(null)
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

  it('abre a barra com o seletor de idioma: três links, e só o do idioma da página marcado, nos três idiomas', async () => {
    const nomes = { 'pt-BR': 'lab.lang.pt_br', en: 'lab.lang.en', es: 'lab.lang.es' }
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const barra = /<header class="topbar">([\s\S]*?)<\/header>/.exec(text)[1]
      expect(barra.indexOf('class="lang-switcher"'), lang).to.be.lessThan(barra.indexOf('class="brand"'))
      const links = [...barra.matchAll(/<a class="lang-switcher__button[^"]*"[^>]*>/g)].map(match => match[0])
      expect(links, lang).to.have.length(3)
      links.forEach(link => {
        const codigo = /data-lang="([^"]+)"/.exec(link)[1]
        expect(link, `${lang} ${codigo}`).to.include(`aria-label="${escaparHtml(textos[nomes[codigo]])}"`)
        if (codigo === lang) {
          expect(link, codigo).to.include('aria-current="true"')
          expect(link, codigo).to.include('lang-switcher__button is-active"')
        } else {
          expect(link, codigo).to.not.include('aria-current')
          expect(link, codigo).to.not.include('is-active')
        }
      })
      expect(barra.match(/<img class="lang-switcher__flag" src="\/flags\/[a-z_]+\.svg" alt=""/g), lang).to.have.length(3)
    }
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
    const caixa = /<div class="version-box">([\s\S]*?)<\/div>\s*<a class="pill-hdr"/.exec(text)[1]
    const botao = /<button [^>]*id="release-btn"[^>]*>/.exec(caixa)[0]
    expect(botao).to.include('aria-expanded="false"')
    expect(botao).to.include('aria-controls="release-panel"')
    expect(botao).to.include('hidden')
    const painel = /<div [^>]*id="release-panel"[^>]*>/.exec(caixa)[0]
    expect(painel).to.include('role="region"')
    expect(painel).to.include('hidden')
    expect(caixa.indexOf('id="release-btn"')).to.be.lessThan(caixa.indexOf('id="release-panel"'))
  })

  it('deixa o selo de opinião escondido e sem href: só app.js o mostra, com o endereço do formulário', async () => {
    for (const [lang, textos] of [['pt-BR', ptBr], ['en', en], ['es', es]]) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const selo = /<a class="pill-hdr"[^>]*>([\s\S]*?)<\/a>/.exec(text)
      expect(selo[0], lang).to.not.include('href=')
      expect(selo[0], lang).to.include('hidden')
      expect(selo[1], lang).to.include(escaparHtml(textos['lab.feedback.pill']))
    }
  })

  it('o selo de opinião pede feedback sobre a repaginação, nos três idiomas', async () => {
    const selos = {
      'pt-BR': 'Dê feedback sobre a repaginação',
      en: 'Give feedback on the redesign',
      es: 'Opine sobre el rediseño'
    }
    for (const [lang, esperado] of Object.entries(selos)) {
      const { text } = await request.get('/').query({ lang }).expect(200)
      const selo = /<a class="pill-hdr"[^>]*>([^<]*)</.exec(text)
      expect(selo[1], lang).to.equal(escaparHtml(esperado))
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
