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

    // Três ondas e depois o halo parado, enquanto o passo estiver feito; nunca no "Fazer por mim e seguir".
    it('o Próximo de um passo feito brilha três vezes e fica com o halo, sem o empurrãozinho antigo', () => {
      expect(cssDoGuia).to.match(/\.guide-foot \.is-ready \{ box-shadow: 0 0 0 4px var\(--guide-glow\); animation: guide-glow 1\.6s ease-in-out 3; \}/)
      expect(cssDoGuia).to.not.match(/\.is-ready \{ animation: guide-pop/)
      expect(guia).to.match(/next\.classList\.toggle\('is-ready', done && !G\.blocked\)/)
      expect(guia).to.not.match(/replay\(next, 'is-ready'\)/)
    })

    it('na faixa preta, o Fechar realçado e o ícone do caminho realçado continuam à vista', () => {
      expect(cssDoGuia).to.include('.guide-brand .guide-close.guide-nudge { border-color: var(--accent); background: var(--bar-fg); color: var(--bar-bg); }')
      expect(cssDoGuia).to.include('.guide-path:hover .guide-icon, .guide-path:focus-visible .guide-icon { background: var(--accent); }')
      expect(cssDoGuia).to.include('.guide-path:hover .guide-icon svg, .guide-path:focus-visible .guide-icon svg { stroke: var(--surface); }')
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

    // A tarefa que falta, realçada, já diz o que falta: uma linha "Falta" logo abaixo repetiria o texto. O leitor
    // de tela continua ouvindo "Falta: <tarefa>".
    it('bloqueado, realça a tarefa que falta e anuncia "Falta", sem a linha repetida no cartão', () => {
      expect(guia).to.not.include('guide-missing')
      expect(guia).to.match(/task === pending && G\.blocked \? 'is-missing' : ''/)
      expect(guia).to.match(/G\.blocked = true\n\s+renderBody\(true\)\n\s+live\.textContent = plain\(fill\('lab\.guide\.missing', \{ task: pending\.text \}\)\)/)
      expect(cssDoGuia).to.include('.guide-tasks .is-missing {')
    })

    it('o segundo clique faz a ação como o Fazer por mim e só segue com as tarefas feitas', () => {
      expect(guia).to.match(/if \(!\(await doStep\(s\)\)\) return\n\s+try \{\n\s+await waitFor\(\(\) => !pendingTask\(s\), 2500\)/)
    })
  })

  describe('Caminho curto ("Quero conhecer a página")', () => {
    const tour = guia.slice(guia.indexOf('  const TOUR = {'), guia.indexOf('  const PATHS = {'))
    const corpo = nome => { const inicio = guia.indexOf(nome); return guia.slice(inicio, guia.indexOf('\n  }\n', inicio)) }

    // O fluxo abre no passo 2 e fica aberto no 3; só o passo 4 o fecha: nada abre e fecha de novo em seguida.
    it('segue numa direção só: câmera lenta, fluxo, barra de tempo, fluxo fechado e Histórico', () => {
      expect([...tour.matchAll(/title: 'lab\.guide\.tour\.([a-z]+)_title'/g)].map(match => match[1])).to.deep.equal(['run', 'flow', 'time', 'close', 'history'])
    })

    it('o passo 1 entra no modo normal pelo menu, só na entrada, e só conta envio em câmera lenta', () => {
      expect(tour).to.match(/prepare: \(\) => \{ if \(G\.mode !== 'step' && P\.split\(\) && !G\.doneSteps\[0\]\) G\.wantNormal = !chooseMode\('normal'\) \}/)
      expect(corpo('function chooseMode (mode)')).to.match(/\$\('run-mode'\)\.click\(\)[\s\S]*item\.click\(\)/)
      expect(guia).to.match(/const doneRun = \(\) => doneSend\(\) && \(!P\.split\(\) \|\| slowShown\(\)\)/)
      expect(tour).to.match(/warn: \(\) => noFlow\(\) \|\| \(normalSend\(\) \? fill\('lab\.guide\.tour\.run_normal'\) : ''\)/)
    })

    it('Rever em câmera lenta é uma tarefa opcional, que só conta quando a página redesenha', () => {
      expect(tour).to.match(/\{ text: fill\('lab\.guide\.tour\.flow_replay'\), optional: true, done: !!G\.ev\.replay, target: \(\) => \$\('replay'\) \}/)
      expect(guia).to.match(/if \(target\.closest\('#replay'\) && P\.replayReady\(\)\) \{\n\s+G\.ev\.replay = true/)
      // O replay vale para o registro mostrado, não para o passo: o passo seguinte não pede de novo o envio.
      expect(guia).to.match(/G\.replayed = \(P\.shown\(\) \|\| \{\}\)\.id \|\| 0/)
      expect(guia).to.match(/const flowReady = \(\) => P\.ready\(\) \|\| \(!!G\.replayed && !!P\.shown\(\) && P\.shown\(\)\.id === G\.replayed && !P\.sending\(\)\)/)
      expect(guia).not.to.match(/G\.ev\.replay && !!P\.shown/)
    })

    it('o passo da barra de tempo só pede para abrir o fluxo quando ele chegou fechado', () => {
      expect(tour).to.match(/G\.entry\.flowOpen \? null : \{ text: fill\('lab\.guide\.tour\.time_open'\)/)
    })
  })

  describe('Caminho longo, passo 7 ("Envie de novo, com token")', () => {
    // O token no header é o motivo de enviar de novo: antes do envio, o campo e Executar ficam à vista.
    it('antes do envio, mostra o Authorization preenchido e Executar em recortes próprios', () => {
      expect(guia).to.match(/if \(authShown\(\)\) return \[\$\('auth-group'\), q\('#request \.req-bar'\)\]/)
      expect(guia).to.match(/separate: authShown,/)
      expect(guia).to.match(/return narrow\(\) \? \[\$\('run-split'\), \$\('auth-input'\)\] : \$\('auth-group'\)/)
      expect(guia).to.match(/if \(authShown\(\)\) out\.push\(fill\('lab\.guide\.learn\.again_auth'\)\)/)
      // Passo 3 com valor em Authorization: no telefone, a rolagem vai primeiro aos botões que tiram o valor.
      expect(guia).to.match(/anchor: \(\) => narrow\(\) && P\.authValue\(\) && !sent\(\) \? \$\('auth-group'\) : null/)
      ;[ptBr, en, es].forEach(lingua => expect(lingua['lab.guide.learn.again_auth']).to.include('`Authorization`').and.include('header').and.include('token'))
    })
  })

  describe('Tarefa opcional', () => {
    it('fica fora do que falta, do Feito do passo e do Fazer por mim', () => {
      expect(guia).to.match(/\.find\(task => !task\.done && !task\.optional\)/)
      expect(guia).to.match(/const required = tasks\.filter\(task => !task\.optional\)\n\s+const done = required\.length > 0 && required\.every\(task => task\.done\)/)
      expect(guia).to.match(/doButton\.hidden = [^\n]*\|\| \(!required\.length && !missing\)/)
    })

    it('diz que é opcional no texto e tem um círculo próprio, mais discreto', () => {
      expect(guia).to.match(/if \(task\.optional\) text\.prepend\(el\('span', 'guide-opt', t\('lab\.guide\.optional'\)\), ' '\)/)
      expect(cssDoGuia).to.match(/\.is-opt:not\(\.is-done\) \.guide-mark \{ border-style: dashed; \}/)
      ;[ptBr, en, es].forEach(lingua => expect(lingua['lab.guide.optional']).to.match(/^Opcional:$|^Optional:$/))
    })
  })

  describe('A página como o guia a encontrou', () => {
    const corpo = nome => { const inicio = guia.indexOf(nome); return guia.slice(inicio, guia.indexOf('\n  }\n', inicio)) }

    it('guarda o modo e o fluxo ao abrir e os devolve ao fechar e no fim', () => {
      expect(corpo('function open (path)')).to.match(/G\.origin = \{ mode: P\.mode\(\), flow: P\.flowOpen\(\) \}/)
      expect(corpo('function close ()')).to.match(/track\(\)\n\s+G\.open = false[\s\S]*restoreSoon\(160\)/)
      expect(corpo('async function showEnd ()')).to.match(/track\(\)\n\s+await screen\(\(\) => \{\n\s+restoreSoon\(160\)/)
    })

    // Só volta o que um passo pediu para mudar: uma mudança da pessoa em outro passo fica.
    it('só devolve o que um passo (owns) mudou, e pelos controles de verdade', () => {
      expect(corpo('function restore ()')).to.match(/P\.flowOpen\(\) === G\.owned\.flow && G\.owned\.flow !== o\.flow[^\n]*\$\('flow-title'\)\.click\(\)/)
      expect(corpo('function restore ()')).to.match(/P\.mode\(\) === G\.owned\.mode && G\.owned\.mode !== o\.mode && \(pageBusy\(\) \|\| !chooseMode\(o\.mode\)\)/)
      expect((guia.match(/owns: \['flow'\]/g) || []).length).to.equal(5)
      expect((guia.match(/owns: \['mode'\]/g) || []).length).to.equal(1)
    })

    // O modo normal leva o desenho direto ao veredito: a devolução espera a página parar. Cada estado volta uma
    // vez só, e depois do fechar o que a pessoa faz na página fica.
    it('devolve cada estado uma vez só, sem cortar um desenho em câmera lenta', () => {
      expect(guia).to.match(/const pageBusy = \(\) => P\.sending\(\) \|\| \(!!P\.shown\(\) && !P\.verdict\(\)\)/)
      expect(corpo('function restore ()')).to.match(/\$\('flow-title'\)\.click\(\)\n\s+delete G\.owned\.flow/)
      expect(corpo('function restore ()')).to.match(/return false\n\s+delete G\.owned\.mode/)
      expect(guia).to.match(/if \(!G\.open && event\.target\.closest\('#run-menu \[data-mode\]'\)\) delete G\.owned\.mode/)
    })

    it('anuncia "Feito" depois do Fazer por mim só quando o cartão mostra o Feito', () => {
      expect(guia).to.match(/live\.textContent = q\('\.guide-done', card\) \? t\('lab\.guide\.done'\) : ''/)
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
