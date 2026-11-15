const { expect } = require('chai')
const { readFileSync } = require('fs')
const { join } = require('path')

const { HOOKS } = require('../../src/lab/public/guia')
const ptBr = require('../../src/swagger/translations/pt-BR')
const en = require('../../src/swagger/translations/en')
const es = require('../../src/swagger/translations/es')

const labDir = join(__dirname, '../../src/lab')
const pagina = readFileSync(join(labDir, 'page.html'), 'utf8')
const app = readFileSync(join(labDir, 'public/app.js'), 'utf8')
const guia = readFileSync(join(labDir, 'public/guia.js'), 'utf8')

// Os textos entre aspas simples de um arquivo (sem os ${...} dos templates).
const literais = fonte => [...fonte.matchAll(/(['`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map(match => match[2].replace(/\$\{[^}]*\}/g, ''))

// O que page.html e app.js criam: ids (reqSection monta o da seção como sec-<nome>), classes e atributos.
const idsDaPagina = new Set([
  ...[...pagina.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]),
  ...[...app.matchAll(/\bid: '([a-z0-9-]+)'/g)].map(match => match[1]),
  ...[...app.matchAll(/reqSection\('([a-z]+)'/g)].map(match => 'sec-' + match[1])
])
const classesDaPagina = new Set([
  ...[...pagina.matchAll(/\sclass="([^"]+)"/g)].flatMap(match => match[1].split(/\s+/)),
  ...literais(app).flatMap(texto => texto.split(/\s+/))
])
const atributosDaPagina = new Set([
  ...[...pagina.matchAll(/\s([a-z][a-z-]*)=/g)].map(match => match[1]),
  ...literais(app)
])

describe('Guia "Como usar" (guia.js)', () => {
  describe('Ganchos na página', () => {
    it('cada id que o guia lê existe em page.html ou app.js', () => {
      HOOKS.ids.forEach(id => expect(idsDaPagina.has(id), id).to.equal(true))
    })

    it('cada classe que o guia lê existe em page.html ou app.js', () => {
      HOOKS.classes.forEach(nome => expect(classesDaPagina.has(nome), nome).to.equal(true))
    })

    it('cada atributo que o guia lê é escrito por page.html ou app.js', () => {
      HOOKS.attributes.forEach(nome => expect(atributosDaPagina.has(nome), nome).to.equal(true))
    })

    // Todo seletor de guia.js usa só o que está em HOOKS (os elementos do próprio guia, guide-*, ficam de fora):
    // um seletor novo sem o gancho na lista quebra este teste, e o teste de cima passa a vigiar o nome.
    it('todo seletor de guia.js usa só ids, classes e atributos listados em HOOKS', () => {
      const codigo = guia.slice(guia.indexOf('module.exports'))
      const textos = literais(codigo).filter(texto => !/^(lab|ui)\./.test(texto))
      const proprios = nome => nome.startsWith('guide-')
      const ids = new Set([
        ...[...codigo.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map(match => match[1]),
        ...textos.flatMap(texto => [...texto.matchAll(/(?:^|[\s,>(])#([a-z][\w-]*)/g)].map(match => match[1]))
      ])
      // Uma chamada de método num template (links.map) não é classe.
      const classes = new Set(textos.flatMap(texto => [...texto.matchAll(/(?:^|[\s,>(\]a-z])\.([a-z][\w-]*)(?![\w(-])/g)].map(match => match[1])))
      const atributos = new Set(textos.flatMap(texto => [...texto.matchAll(/\[([a-z][\w-]*)/g)].map(match => match[1])))
      expect(ids.size, 'ids lidos').to.be.greaterThan(10)
      ;[...ids].filter(id => !proprios(id)).forEach(id => expect(HOOKS.ids, id).to.include(id))
      ;[...classes].filter(nome => !proprios(nome)).forEach(nome => expect(HOOKS.classes, nome).to.include(nome))
      ;[...atributos].filter(nome => !proprios(nome) && nome !== 'data-guide' && nome !== 'data-act' && nome !== 'data-path').forEach(nome => expect(HOOKS.attributes, nome).to.include(nome))
    })

    // Um clique em Executar ou um Ctrl + Enter que a página ignora (envio em andamento, Authorization inválido,
    // foco fora da Requisição) não é envio: o guia só conta o que app.js despachou.
    it('conta um envio só pelo data-send que app.js grava ao despachar, nunca por clique ou tecla', () => {
      expect(app).to.match(/const outgoing = send\(route, currentRequest\(route\), 'route'\)\n(\s+\/\/[^\n]*\n)*\s+\$\('request'\)\.setAttribute\('data-send', String\(outgoing\.record\.id\)\)/)
      expect(app.match(/setAttribute\('data-send', /g)).to.have.length(3)
      // Depois de recarregar a aba, os envios restaurados ficam para trás da contagem: nenhum deles marca um passo.
      expect(app).to.match(/state\.seq = list\.reduce\([^\n]+\n(\s+\/\/[^\n]*\n)*\s+\$\('request'\)\.setAttribute\('data-send', String\(state\.seq\)\)/)
      expect(guia).to.not.match(/'keydown'[^\n]*\n[^\n]*'Enter'/)
      expect(guia).to.not.match(/closest\('#run'\)/)
    })

    it('um envio que termina sem fluxo (sem resposta ou sem o header de etapas) também tem fim para o guia', () => {
      expect(app).to.match(/function flowNote \(record, content\) \{[\s\S]{0,200}'data-verdict': 'none'/)
    })

    it('a página não pede guia.js: só app.js, no primeiro clique em "Como usar"', () => {
      expect(pagina).to.not.include('guia.js')
      expect(literais(app).filter(texto => texto.includes('guia.js'))).to.deep.equal(['/lab/assets/guia.js?v='])
    })
  })

  describe('Textos', () => {
    const chaves = Object.keys(ptBr).filter(key => key.startsWith('lab.guide.'))
    const marcadores = texto => [...texto.matchAll(/\{([a-z_]+)\}/g)].map(match => match[1]).sort()

    it('tem os textos do guia em pt-BR, en e es, com os mesmos marcadores', () => {
      expect(chaves.length).to.be.greaterThan(50)
      chaves.forEach(key => {
        expect(en[key], 'en ' + key).to.be.a('string').and.not.equal('')
        expect(es[key], 'es ' + key).to.be.a('string').and.not.equal('')
        expect(marcadores(en[key]), 'en ' + key).to.deep.equal(marcadores(ptBr[key]))
        expect(marcadores(es[key]), 'es ' + key).to.deep.equal(marcadores(ptBr[key]))
      })
    })

    it('nenhum texto do guia passa de dois parágrafos curtos (240 caracteres)', () => {
      chaves.forEach(key => expect(ptBr[key].length, key).to.be.at.most(240))
    })

    it('o guia não monta endereço da MDN: os links dele são os da página, no idioma dela', () => {
      expect(guia).to.not.include('developer.mozilla.org')
    })
  })
})
