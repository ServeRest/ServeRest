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
const css = readFileSync(join(labDir, 'public/lab.css'), 'utf8')
const cssDoGuia = css.slice(css.indexOf('/* Guia "Como usar"'))

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

    // Todo seletor de guia.js usa só o que está em HOOKS (os elementos do próprio guia, guide-*, ficam de fora, e
    // também o inert, que é o próprio guia que põe para isolar o destaque):
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
      ;[...atributos].filter(nome => !proprios(nome) && nome !== 'data-guide' && nome !== 'data-act' && nome !== 'data-path' && nome !== 'inert').forEach(nome => expect(HOOKS.attributes, nome).to.include(nome))
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

  describe('Movimento e destaque', () => {
    // O cartão some, a página rola e ele volta já no lugar: uma transição de CSS na posição faria o cartão
    // correr atrás do destaque de novo.
    it('nada do guia anima a posição do cartão ou do anel por CSS', () => {
      expect(cssDoGuia).to.not.match(/transition/)
    })

    it('a piscada no título do fluxo saiu: o que clicar ganha um contorno parado', () => {
      expect(guia + cssDoGuia).to.not.include('guide-attn')
      expect(guia).to.match(/node\('div', 'guide-marker', \{ 'aria-hidden': 'true' \}\)/)
      expect(guia).to.match(/node\('span', 'guide-arrow', \{ 'aria-hidden': 'true' \}\)/)
    })

    it('cada tarefa de ação diz o controle a clicar (target)', () => {
      const tarefas = [...guia.matchAll(/\{ text: fill\('lab\.guide\.(task_[a-z]+|tour\.[a-z_]+)'[^\n]*/g)].map(match => match[0])
      expect(tarefas.length).to.be.greaterThan(10)
      tarefas.forEach(tarefa => expect(tarefa, tarefa).to.include('target:'))
    })

    it('com menos movimento pedido pelo sistema, nada do guia anima', () => {
      expect(cssDoGuia).to.match(/@media \(prefers-reduced-motion: reduce\) \{ \.guide-card \*, \.guide-marker \{ animation: none !important; \} \}/)
      expect(guia).to.match(/function animate \(ms, paintStep\) \{\n\s+return new Promise\(resolve => \{\n\s+if \(reduced\(\)\)/)
    })

    it('a camada escura tem um tom em cada tema', () => {
      expect(cssDoGuia).to.include('--guide-dim: rgb(20 22 28 / 0.45)')
      expect(cssDoGuia).to.include('--guide-dim: rgb(0 0 0 / 0.62)')
    })
  })

  describe('Próximo', () => {
    // Nenhum passo tem portão próprio: todos seguem a regra do Próximo (o primeiro clique mostra o que falta, o
    // segundo faz a ação e segue).
    it('não há mais portão especial num passo', () => {
      expect(guia).to.not.match(/\bgate\b|gateText|run_gate/)
      expect(ptBr['lab.guide.tour.run_gate']).to.equal(undefined)
    })

    it('o segundo clique faz a ação como o Fazer por mim e só segue com as tarefas feitas', () => {
      expect(guia).to.match(/if \(!\(await doStep\(s\)\)\) return\n\s+try \{\n\s+await waitFor\(\(\) => !pendingTask\(s\), 2500\)/)
    })
  })

  describe('Revisão do PR #581', () => {
    const corpo = nome => { const inicio = guia.indexOf(nome); return guia.slice(inicio, guia.indexOf('\n  }\n', inicio)) }

    // Um envio a caminho (a página solta o Executar antes do veredito do fluxo) nunca ganha um segundo envio do
    // guia: a ação espera ele acabar e só então decide se ainda falta enviar.
    it('Fazer por mim e o segundo Próximo esperam o envio a caminho antes de clicar em Executar', () => {
      expect(guia).to.match(/const sendBusy = \(\) => P\.sending\(\) \|\| \(sent\(\) && P\.inFlight\(\)\)/)
      expect(corpo('async function execute (key)')).to.match(/await settleSend\(\)[\s\S]*sendBusy\(\)\) return[\s\S]*\$\('run'\)\.click\(\)/)
      expect(corpo('async function doStep (s)')).to.match(/await settleSend\(true\)\n\s+G\.actionAt = P\.lastSend\(\)\n\s+if \(s\.needs/)
      // Um clique da pessoa em Executar enquanto a ação se prepara já é o envio do passo: execute não manda outro,
      // e os envios da própria ação não contam como cliques da pessoa.
      expect(corpo('async function execute (key)')).to.match(/await settleSend\(\)\n(\s+\/\/[^\n]*\n)*\s+if \(P\.lastSend\(\) > G\.actionAt\) return[\s\S]*\$\('run'\)\.click\(\)[\s\S]*G\.actionAt = id/)
    })

    it('o login quebrado é lido do que é verdade agora, nunca anotado ao desenhar o cartão', () => {
      expect(guia).to.not.match(/G\.loginBroken\s*=/)
      expect(corpo('function loginFailure ()')).to.not.match(/G\.[a-zA-Z]+ = /)
      expect(guia).to.match(/const loginBroken = \(\) => !!G\.loginFailed && !\(G\.runToken && P\.tokenInUse\(\)\)/)
    })

    it('o aviso de que falta o passo anterior não depende de o passo já ter sido feito', () => {
      expect(guia).to.match(/const warn = missing \? fill\('lab\.guide\.needs'\)/)
      expect(guia).to.match(/const complete = G\.complete && !missing/)
    })

    it('um clique num caminho enquanto a tela troca não muda nada', () => {
      expect(guia).to.match(/if \(picked\) \{\n(\s+\/\/[^\n]*\n)*\s+if \(G\.going \|\| G\.moving\) return\n\s+G\.path = /)
    })

    it('uma mudança de tamanho no meio de uma troca fica anotada e vale no fim dela', () => {
      expect(corpo('async function relayout ()')).to.match(/if \(G\.moving \|\| G\.going\) \{\n\s+G\.resized = true/)
      expect((guia.match(/afterTransition\(\)/g) || []).length).to.be.at.least(3)
    })

    it('o contorno só aparece num controle clicável, dentro do recorte, sem envio a caminho', () => {
      expect(corpo('function paintMarker ()')).to.match(/!target\.closest\('\[inert\]'\)/)
      expect(corpo('function paintMarker ()')).to.match(/sent\(\) && sendBusy\(\)/)
      expect(corpo('function paintMarker ()')).to.match(/G\.holes\.some/)
    })

    it('com as tarefas feitas, uma troca de destaque não anuncia por cima do Feito', () => {
      expect(corpo('function announceTarget (change)')).to.match(/s\.tasks && !pendingTask\(s\)/)
    })

    it('o foco sai de um controle que ficou inert ou sumiu e vai ao título do cartão', () => {
      expect(corpo('function keepFocus ()')).to.match(/active === document\.body \|\| !active\.isConnected \|\| active\.closest\('\[inert\]'\)\) focusTitle\(\)/)
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

    it('tem as boas-vindas, o fim e a regra do Próximo nos três idiomas', () => {
      ;['welcome_title', 'welcome_lead', 'welcome_text', 'welcome_pick', 'welcome_note', 'count', 'end_title', 'end_lead', 'close_guide', 'do_next', 'missing', 'wrong_route', 'learn.end_no_token']
        .forEach(key => expect(ptBr['lab.guide.' + key], key).to.be.a('string').and.not.equal(''))
      expect(ptBr['lab.guide.welcome_title']).to.equal('Boas-vindas ao ServeRest')
      expect(ptBr['lab.guide.missing']).to.equal('Falta: {task}')
    })

    it('nenhum texto do guia usa travessão ou hífen como pontuação', () => {
      ;[ptBr, en, es].forEach(lingua => chaves.forEach(key => expect(lingua[key], key).to.not.match(/ [-–—] |—/)))
    })

    it('o guia não monta endereço da MDN: os links dele são os da página, no idioma dela', () => {
      expect(guia).to.not.include('developer.mozilla.org')
    })
  })
})
