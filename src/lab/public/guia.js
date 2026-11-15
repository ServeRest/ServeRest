/* eslint-env browser */
// Guia "Como usar" da página inicial. app.js o baixa na primeira vez que o guia abre, nunca na carga da página.
// O guia só lê a página pelos ganchos de HOOKS (ids, classes e atributos data-* que app.js e page.html põem
// onde o estado é conhecido), nunca pelo texto traduzido; "Fazer por mim" clica nos mesmos controles reais. Os
// textos vêm de #lab-texts (lab.guide.*), no idioma da página.
//
// Modal: uma camada escura cobre a página e segura o clique, com um recorte (clip-path) em volta do que o passo
// destaca. Fora do cartão e do que o passo deixa ativo, tudo fica inert: sem clique, sem Tab e fora do leitor
// de tela. O destaque fica ativo só quando o passo pede uma ação; num passo que só explica, um escudo
// transparente cobre o recorte e ficam ativos só os links que o passo lista. Clicar fora pulsa o Fechar.
(function () {
  'use strict'

  // O que o guia lê da página. Um teste de unidade confere que cada um ainda existe em page.html ou app.js, e
  // que todo seletor deste arquivo usa só o que está aqui: trocar um nome quebra o teste, não o guia.
  const HOOKS = {
    ids: ['guide-open', 'announcer', 'lab-texts', 'side-tab-rotas', 'side-tab-historico', 'routes-toggle', 'filter',
      'request', 'run', 'run-mode', 'run-menu', 'run-split', 'auth-group', 'auth-input', 'auth-undo', 'auth-discard',
      'body-restore', 'sec-responses', 'shown', 'flow', 'flow-title', 'tl-pop', 'res-tab-resposta', 'res-body-area',
      'use-token', 'token-done', 'history', 'history-body'],
    classes: ['route', 'req-bar', 'req-hint', 'method-link', 'kbd-hint', 'flow-summary', 'flow-summary-stage',
      'flow-stages', 'flow-stage', 'flow-row', 'band', 'tl', 'tl-seg', 'tl-call', 'entry', 'zone-head', 'res-line',
      'res-body', 'res-headers', 'status-link', 'doc-code'],
    attributes: ['data-layout', 'data-route', 'data-key', 'data-send', 'data-send-mode', 'data-record', 'data-status',
      'data-verdict', 'data-stage', 'data-token', 'data-token-in-use', 'data-part', 'aria-busy', 'aria-current',
      'aria-expanded', 'aria-selected', 'href']
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { HOOKS }
  if (typeof document === 'undefined') return

  const core = window.serverestLabCore
  const $ = id => document.getElementById(id)
  const q = (selector, root) => (root || document).querySelector(selector)
  const qa = (selector, root) => Array.from((root || document).querySelectorAll(selector))
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const visible = node => !!node && node.isConnected && node.getClientRects().length > 0
  const CART = 'post /carrinhos'
  const LOGIN = 'post /login'

  // Cada tela do guia (abrir, trocar de caminho ou de passo, fechar) muda a geração. "Fazer por mim" espera
  // sempre por wait e waitFor, que param com CANCELLED quando a geração mudou durante a espera: nada dele toca
  // a página depois que a pessoa fechou o guia ou saiu do passo.
  let generation = 0
  const CANCELLED = new Error('guia: ação cancelada')

  async function wait (ms) {
    const started = generation
    await sleep(ms)
    if (started !== generation) throw CANCELLED
  }

  async function waitFor (test, ms) {
    const end = Date.now() + ms
    while (Date.now() < end && !test()) await wait(120)
  }

  /* ---------- Textos ---------- */

  const texts = (() => {
    try {
      return JSON.parse($('lab-texts').textContent)
    } catch (e) {
      return {}
    }
  })()

  function t (key) {
    return Object.prototype.hasOwnProperty.call(texts, key) ? texts[key] : ''
  }

  // Os nomes dos controles da página entram nas frases pelos marcadores ({run}, {flow}...), com o texto que a
  // página mostra no idioma dela.
  function fill (key, values) {
    const names = {
      run: t('lab.actions.execute'),
      flow: t('ui.flow.title'),
      button: t('lab.token.use'),
      badge: t('lab.history.token_in_use'),
      replay: t('lab.flow.replay'),
      responses: t('lab.section.responses'),
      restore: t('lab.body.restore'),
      undo: t('lab.auth.undo'),
      server: t('lab.time.part.server'),
      open: t('lab.guide.open'),
      do: t('lab.guide.do'),
      ctrl: (q('#request .kbd-hint kbd') || { textContent: 'Ctrl' }).textContent,
      ...values
    }
    // Uma frase com um valor vazio ("O status code resume o resultado: .") não sai: o passo a deixa de fora.
    if (Object.keys(values || {}).some(name => values[name] === '' || values[name] === undefined || values[name] === null)) return ''
    return t(key).replace(/\{([a-z_]+)\}/g, (mark, name) => Object.prototype.hasOwnProperty.call(names, name) ? String(names[name]) : mark)
  }

  // A rota como a página a escreve: "post /login" vira "POST /login".
  const routeName = key => key.replace(/^[a-z]+/, method => method.toUpperCase())

  // Aprender deixando errar: com outra rota escolhida num passo que envia, o passo avisa e deixa enviar; esse
  // envio não conta.
  const wrongRoute = key => P.selected() && P.selected() !== key ? fill('lab.guide.wrong_route', { current: routeName(P.selected()), route: routeName(key) }) : ''

  // Um elemento com texto curto, em que `trecho` vira código.
  function el (tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) {
      String(text).split('`').forEach((piece, index) => {
        if (!piece) return
        if (index % 2) {
          const code = document.createElement('code')
          code.textContent = piece
          node.append(code)
        } else node.append(piece)
      })
    }
    return node
  }

  // O status como a página o escreve: "401 Unauthorized".
  function statusLine (code) {
    const name = /^\d+$/.test(code) ? core.statusText(Number(code)) : ''
    return name ? code + ' ' + name : code
  }

  /* ---------- Leitura da página (só pelos ganchos) ---------- */

  const P = {
    layout: () => document.documentElement.getAttribute('data-layout') || 'abas',
    selected: () => ($('request') && $('request').getAttribute('data-route')) || '',
    route: key => q('.route[data-key="' + key + '"]'),
    sending: () => !!$('run') && $('run').getAttribute('aria-busy') === 'true',
    // O id do último envio que a página despachou de fato (app.js grava em data-send ao enviar).
    lastSend: () => Number($('request') && $('request').getAttribute('data-send')) || 0,
    // O envio mostrado no Resultado; o status só existe depois do veredito do fluxo.
    shown () {
      const box = $('shown')
      if (!box || box.hidden || !box.getAttribute('data-record')) return null
      return { key: box.getAttribute('data-record'), status: box.getAttribute('data-status') || '', id: Number(box.getAttribute('data-send')) || 0 }
    },
    // O fim do fluxo: o veredito, ou "none" quando o envio terminou sem fluxo (sem resposta, sem o header de etapas).
    verdict () {
      const mark = q('#flow [data-verdict]')
      if (!mark || $('flow').hidden) return null
      return { kind: mark.getAttribute('data-verdict'), stage: mark.getAttribute('data-stage') || '', label: (q('.flow-summary-stage', mark) || mark).textContent.trim() }
    },
    // O envio mostrado terminou: a resposta chegou (ou falhou) e o fluxo chegou ao fim, com ou sem veredito.
    ended (key) {
      const shown = P.shown()
      return !P.sending() && !!shown && (!key || shown.key === key) && !!shown.status && !!P.verdict()
    },
    // Terminou com o fluxo desenhado: é o envio que os passos explicam.
    ready: key => P.ended(key) && P.verdict().kind !== 'none',
    // Enviada neste passo e ainda sem fim: a resposta pode ter chegado, mas a câmera lenta ainda desenha.
    inFlight (key) {
      const shown = P.shown()
      return P.sending() || (mine() && (!key || shown.key === key) && !P.ended(key))
    },
    status: () => (P.shown() || {}).status || '',
    flowOpen: () => !!$('flow-title') && $('flow-title').getAttribute('aria-expanded') !== 'false',
    stoppedStage () {
      const verdict = P.verdict()
      return verdict && verdict.kind === 'stopped' ? q('#flow .flow-stage[data-stage="' + CSS.escape(verdict.stage) + '"]') : null
    },
    stoppedRow: () => P.stoppedStage() ? q('.flow-row', P.stoppedStage()) : null,
    authValue: () => $('auth-input') ? $('auth-input').value.trim() : '',
    slow: () => !!$('run') && $('run').getAttribute('data-send-mode') === 'lenta',
    split: () => !!$('run-mode') && !$('run-mode').hidden,
    tokenInUse: () => !!$('token-done') || !!q('#history-body .entry[data-token-in-use]'),
    tabSelected: id => !!$(id) && $(id).getAttribute('aria-selected') === 'true',
    // A entrada mais recente de uma rota no Histórico, com (true) ou sem (false) o header Authorization.
    entry: (key, token) => q('#history-body .entry[data-key="' + key + '"]' + (token ? '[data-token="sent"]' : ':not([data-token])'))
  }

  /* ---------- Ações sobre os controles reais ---------- */

  function revealRoute (key) {
    if (P.layout() === 'abas' && !P.tabSelected('side-tab-rotas')) $('side-tab-rotas').click()
    const toggle = $('routes-toggle')
    if (visible(toggle) && toggle.getAttribute('aria-expanded') === 'false') toggle.click()
    const filter = $('filter')
    if (filter && filter.value && !visible(P.route(key))) {
      filter.value = ''
      filter.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  function revealHistory () {
    if (P.layout() === 'abas' && !P.tabSelected('side-tab-historico')) $('side-tab-historico').click()
  }

  // force: clica mesmo com a rota já escolhida (Fazer por mim faz a ação do passo, que só conta nele).
  async function selectRoute (key, force) {
    revealRoute(key)
    await wait(60)
    const route = P.route(key)
    if (route && (force || P.selected() !== key)) {
      route.click()
      await wait(250)
    }
  }

  // Envia e volta assim que o envio termina, com ou sem veredito. Se a página recusou o envio (Authorization
  // inválido, outro envio em andamento), nada saiu e não há o que esperar.
  async function execute (key) {
    if (key && P.selected() !== key) await selectRoute(key)
    if (!$('run') || P.sending()) return
    const before = P.lastSend()
    $('run').click()
    const id = P.lastSend()
    if (id === before) return
    await waitFor(() => !P.sending() && (!P.shown() || P.shown().id !== id || P.ended()), 40000)
  }

  function showResponseTab () {
    if ($('res-tab-resposta') && !P.tabSelected('res-tab-resposta')) $('res-tab-resposta').click()
  }

  function expandFlow () {
    if (!P.flowOpen() && $('flow-title')) $('flow-title').click()
  }

  // Tira o valor de Authorization sem deixar a rota editada ("Desfazer a edição" e depois "Descartar o token"):
  // editada, a rota não receberia o token novo do passo 6.
  async function clearAuth () {
    for (const button of [() => $('auth-undo'), () => $('auth-discard')]) {
      if (P.authValue() && visible(button())) {
        button().click()
        await wait(150)
      }
    }
  }

  // Regra dos passos: um passo só fica feito com a ação feita DURANTE ele. O que a página já tinha ao entrar
  // (envios antigos, fluxo fechado, token em uso) nunca conta. G.ev guarda o que a pessoa (ou Fazer por mim,
  // que clica nos mesmos controles) fez no passo, e zera a cada troca de passo.
  // Um envio neste passo é um envio que a página despachou depois da entrada no passo (data-send cresceu): um
  // clique ou um Ctrl + Enter que a página ignorou não conta, nem um envio que já estava a caminho.
  const sent = () => P.lastSend() > G.sendAt
  // O envio mostrado no Resultado saiu neste passo.
  const mine = () => !!P.shown() && P.shown().id > G.sendAt
  const doneSend = key => mine() && P.ready(key)
  // O envio deste passo terminou sem fluxo, em qualquer rota: o passo diz isso e deixa Executar ativo.
  const failedSend = () => mine() && P.ended() && P.verdict().kind === 'none'
  const noFlow = () => failedSend() ? fill('lab.guide.no_flow') : ''

  document.addEventListener('click', event => {
    if (!G.open || G.mode !== 'step' || !event.target.closest) return
    const target = event.target
    if (target.closest('#run-mode')) G.ev.menu = true
    if (target.closest('#flow-title')) G.ev.title = true
    if (target.closest('#flow .flow-row')) G.ev.row = true
    if (target.closest('.tl-seg[data-part="server"], .tl-call[data-part="server"]')) G.ev.server = true
    if (target.closest('#use-token')) G.ev.useToken = true
    const route = target.closest('.route[data-key]')
    if (route) G.ev.routes[route.getAttribute('data-key')] = true
  }, true)

  /* ---------- Os passos ---------- */

  // Depois do clique em Executar o destaque vai para o Resultado, onde o fluxo é desenhado. Só um envio deste
  // passo leva o destaque para lá: um resultado antigo na tela não conta.
  const runOrFlow = key => sent() && !failedSend() && (P.inFlight(key) || doneSend(key)) ? [$('shown'), $('flow')] : [$('run-split'), visible($('run-menu')) ? $('run-menu') : null]
  const historyTargets = () => {
    const first = q('#history-body > li')
    return first ? [q('#history .zone-head'), first] : [$('history')]
  }
  const waiting = key => () => sent() && P.inFlight(key) ? fill('lab.guide.waiting') : ''

  // O envio de POST /carrinhos mostrado no Resultado foi feito neste passo e levou o header Authorization.
  function withToken () {
    return doneSend(CART) && !!q('#history-body .entry[aria-current="true"][data-token="sent"][data-key="' + CART + '"]')
  }

  // POST /login, neste passo: clicada, enviada com 200 e o token usado.
  const loginPicked = () => !!G.ev.routes[LOGIN] || (sent() && P.selected() === LOGIN)
  const loginDone = () => doneSend(LOGIN) && P.status() === '200'
  const tokenUsed = () => !!G.ev.useToken && !!$('token-done')
  // O login enviado neste passo voltou sem token. Com o corpo do exemplo (Restaurar exemplo escondido), quem
  // mudou foi o usuário de exemplo, no banco compartilhado: os passos que pedem o token passam a só explicar.
  function loginFailure () {
    if (failedSend()) return noFlow()
    if (!doneSend(LOGIN) || P.status() === '200') return ''
    if (visible($('body-restore'))) return fill('lab.guide.learn.token_edited', { status: statusLine(P.status()) })
    G.loginBroken = true
    return fill('lab.guide.learn.token_shared', { status: statusLine(P.status()) })
  }
  const noToken = () => G.loginBroken && !P.tokenInUse()
  // Authorization vazio por edição da pessoa: o token da página não chega a esta rota até "Desfazer a edição".
  const emptyEdited = () => P.selected() === CART && !P.authValue() && visible($('auth-undo'))

  const LEARN = {
    id: 'learn',
    name: 'lab.guide.learn.name',
    about: 'lab.guide.learn.about',
    end: ['lab.guide.learn.end'],
    offer: 'tour',
    steps: [
      {
        title: 'lab.guide.learn.route_title',
        label: () => 'POST /carrinhos',
        prepare: () => revealRoute(CART),
        targets: () => [P.route(CART)],
        paras: () => [fill('lab.guide.learn.route_p1')],
        tasks: () => [{ text: fill('lab.guide.task_route', { route: 'POST /carrinhos' }), done: !!G.ev.routes[CART] && P.selected() === CART }],
        doIt: () => selectRoute(CART, true)
      },
      {
        title: 'lab.guide.learn.request_title',
        label: () => t('lab.request.title'),
        // Só explica, mas o link "O que é POST?" fica ativo; Executar segue coberto pelo escudo.
        openLinks: () => [q('#request .req-hint .method-link')],
        targets: () => [q('#request .req-bar'), q('#request .req-hint .method-link'), $('auth-group')],
        paras: () => [fill('lab.guide.learn.request_p1'), fill(P.authValue() ? 'lab.guide.learn.request_on' : 'lab.guide.learn.request_off')],
        needs: { test: () => P.selected() === CART, fix: () => selectRoute(CART) }
      },
      {
        title: 'lab.guide.learn.send_title',
        label: () => t('lab.actions.execute'),
        // Com um valor em Authorization, o campo e os botões dele entram no destaque, para a pessoa tirar o valor.
        targets: () => runOrFlow(CART).concat(P.authValue() && !sent() ? [$('auth-group')] : []),
        paras: () => [fill(!P.split() ? 'lab.guide.mode_reduced' : P.slow() ? 'lab.guide.learn.send_slow' : 'lab.guide.learn.send_normal')],
        warn: () => noFlow() || wrongRoute(CART) || (P.authValue() && !sent() ? fill('lab.guide.learn.send_warn') : ''),
        waiting: waiting(CART),
        tasks: () => [{ text: fill('lab.guide.task_run'), done: doneSend(CART) }],
        doIt: async () => {
          await selectRoute(CART)
          await clearAuth()
          await execute(CART)
        }
      },
      {
        title: 'lab.guide.learn.stop_title',
        label: () => t('ui.flow.title'),
        prepare: expandFlow,
        targets: () => [q('#flow .flow-summary'), q('#flow .flow-stages')],
        // A etapa inteira (a linha e o porquê que ela abre), para caber à vista com o painel aberto.
        anchor: () => P.stoppedStage() || q('#flow .flow-summary'),
        paras: () => {
          const verdict = P.verdict() || {}
          return [fill('lab.guide.learn.stop_p1'), verdict.kind === 'stopped' ? fill('lab.guide.learn.stop_stopped', { stage: verdict.label }) : verdict.kind === 'completed' ? fill('lab.guide.learn.stop_completed') : '']
        },
        tasks: () => {
          const verdict = P.verdict() || {}
          const row = P.stoppedRow()
          return verdict.kind === 'stopped'
            ? [{ text: fill('lab.guide.task_stage', { stage: verdict.label }), done: !!G.ev.row && !!row && row.getAttribute('aria-expanded') === 'true' }]
            : [{ text: t('lab.flow.hint'), done: !!G.ev.row && !!q('#flow .flow-row[aria-expanded="true"]') }]
        },
        // A etapa já estava aberta ao entrar: o clique a fecharia, então o passo só explica.
        preDone: () => !!P.stoppedRow() && P.stoppedRow().getAttribute('aria-expanded') === 'true',
        preText: 'lab.guide.learn.stop_pre',
        needs: { test: () => P.ready(CART), fix: () => execute(CART) },
        doIt: async () => {
          expandFlow()
          await wait(150)
          const row = P.stoppedRow() || q('#flow .flow-row')
          if (row && row.getAttribute('aria-expanded') !== 'true') row.click()
          await wait(200)
        }
      },
      {
        title: 'lab.guide.learn.status_title',
        label: () => t('lab.response.title'),
        prepare: showResponseTab,
        targets: () => [q('#res-body-area .res-line'), q('#res-body-area .res-body'), contentType()],
        anchor: () => [q('#res-body-area .res-line'), contentType()],
        openLinks: () => [q('#res-body-area .status-link'), contentType()],
        paras: () => {
          const status = P.status()
          return [fill(status === '401' ? 'lab.guide.learn.status_401' : 'lab.guide.learn.status_p1', { status: statusLine(status) }), fill('lab.guide.learn.status_p2')]
        },
        needs: { test: () => P.ready(), fix: () => execute(CART) }
      },
      {
        title: 'lab.guide.learn.token_title',
        // O destaque e o anúncio seguem a próxima tarefa: a rota, Executar (e o fluxo) e o botão do token.
        label: () => !loginPicked() ? 'POST /login' : !loginDone() ? t('lab.actions.execute') : t('lab.token.use'),
        prepare: () => { if (P.selected() !== LOGIN) revealRoute(LOGIN) },
        targets: () => !loginPicked() ? [P.route(LOGIN)] : !loginDone() ? runOrFlow(LOGIN) : [q('#res-body-area .res-body'), $('use-token') || $('token-done')],
        anchor: () => loginDone() ? $('use-token') || $('token-done') : null,
        paras: () => [fill('lab.guide.learn.token_p1')],
        warn: () => loginFailure() || (loginPicked() && !loginDone() ? wrongRoute(LOGIN) : ''),
        // O login voltou sem token no servidor compartilhado: o passo não tem como terminar e o Próximo segue.
        stuck: () => G.loginBroken,
        waiting: waiting(LOGIN),
        tasks: () => [
          { text: fill('lab.guide.task_route', { route: 'POST /login' }), done: loginPicked() },
          { text: fill('lab.guide.task_run'), done: loginDone() },
          { text: fill('lab.guide.task_use'), done: tokenUsed() }
        ],
        // O token desta resposta já estava em uso ao entrar: no lugar do botão, a página confirma.
        preDone: () => P.selected() === LOGIN && !!$('token-done'),
        preText: 'lab.guide.learn.token_pre',
        doIt: async () => {
          if (!loginPicked()) await selectRoute(LOGIN, true)
          if (!loginDone()) {
            if (visible($('body-restore'))) {
              $('body-restore').click()
              await wait(120)
            }
            await execute(LOGIN)
          }
          if (loginDone() && $('use-token')) {
            showResponseTab()
            await wait(60)
            $('use-token').click()
            await wait(200)
          }
        }
      },
      {
        title: 'lab.guide.learn.again_title',
        // Sem token (o login não deu), o passo só explica.
        explain: noToken,
        label: () => noToken() || (!G.ev.routes[CART] && !sent()) ? 'POST /carrinhos' : sent() ? t('ui.flow.title') : t('lab.actions.execute'),
        prepare: () => { if (P.selected() !== CART) revealRoute(CART) },
        // O Resultado ainda mostra o envio sem token do começo: o destaque só vai para o fluxo depois do novo envio.
        targets: () => {
          if (noToken() || (!G.ev.routes[CART] && !sent())) return [P.route(CART)]
          if (sent() && !failedSend() && (withToken() || P.inFlight(CART))) return [$('shown'), $('flow')]
          return [$('run-split')].concat(emptyEdited() ? [$('auth-group')] : [])
        },
        anchor: () => withToken() && P.stoppedStage() ? P.stoppedStage() : null,
        paras: () => {
          const verdict = P.verdict() || {}
          const out = [fill('lab.guide.learn.again_p1')]
          if (noToken()) out.push(fill('lab.guide.learn.no_token'))
          else if (withToken()) {
            const values = { stage: verdict.label, status: statusLine(P.status()) }
            if (verdict.kind === 'stopped') out.push(fill(verdict.stage === 'rules' ? 'lab.guide.learn.again_rules' : 'lab.guide.learn.again_stopped', values))
            else if (verdict.kind === 'completed') out.push(fill('lab.guide.learn.again_completed', values))
          }
          return out
        },
        warn: () => {
          if (noFlow() || noToken() || withToken() || (!G.ev.routes[CART] && !sent())) return noFlow()
          return wrongRoute(CART) || (P.authValue() || P.inFlight(CART) ? '' : fill(emptyEdited() ? 'lab.guide.learn.again_undo' : 'lab.guide.learn.again_warn'))
        },
        waiting: waiting(CART),
        tasks: () => {
          const verdict = P.verdict() || {}
          const row = P.stoppedRow()
          const list = [
            { text: fill('lab.guide.task_route', { route: 'POST /carrinhos' }), done: !!G.ev.routes[CART] || withToken() },
            { text: fill('lab.guide.task_run'), done: withToken() }
          ]
          if (withToken() && verdict.kind === 'stopped') list.push({ text: fill('lab.guide.task_stage', { stage: verdict.label }), done: !!G.ev.row && !!row && row.getAttribute('aria-expanded') === 'true' })
          return list
        },
        doIt: async () => {
          if (!withToken()) {
            await selectRoute(CART, !G.ev.routes[CART])
            if (emptyEdited()) {
              $('auth-undo').click()
              await wait(150)
            }
            await execute(CART)
          }
          expandFlow()
          await wait(150)
          const row = P.stoppedRow()
          if (row && row.getAttribute('aria-expanded') !== 'true') row.click()
          await wait(200)
        }
      },
      {
        title: 'lab.guide.learn.history_title',
        label: () => t('lab.history.title'),
        interactive: true,
        prepare: revealHistory,
        // Os dois envios de POST /carrinhos (com e sem o header Authorization) e o login do selo token em uso.
        targets: () => {
          const picks = [P.entry(CART, true), q('#history-body .entry[data-token-in-use]'), P.entry(CART, false)].filter(Boolean)
          return picks.length > 1 ? [q('#history .zone-head'), ...picks] : historyTargets()
        },
        paras: () => [fill(P.entry(CART, true) && P.entry(CART, false) ? 'lab.guide.learn.history_compare' : 'lab.guide.history_p1'), fill('lab.guide.learn.history_p2')]
      },
      {
        title: 'lab.guide.learn.docs_title',
        label: () => t('lab.section.responses'),
        prepare: () => { if (P.selected() !== CART) revealRoute(CART) },
        targets: () => [q('#sec-responses .band'), ...qa('#sec-responses .doc-code')],
        anchor: () => [q('#sec-responses .band'), q('#sec-responses .doc-code')],
        openLinks: () => qa('#sec-responses .doc-code a[href]'),
        paras: () => [fill('lab.guide.learn.docs_p1')],
        needs: { test: () => P.selected() === CART, fix: () => selectRoute(CART) }
      }
    ]
  }

  // O link do header content-type na resposta (o MDN escreve Content-Type, nos três idiomas).
  const contentType = () => q('#res-body-area .res-headers dt a[href$="/Content-Type"]')

  const TOUR = {
    id: 'tour',
    name: 'lab.guide.tour.name',
    about: 'lab.guide.tour.about',
    end: ['lab.guide.tour.end', 'lab.guide.where'],
    offer: 'learn',
    steps: [
      {
        title: 'lab.guide.tour.run_title',
        label: () => t('lab.actions.execute'),
        // O botão e o menu ficam ativos o tempo todo; depois do envio, o fluxo ganha um recorte próprio.
        separate: true,
        targets: () => [$('run-split'), visible($('run-menu')) ? $('run-menu') : null].concat(sent() && !failedSend() ? [$('shown'), $('flow')] : []),
        anchor: () => [$('run-split'), visible($('run-menu')) ? $('run-menu') : null],
        paras: () => [fill(P.split() ? 'lab.guide.tour.run_p1' : 'lab.guide.mode_reduced'), fill('lab.guide.tour.run_p2')],
        warn: () => noFlow(),
        waiting: waiting(),
        tasks: () => [
          P.split() ? { text: fill('lab.guide.tour.run_menu'), done: !!G.ev.menu } : null,
          { text: fill('lab.guide.task_run'), done: doneSend() }
        ].filter(Boolean),
        doIt: async () => {
          if (!G.ev.menu && P.split()) {
            $('run-mode').click()
            await wait(1400)
            if (visible($('run-menu'))) $('run-mode').click()
            await wait(200)
          }
          // Um envio deste passo que terminou sem fluxo não serve: o botão envia de novo.
          if (!sent() || failedSend()) await execute(P.selected() || LOGIN)
        }
      },
      {
        title: 'lab.guide.tour.flow_title',
        label: () => t('ui.flow.title'),
        interactive: true,
        prepare: expandFlow,
        targets: () => [q('#flow .band'), q('#flow .flow-stages')],
        paras: () => [fill('lab.guide.tour.flow_p1')],
        needs: { test: () => P.ready(), fix: () => execute(P.selected() || LOGIN) }
      },
      {
        title: 'lab.guide.tour.close_title',
        label: () => t('ui.flow.title'),
        // O título pisca de leve para chamar o clique; com menos movimento, nada.
        attention: () => $('flow-title'),
        targets: () => [$('flow')],
        anchor: () => $('flow-title'),
        paras: () => [fill('lab.guide.tour.close_p1')],
        tasks: () => [{ text: fill('lab.guide.tour.close_task'), done: !!G.ev.title && !P.flowOpen() }],
        // Já fechado ao entrar: o clique o abriria, então o passo só explica.
        preDone: () => !P.flowOpen(),
        preText: 'lab.guide.tour.close_pre',
        needs: { test: () => P.ready(), fix: () => execute(P.selected() || LOGIN) },
        doIt: async () => {
          if (P.flowOpen()) $('flow-title').click()
          await wait(200)
        }
      },
      {
        title: 'lab.guide.tour.time_title',
        label: () => t(P.flowOpen() ? 'lab.time.part.total' : 'ui.flow.title'),
        targets: () => P.flowOpen() ? [q('#flow figure.tl'), visible($('tl-pop')) ? $('tl-pop') : null] : [q('#flow .band')],
        anchor: () => P.flowOpen() ? [q('#flow figure.tl'), visible($('tl-pop')) ? $('tl-pop') : null] : $('flow-title'),
        openLinks: () => qa('#tl-pop a[href]'),
        paras: () => [fill('lab.guide.tour.time_p1')],
        tasks: () => [
          G.entry.flowOpen ? null : { text: fill('lab.guide.tour.time_open'), done: !!G.ev.title && P.flowOpen() },
          { text: fill('lab.guide.tour.time_server'), done: P.flowOpen() && !!G.ev.server && !!q('.tl-seg[data-part="server"][aria-expanded="true"]') }
        ].filter(Boolean),
        // O balão de servidor já aberto ao entrar: o clique o fecharia, então o passo só explica.
        preDone: () => P.flowOpen() && !!q('.tl-seg[data-part="server"][aria-expanded="true"]'),
        preText: 'lab.guide.tour.time_pre',
        needs: { test: () => P.ready(), fix: () => execute(P.selected() || LOGIN) },
        doIt: async () => {
          expandFlow()
          await wait(250)
          const segment = q('#flow .tl-seg[data-part="server"]')
          if (segment && segment.getAttribute('aria-expanded') !== 'true') segment.click()
          await wait(200)
        }
      },
      {
        title: 'lab.guide.tour.history_title',
        label: () => t('lab.history.title'),
        interactive: true,
        prepare: revealHistory,
        targets: historyTargets,
        paras: () => [fill('lab.guide.history_p1'), fill(P.tokenInUse() ? 'lab.guide.tour.history_on' : 'lab.guide.tour.history_off')]
      }
    ]
  }
  const PATHS = { learn: LEARN, tour: TOUR }

  /* ---------- Estado e elementos do guia ---------- */

  const G = { open: false, path: null, index: -1, mode: null, ev: { routes: {} }, sendAt: 0, entry: {}, pre: false, busy: false, sig: '', targetKey: null, loginBroken: false, attnTimer: null, blocked: false, complete: false, doneSteps: {}, moving: null, moveId: 0, going: false, front: 0, holes: [], pos: null, nextKey: null, keyFrames: 0 }
  let shield, card, live
  let frame = 0
  let lastRender = 0
  // Duas camadas escuras: o recorte anda numa só; quando não dá para andar (o antigo ou o novo fora da janela,
  // ou um número diferente de recortes), uma some enquanto a outra aparece.
  const layers = []
  const EASE = 'cubic-bezier(0.2, 0, 0, 1)'

  function node (tag, className, attributes) {
    const item = document.createElement(tag)
    item.className = className
    Object.keys(attributes || {}).forEach(name => item.setAttribute(name, attributes[name]))
    item.setAttribute('data-guide', '')
    return item
  }

  function button (className, act, text) {
    const item = el('button', className, text)
    item.type = 'button'
    if (act) item.setAttribute('data-act', act)
    return item
  }

  const block = event => {
    event.preventDefault()
    event.stopPropagation()
  }

  function layer () {
    const box = node('div', 'guide-layer')
    const shade = node('div', 'guide-shade')
    box.hidden = true
    box.append(shade)
    // Clicar fora: nada acontece na página, e o Fechar pulsa para mostrar a saída.
    shade.addEventListener('pointerdown', event => {
      event.preventDefault()
      nudgeClose()
    })
    shade.addEventListener('click', block)
    return { box, shade, rings: [] }
  }

  function build () {
    layers.push(layer(), layer())
    shield = node('div', 'guide-shield')
    card = node('div', 'guide-card', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'guide-title', 'aria-describedby': 'guide-body' })
    const close = button('btn', 'close', t('lab.guide.close') + ' ')
    close.id = 'guide-close'
    close.append(el('span', '', '×'))
    close.lastChild.setAttribute('aria-hidden', 'true')
    const head = el('div', 'guide-head')
    const kicker = el('span', 'guide-kicker')
    kicker.id = 'guide-kicker'
    head.append(kicker, close)
    const progress = el('div', 'guide-progress')
    progress.setAttribute('aria-hidden', 'true')
    progress.append(el('span'))
    const title = el('h2', 'guide-title')
    title.id = 'guide-title'
    title.tabIndex = -1
    const body = el('div', 'guide-body')
    body.id = 'guide-body'
    const hint = el('p', 'guide-exit-hint', t('lab.guide.exit_hint'))
    hint.hidden = true
    const foot = el('div', 'guide-foot')
    live = el('p', 'sr-only')
    live.setAttribute('aria-live', 'polite')
    card.append(head, progress, title, body, hint, foot, live)
    card.hidden = true
    card.style.opacity = '0'
    document.body.append(...layers.map(item => item.box), shield, card)
    shield.addEventListener('pointerdown', event => event.preventDefault())
    shield.addEventListener('click', block)
    card.addEventListener('click', onCardClick)
  }

  const part = name => q('.guide-' + name, card)

  // Tira e põe a classe da animação, com um reflow no meio, para ela tocar de novo a cada clique.
  function replay (target, className) {
    target.classList.remove(className)
    target.getBoundingClientRect()
    target.classList.add(className)
  }

  function nudgeClose () {
    const close = $('guide-close')
    replay(close, 'guide-nudge')
    part('exit-hint').hidden = false
    clearTimeout(nudgeClose.timer)
    nudgeClose.timer = setTimeout(() => close.classList.remove('guide-nudge'), 1200)
  }

  // Abre na tela de boas-vindas ou, com um caminho, direto no primeiro passo dele.
  function open (path) {
    if (G.open) return
    G.open = true
    if (!card) build()
    card.hidden = false
    G.front = 0
    G.holes = []
    paint(layers[0], [], 0)
    paint(layers[1], [], 0)
    loop()
    G.doneSteps = {}
    if (!path) return showChoice()
    G.path = path
    goTo(0)
  }

  function close () {
    if (!G.open) return
    G.open = false
    // Um "Fazer por mim" em andamento para na próxima espera, e o guia reaberto começa livre.
    generation++
    G.moveId++
    G.busy = false
    G.going = false
    clearAttention()
    cancelAnimationFrame(frame)
    release()
    card.getAnimations().forEach(item => item.cancel())
    for (const item of layers) paint(item, [], 0)
    shield.style.display = 'none'
    card.hidden = true
    card.style.opacity = '0'
    document.body.style.paddingBottom = ''
    G.path = null
    G.index = -1
    G.mode = null
    G.pos = null
    G.loginBroken = false
    G.doneSteps = {}
    if ($('guide-open')) $('guide-open').focus()
  }

  /* ---------- Isolamento: inert fora do cartão e do que o passo deixa ativo ---------- */

  // Para cada elemento mantido, os irmãos de cada nível até o body ficam inert. Refeito a cada leitura do passo
  // (o destaque muda, a página redesenha uma parte); só volta ao normal o que o guia marcou, porque a página
  // também usa inert (a barra de tempo presa até o veredito).
  const marked = new Set()

  function isolate (keep) {
    const kept = keep.filter(item => item && item.isConnected)
    const roots = kept.filter(item => !kept.some(other => other !== item && other.contains(item)))
    const path = new Set()
    roots.forEach(item => {
      for (let at = item; at && at !== document.body; at = at.parentElement) path.add(at)
    })
    const want = new Set()
    path.forEach(at => {
      Array.from(at.parentElement ? at.parentElement.children : []).forEach(sibling => {
        if (!path.has(sibling) && !sibling.hasAttribute('data-guide')) want.add(sibling)
      })
    })
    marked.forEach(item => {
      if (want.has(item)) return
      item.inert = false
      marked.delete(item)
    })
    want.forEach(item => {
      if (marked.has(item) || item.inert) return
      item.inert = true
      marked.add(item)
    })
  }

  function release () {
    marked.forEach(item => { item.inert = false })
    marked.clear()
  }

  // O que fica ativo: o cartão, a região de anúncios da página e, num passo de ação, os destaques; num passo
  // que só explica, os links que ele lista.
  function keepList () {
    const list = [card, $('announcer')]
    if (G.mode !== 'step') return list
    const s = step()
    let extra = []
    try {
      extra = acts(s) ? currentTargets() : (s.openLinks ? s.openLinks().filter(visible) : [])
    } catch (e) {}
    return list.concat(extra)
  }

  /* ---------- Telas: escolha, passo, fim ---------- */

  function choice (path) {
    const item = button('guide-choice')
    item.setAttribute('data-path', path.id)
    item.append(el('strong', '', t(path.name)), el('span', '', fill(path.about, { count: path.steps.length })))
    return item
  }

  function setHead (kicker, progress, title) {
    part('kicker').replaceChildren(...kicker)
    q('.guide-progress span', card).style.width = progress + '%'
    part('title').textContent = title
  }

  // Abrir, trocar de caminho ou voltar dele: a tela de escolha, sem destaque.
  async function showChoice () {
    await screen(() => {
      G.mode = 'choice'
      G.path = null
      G.index = -1
      G.sig = ''
      setHead([t('lab.guide.open')], 0, t('lab.guide.choose_title'))
      const list = el('div')
      list.append(choice(LEARN), choice(TOUR))
      part('body').replaceChildren(el('p', '', t('lab.guide.choose_intro')), list)
      part('foot').replaceChildren()
      part('exit-hint').hidden = true
    })
  }

  async function showEnd () {
    await screen(() => {
      const path = PATHS[G.path]
      G.mode = 'end'
      G.sig = ''
      setHead([t(path.name)], 100, t('lab.guide.end_title'))
      const list = el('div')
      list.append(choice(PATHS[path.offer]))
      part('body').replaceChildren(...path.end.map(key => el('p', '', fill(key))), list)
      part('foot').replaceChildren(button('btn', 'back', t('lab.guide.back')), el('span', 'guide-grow'), button('btn btn-primary', 'close', t('lab.guide.close')))
      part('exit-hint').hidden = true
    })
  }

  // Uma tela sem destaque (escolha ou fim): o "Fazer por mim" em andamento para, e o cartão troca sumido.
  async function screen (render) {
    if (G.going) return
    G.going = true
    try {
      if (G.moving) await G.moving
      clearAttention()
      generation++
      G.busy = false
      G.mode = 'wait'
      await move(render, true)
    } finally {
      G.going = false
    }
  }

  function step () {
    return PATHS[G.path].steps[G.index]
  }

  // Um passo pede uma ação quando tem tarefas a fazer agora (não as já feitas ao entrar, nem as de um passo que
  // ficou só para explicar) ou quando convida a mexer no destaque (interactive).
  function acts (s) {
    return !!s.interactive || (!!s.tasks && !G.pre && !(s.explain && s.explain()))
  }

  function clearAttention () {
    qa('.guide-attn').forEach(item => item.classList.remove('guide-attn'))
    clearTimeout(G.attnTimer)
  }

  function startAttention (s) {
    if (!s.attention || reduced()) return
    // Depois da rolagem até o passo, para a pessoa ver a piscada.
    G.attnTimer = setTimeout(() => {
      const target = s.attention()
      if (!target || !G.open) return
      target.classList.add('guide-attn')
      target.addEventListener('animationend', () => target.classList.remove('guide-attn'), { once: true })
    }, 600)
  }

  async function goTo (index) {
    // Um clique a mais no Próximo enquanto o passo se prepara não pula um passo.
    if (G.going) return
    const steps = PATHS[G.path].steps
    if (index >= steps.length) return showEnd()
    if (index < 0) return showChoice()
    G.going = true
    try {
      // Uma troca de destaque dentro do passo termina antes: o cartão nunca está em duas viagens.
      if (G.moving) await G.moving
      clearAttention()
      const s = steps[index]
      // Enquanto o passo se prepara, nada dele vale ainda: nem destaque, nem cliques contados. Um "Fazer por mim"
      // do passo anterior para aqui.
      const started = ++generation
      G.busy = false
      G.mode = 'wait'
      // O preparo (abrir a lista, o fluxo, a aba) corre enquanto o cartão some.
      if (s.prepare) {
        try {
          s.prepare()
        } catch (e) {}
      }
      await move(() => {
        if (started !== generation) return
        Object.assign(G, { mode: 'step', index, sig: '', targetKey: null, blocked: false })
        part('exit-hint').hidden = true
        // Um passo já feito nesta volta do guia continua feito: ao voltar a ele, as tarefas aparecem marcadas e o
        // Próximo só segue. O resto começa do zero: nada feito antes conta. Se a ação já estiver feita na página e
        // não der para refazer, o passo só explica (preDone).
        const memory = G.doneSteps[index]
        G.complete = !!memory
        if (memory) Object.assign(G, memory)
        else {
          G.ev = { routes: {} }
          G.sendAt = P.lastSend()
          G.entry = { flowOpen: P.flowOpen() }
          G.pre = false
          try {
            G.pre = !!(s.preDone && s.preDone())
          } catch (e) {}
        }
        const n = index + 1
        setHead([el('b', '', fill('lab.guide.step', { n, total: steps.length })), el('span', '', t(PATHS[G.path].name))], (n / steps.length) * 100, t(s.title))
        part('foot').replaceChildren(button('btn', 'back', t('lab.guide.back')), el('span', 'guide-grow'), button('btn guide-do', 'do', t('lab.guide.do')),
          button('btn btn-primary', 'next', t('lab.guide.next')))
        renderBody(true)
      }, true)
      if (started !== generation || !G.open) return
      announceTarget()
      startAttention(s)
    } finally {
      G.going = false
    }
  }

  function announceTarget () {
    if (G.mode === 'step') live.textContent = fill('lab.guide.highlight', { label: step().label() })
  }

  // A primeira tarefa que falta num passo em que a pessoa ainda pode agir; sem ela, o Próximo só segue. Um passo
  // que só explica (sem tarefas, já feito ao entrar, sem token, o login quebrado) nunca segura o Próximo.
  function pendingTask (s, tasks) {
    if (G.complete || G.pre || !s.tasks || (s.explain && s.explain()) || (s.stuck && s.stuck())) return null
    return (tasks || s.tasks().filter(task => task.text)).find(task => !task.done) || null
  }

  const plain = text => text.replace(/`/g, '')

  // O corpo do passo só é refeito quando o que ele mostra muda: o foco e a leitura ficam estáveis.
  function renderBody (force) {
    if (G.mode !== 'step') return
    const s = step()
    const missing = !!s.needs && !s.needs.test() && !G.busy
    const explain = !!s.explain && s.explain()
    // Voltando a um passo feito, as tarefas dele aparecem marcadas.
    const tasks = (s.tasks && !G.pre && !explain ? s.tasks() : []).filter(task => task.text).map(task => G.complete ? { ...task, done: true } : task)
    const done = tasks.length > 0 && tasks.every(task => task.done)
    // Feito uma vez, o passo fica feito: fechar o balão ou o menu depois não desmarca a tarefa.
    if (done && !G.complete) {
      G.doneSteps[G.index] = { ev: G.ev, sendAt: G.sendAt, entry: G.entry, pre: G.pre }
      G.complete = true
    }
    const pending = pendingTask(s, tasks)
    if (!pending) G.blocked = false
    const warn = G.complete ? '' : missing ? fill('lab.guide.needs') : (s.warn ? s.warn() : '')
    const wait = !done && s.waiting ? s.waiting() : ''
    const paras = s.paras().concat(G.pre && s.preText ? [fill(s.preText)] : []).filter(Boolean)
    const falta = G.blocked ? fill('lab.guide.missing', { task: pending.text }) : ''
    const sig = JSON.stringify([paras, tasks, warn, wait, done, G.busy, falta])
    isolate(keepList())
    if (!force && sig === G.sig) return
    const wasDone = !!G.sig && JSON.parse(G.sig)[4]
    G.sig = sig
    const body = paras.map(text => el('p', '', text))
    if (tasks.length) {
      const list = el('ul', 'guide-tasks')
      tasks.forEach(task => {
        const item = el('li', task.done ? 'is-done' : task === pending && G.blocked ? 'is-now is-missing' : task === pending ? 'is-now' : '')
        const mark = el('span', 'guide-mark', task.done ? '✓' : '')
        mark.setAttribute('aria-hidden', 'true')
        item.append(mark, el('span', '', task.text), el('span', 'sr-only', task.done ? ' ' + t('lab.guide.task_done') : ''))
        list.append(item)
      })
      body.push(list)
    }
    if (falta) body.push(el('p', 'guide-warn guide-missing', falta))
    if (warn) body.push(el('p', 'guide-warn', warn))
    if (wait) body.push(el('p', 'guide-wait', wait))
    if (done) body.push(el('p', 'guide-done', t('lab.guide.done')))
    part('body').replaceChildren(...body)
    if (!force) keepInBand()
    // Na segunda vez, o Próximo faz a tarefa que falta e segue: o rótulo diz isso, e o "Fazer por mim" sai.
    q('[data-act="next"]', card).textContent = t(G.blocked ? 'lab.guide.do_next' : 'lab.guide.next')
    const doButton = q('[data-act="do"]', card)
    doButton.hidden = G.blocked || G.complete || (G.pre && !missing) || (explain && !missing) || !(s.doIt || missing) || (done && !missing)
    doButton.toggleAttribute('aria-busy', G.busy)
    if (G.busy) doButton.setAttribute('aria-disabled', 'true')
    else doButton.removeAttribute('aria-disabled')
    if (done && !wasDone && !force) live.textContent = t('lab.guide.done')
  }

  // "Fazer por mim": clica nos mesmos controles que a pessoa clicaria. Devolve false se o guia mudou de tela
  // no meio (fechou, outro passo).
  async function doStep (s) {
    const started = generation
    G.busy = true
    renderBody(true)
    try {
      if (s.needs && !s.needs.test()) await s.needs.fix()
      if (s.doIt) await s.doIt()
      if (s.prepare) s.prepare()
    } catch (error) {
      // Fechado, ou outro passo: a ação parou no meio, de propósito. Um erro de verdade não pode deixar o
      // botão preso em "ocupado".
      if (error !== CANCELLED) {
        if (started === generation) G.busy = false
        throw error
      }
    }
    // Só a ação da tela atual mexe no cartão; uma cancelada já foi largada por quem mudou a geração.
    if (started !== generation) return false
    G.busy = false
    renderBody(true)
    return true
  }

  async function onCardClick (event) {
    const picked = event.target.closest('.guide-choice')
    if (picked) {
      G.path = picked.getAttribute('data-path')
      G.loginBroken = false
      G.doneSteps = {}
      return goTo(0)
    }
    const control = event.target.closest('[data-act]')
    if (!control) return
    const kind = control.getAttribute('data-act')
    if (kind === 'close') return close()
    if (kind === 'back') return goTo(G.mode === 'end' ? PATHS[G.path].steps.length - 1 : G.index - 1)
    if (kind === 'next') {
      if (G.mode !== 'step') return
      if (G.busy) return
      const s = step()
      const pending = pendingTask(s)
      if (!pending) return goTo(G.index + 1)
      // Primeiro clique sem a ação feita: não segue; mostra o que falta, e o foco fica no botão.
      if (!G.blocked) {
        G.blocked = true
        renderBody(true)
        live.textContent = plain(fill('lab.guide.missing', { task: pending.text }))
        return
      }
      // Segundo clique: faz a ação, espera todas as tarefas e segue. Se não deu (o envio falhou), fica no passo,
      // com o aviso de sempre.
      const started = generation
      if (!(await doStep(s))) return
      try {
        await waitFor(() => !pendingTask(s), 2500)
      } catch (error) {
        if (error !== CANCELLED) throw error
        return
      }
      if (started !== generation) return
      if (!pendingTask(s)) return goTo(G.index + 1)
      G.blocked = false
      renderBody(true)
      return
    }
    if (kind === 'do' && !G.busy) {
      const s = step()
      if (!(await doStep(s))) return
      live.textContent = s.tasks && s.tasks().every(task => task.done) ? t('lab.guide.done') : ''
      // O botão some depois de feito: o foco vai para o Próximo, que continua o caminho.
      const next = q('[data-act="next"]', card)
      if (next && (!card.contains(document.activeElement) || control.hidden)) next.focus()
    }
  }

  function focusTitle () {
    part('title').focus({ preventScroll: true })
  }

  /* ---------- Movimento: o cartão nunca viaja ---------- */

  // A troca de passo (ou de destaque dentro dele) segue sempre a mesma ordem: o cartão some; o passo se prepara
  // e a página rola até o destaque, com o recorte antigo parado onde estava; o recorte e o anel vão juntos do
  // antigo ao novo; o cartão aparece já no lugar, sem viajar. Com menos movimento, a mesma ordem, sem animação.
  async function move (apply, focus) {
    const id = ++G.moveId
    let done
    const moving = new Promise(resolve => { done = resolve })
    G.moving = moving
    try {
      const from = G.holes.slice()
      shield.style.display = 'none'
      await fadeOut()
      if (id !== G.moveId || !G.open) return
      if (apply) apply()
      setPadding()
      isolate(keepList())
      await frames(2)
      if (id !== G.moveId || !G.open) return
      await scrollToTarget(currentTargets())
      if (id !== G.moveId || !G.open) return
      const els = currentTargets()
      G.targetKey = keyOf(els)
      G.nextKey = null
      await morph(from, () => holesFor(currentTargets()))
      if (id !== G.moveId || !G.open) return
      const toward = placeCard(currentTargets())
      if (focus) focusTitle()
      paintShield()
      await fadeIn(toward)
    } finally {
      // Quem esperava esta viagem segue; uma viagem que começou depois dela continua marcada.
      if (G.moving === moving) G.moving = null
      done()
    }
  }

  const frames = n => new Promise(resolve => {
    const tick = () => --n <= 0 ? resolve() : requestAnimationFrame(tick)
    requestAnimationFrame(tick)
  })

  // cubic-bezier(0.2, 0, 0, 1) por quadro, para o recorte e o anel andarem com a mesma curva do cartão.
  function ease (x) {
    const curve = (a, b, s) => 3 * a * (1 - s) * (1 - s) * s + 3 * b * (1 - s) * s * s + s * s * s
    let lo = 0
    let hi = 1
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      if (curve(0.2, 0, mid) < x) lo = mid
      else hi = mid
    }
    return curve(0, 1, (lo + hi) / 2)
  }

  // Chama paint(e) a cada quadro por ms milissegundos, com e de 0 a 1 na curva; com menos movimento, só o fim.
  function animate (ms, paintStep) {
    return new Promise(resolve => {
      if (reduced()) {
        paintStep(1)
        return resolve()
      }
      const t0 = performance.now()
      const tick = now => {
        if (!G.open) return resolve()
        const p = Math.min(1, (now - t0) / ms)
        paintStep(ease(p))
        if (p < 1) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })
  }

  function fadeOut () {
    if (card.style.opacity === '0') return
    card.style.opacity = '0'
    if (reduced()) return
    return card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-out' }).finished.catch(() => {})
  }

  // Aparece andando 4 px na direção do destaque.
  function fadeIn ([dx, dy]) {
    card.style.opacity = ''
    if (reduced()) return
    return card.animate([{ opacity: 0, transform: `translate(${dx}px, ${dy}px)` }, { opacity: 1, transform: 'none' }], { duration: 180, easing: EASE }).finished.catch(() => {})
  }

  const lerp = (a, b, e) => a + (b - a) * e
  const box = (left, top, right, bottom) => ({ left, top, right, bottom, width: right - left, height: bottom - top })
  const onScreen = r => r.right > 0 && r.bottom > 0 && r.left < document.documentElement.clientWidth && r.top < window.innerHeight

  // O recorte e o anel vão do antigo ao novo num só movimento quando os dois estão na janela; senão, trocam
  // por um esmaecer. Sem destaque dos dois lados, a camada escura fica como está.
  async function morph (from, to) {
    const end = to()
    const front = layers[G.front]
    const back = layers[1 - G.front]
    // Logo depois de abrir, ainda não há camada escura: ela aparece junto com o cartão.
    const base = front.box.hidden ? 0 : 1
    if (!from.length && !end.length) {
      G.holes = []
      return base ? paint(front, [], 1) : animate(180, e => paint(front, [], e))
    }
    if (base && from.length && from.length === end.length && from.concat(end).every(onScreen)) {
      return animate(280, e => {
        const now = to()
        G.holes = now.length === from.length ? now.map((r, i) => box(lerp(from[i].left, r.left, e), lerp(from[i].top, r.top, e), lerp(from[i].right, r.right, e), lerp(from[i].bottom, r.bottom, e))) : now
        paint(front, G.holes, 1)
      })
    }
    await animate(280, e => {
      G.holes = to()
      paint(front, from, base * (1 - e))
      paint(back, G.holes, e)
    })
    paint(front, [], 0)
    G.front = 1 - G.front
  }

  /* ---------- Posição: recorte, anel e cartão ---------- */

  function narrow () {
    return window.innerWidth < 640
  }

  function currentTargets () {
    if (G.mode !== 'step') return []
    let list = []
    try {
      list = step().targets()
    } catch (e) {}
    return list.filter(visible)
  }

  // O que identifica o destaque: os elementos, menos o menu do modo e o balão da barra de tempo, que abrem e
  // fecham dentro dele sem trocar de lugar.
  function keyOf (els) {
    return els.concat(['>'], anchorEls(els)).filter(item => item.id !== 'run-menu' && item.id !== 'tl-pop').map(item => item === '>' ? item : item.id || item.className).join('|')
  }

  function unionRect (nodes) {
    const rects = nodes.map(item => item.getBoundingClientRect()).filter(rect => rect.width || rect.height)
    if (!rects.length) return null
    const pad = 6
    return box(Math.min(...rects.map(rect => rect.left)) - pad, Math.min(...rects.map(rect => rect.top)) - pad,
      Math.max(...rects.map(rect => rect.right)) + pad, Math.max(...rects.map(rect => rect.bottom)) + pad)
  }

  // Os recortes do passo, já cortados na janela (e, no telefone, na borda de cima da folha): o anel usa o
  // mesmo retângulo, então nunca se separa do recorte.
  function holesFor (els) {
    const r = unionRect(els)
    if (!r) return []
    const s = G.mode === 'step' ? step() : null
    const list = s && s.separate ? mergeRects(els.map(item => unionRect([item])).filter(Boolean)) : [r]
    const W = document.documentElement.clientWidth
    const bottom = narrow() ? card.getBoundingClientRect().top : window.innerHeight + 10
    return list.map(h => box(Math.max(h.left, -10), Math.max(h.top, -10), Math.min(h.right, W + 10), Math.min(h.bottom, bottom)))
      .filter(h => h.width > 0 && h.height > 0)
  }

  function holePath (r) {
    const k = Math.min(10, r.width / 2, r.height / 2)
    const [x, y, w, h] = [r.left, r.top, r.width, r.height]
    return ` M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`
  }

  // Com evenodd, recortes sobrepostos se anulariam: por isso eles chegam aqui já unidos (mergeRects).
  function roundedHoles (rects) {
    const W = document.documentElement.clientWidth + 20
    const H = window.innerHeight + 20
    return `path(evenodd, 'M-10 -10H${W}V${H}H-10Z${rects.map(holePath).join('')}')`
  }

  function mergeRects (rects) {
    const list = rects.slice()
    for (let again = true; again;) {
      again = false
      for (let i = 0; i < list.length && !again; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]
          const b = list[j]
          if (a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom) {
            list.splice(j, 1)
            list[i] = box(Math.min(a.left, b.left), Math.min(a.top, b.top), Math.max(a.right, b.right), Math.max(a.bottom, b.bottom))
            again = true
            break
          }
        }
      }
    }
    return list
  }

  // Uma camada: a sombra com os recortes e um anel em cada um, na mesma opacidade.
  function paint (L, holes, opacity) {
    L.box.hidden = opacity <= 0
    L.box.style.opacity = opacity >= 1 ? '' : String(opacity)
    if (L.box.hidden) return
    L.shade.style.clipPath = holes.length ? roundedHoles(holes) : 'none'
    while (L.rings.length < holes.length) {
      const ring = node('div', 'guide-ring', { 'aria-hidden': 'true' })
      L.box.append(ring)
      L.rings.push(ring)
    }
    L.rings.forEach((ring, index) => {
      const r = holes[index]
      ring.hidden = !r
      if (r) Object.assign(ring.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' })
    })
  }

  // Num passo que só explica, um escudo transparente cobre o recorte; os links do passo continuam clicáveis.
  function paintShield () {
    const s = G.mode === 'step' ? step() : null
    const r = G.holes.length ? G.holes.reduce((a, b) => box(Math.min(a.left, b.left), Math.min(a.top, b.top), Math.max(a.right, b.right), Math.max(a.bottom, b.bottom))) : null
    if (!r || !s || acts(s)) {
      shield.style.display = 'none'
      return
    }
    Object.assign(shield.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' })
    let links = []
    try {
      links = s.openLinks ? s.openLinks().filter(visible) : []
    } catch (e) {}
    shield.style.clipPath = links.length
      ? `path(evenodd, 'M0 0H${r.width}V${r.height}H0Z ${links.map(link => { const b = link.getBoundingClientRect(); return `M${b.left - r.left - 2} ${b.top - r.top - 2}h${b.width + 4}v${b.height + 4}h${-(b.width + 4)}Z` }).join(' ')}')`
      : 'none'
  }

  // O que precisa ficar à vista no passo: o anchor do passo (um elemento ou uma lista) ou o primeiro destaque.
  function anchorEls (els) {
    const s = G.mode === 'step' ? step() : null
    let anchor = null
    try {
      anchor = s && s.anchor ? s.anchor() : null
    } catch (e) {}
    const list = (Array.isArray(anchor) ? anchor : [anchor]).filter(visible)
    return list.length ? list : els.slice(0, 1)
  }

  // Dentro de uma lista com rolagem própria (as rotas, o Histórico), o item vai para o meio dela, na hora.
  function revealInList (item) {
    for (let at = item.parentElement; at && at !== document.body; at = at.parentElement) {
      if (at.scrollHeight <= at.clientHeight + 1 || !/auto|scroll/.test(getComputedStyle(at).overflowY)) continue
      const a = at.getBoundingClientRect()
      const r = item.getBoundingClientRect()
      if (r.top < a.top || r.bottom > a.bottom) at.scrollTop += r.top - a.top - (a.height - r.height) / 2
    }
  }

  // Rola a página até o destaque: de uma vez quando a distância passa de uma tela, suave quando é menor. Espera a
  // rolagem acabar (scrollend, ou o destaque parado por dois quadros), no máximo 900 ms.
  async function scrollToTarget (els, instant) {
    const list = anchorEls(els)
    if (!list.length) return
    list.forEach(revealInList)
    const H = window.innerHeight
    const a = unionRect(list)
    let delta = 0
    if (narrow()) {
      // No telefone a folha fica embaixo: o destaque e o anchor precisam caber na faixa de cima.
      const room = card.getBoundingClientRect().top - 8
      const all = unionRect(els)
      const r = all && all.height <= room - 8 ? all : a
      if (r.top < 8 || r.bottom > room) delta = r.top - 12
    } else if (a.top < 8 || a.bottom > H - 8) {
      delta = list.length > 1 || a.height > H * 0.7 ? a.top - 16 : (a.top + a.bottom) / 2 - H / 2
    }
    const goal = Math.round(Math.min(Math.max(0, window.scrollY + delta), document.documentElement.scrollHeight - H))
    const far = Math.abs(goal - window.scrollY) > H
    if (Math.abs(goal - window.scrollY) >= 1) window.scrollTo({ top: goal, behavior: instant || far || reduced() ? 'instant' : 'smooth' })
    await new Promise(resolve => {
      const t0 = performance.now()
      let ended = false
      let last = ''
      let still = 0
      const onEnd = () => { ended = true }
      window.addEventListener('scrollend', onEnd)
      const tick = () => {
        const r = unionRect(list)
        const key = r ? [r.left, r.top, r.width, r.height].map(Math.round).join() : ''
        still = key === last ? still + 1 : 0
        last = key
        const arrived = ended || Math.abs(window.scrollY - goal) < 1
        if ((arrived && still >= 2) || performance.now() - t0 > 900 || !G.open) {
          window.removeEventListener('scrollend', onEnd)
          return resolve()
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  // No telefone, quando o passo muda por dentro (a etapa abriu o porquê), o anchor volta para a faixa acima da
  // folha; a folha não se mexe.
  function keepInBand () {
    if (!narrow() || G.moving) return
    const a = unionRect(anchorEls(currentTargets()))
    const room = card.getBoundingClientRect().top - 8
    if (!a || (a.top >= 8 && a.bottom <= room)) return
    const delta = a.height > room - 8 ? a.top - 12 : a.bottom - room
    window.scrollTo({ top: window.scrollY + delta, behavior: reduced() ? 'instant' : 'smooth' })
  }

  function overlap (a, b) {
    if (!a || !b) return 0
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    return w > 0 && h > 0 ? w * h : 0
  }

  // O lado é escolhido uma vez, quando o cartão está sumido; devolve a direção (dx, dy) em que ele entra.
  function placeCard (els) {
    const W = document.documentElement.clientWidth
    const H = window.innerHeight
    const cw = card.offsetWidth
    const ch = card.offsetHeight
    const m = 16
    const gap = 14
    card.classList.toggle('is-docked', narrow() && G.mode === 'step')
    if (narrow()) {
      G.pos = null
      card.style.left = ''
      card.style.top = G.mode === 'step' ? '' : Math.max(12, (H - ch) / 2) + 'px'
      return [0, 4]
    }
    const r = G.holes.length ? G.holes.reduce((a, b) => box(Math.min(a.left, b.left), Math.min(a.top, b.top), Math.max(a.right, b.right), Math.max(a.bottom, b.bottom))) : null
    if (!r) {
      G.pos = { x: Math.round((W - cw) / 2), y: Math.round(Math.max(m, (H - ch) / 2)), sy: null }
      followCard()
      return [0, 4]
    }
    const a = unionRect(anchorEls(els)) || r
    const midY = (a.top + a.bottom) / 2
    const midX = (a.left + a.right) / 2
    const clampY = y => Math.min(Math.max(m, y), H - ch - m)
    const clampX = x => Math.min(Math.max(m, x), W - cw - m)
    const fits = { right: r.right + gap + cw <= W - m, left: r.left - gap - cw >= m, bottom: r.bottom + gap + ch <= H - m, top: r.top - gap - ch >= m }
    const side = ['right', 'left', 'bottom', 'top'].find(name => fits[name]) || 'corner'
    let x, y
    if (side === 'right') [x, y] = [r.right + gap, clampY(midY - 48)]
    else if (side === 'left') [x, y] = [r.left - gap - cw, clampY(midY - 48)]
    else if (side === 'bottom') [x, y] = [clampX(midX - cw / 2), r.bottom + gap]
    else if (side === 'top') [x, y] = [clampX(midX - cw / 2), r.top - gap - ch]
    else {
      // Sem lado livre: o canto da janela que menos cobre o que o passo quer mostrar (o anchor), depois o destaque.
      const corners = [[W - cw - m, H - ch - m], [m, H - ch - m], [W - cw - m, m], [m, m]]
      const score = ([cx, cy]) => {
        const c = box(cx, cy, cx + cw, cy + ch)
        return overlap(c, a) * 1000 + overlap(c, r)
      }
      ;[x, y] = corners.reduce((best, c) => score(c) < score(best) ? c : best)
    }
    G.pos = { x: Math.round(clampX(x)), y: Math.round(clampY(y)), sy: window.scrollY, side }
    followCard()
    return { right: [4, 0], left: [-4, 0], bottom: [0, 4], top: [0, -4] }[side] || [0, 4]
  }

  // Durante o passo, o cartão só acompanha a rolagem da página, sem animação, e nunca sai da janela.
  function followCard () {
    if (!G.pos || narrow()) return
    const H = window.innerHeight
    const y = G.pos.sy === null ? G.pos.y : G.pos.y - (window.scrollY - G.pos.sy)
    card.style.left = G.pos.x + 'px'
    card.style.top = Math.round(Math.min(Math.max(16, y), H - card.offsetHeight - 16)) + 'px'
  }

  // No telefone, a página ganha embaixo a altura da folha, para o fim dela poder subir acima do cartão.
  function setPadding () {
    const docked = narrow() && G.mode === 'step'
    card.classList.toggle('is-docked', docked)
    document.body.style.paddingBottom = docked ? (card.offsetHeight + 24) + 'px' : ''
  }

  function loop () {
    if (!G.open) return
    frame = requestAnimationFrame(loop)
    if (G.moving) return
    if (G.mode === 'step') {
      const els = currentTargets()
      const key = keyOf(els)
      // O destaque trocou dentro do passo (Executar e depois o fluxo): a mesma viagem da troca de passo, depois de
      // três quadros iguais, para um redesenho da página não disparar nada.
      if (els.length && key !== G.targetKey) {
        G.keyFrames = key === G.nextKey ? G.keyFrames + 1 : 1
        G.nextKey = key
        if (G.keyFrames >= 3 && !G.going) {
          move(null, false).then(announceTarget)
          return
        }
      } else G.nextKey = null
      if (els.length) G.holes = holesFor(els)
    } else G.holes = []
    paint(layers[G.front], G.holes, 1)
    paintShield()
    setPadding()
    followCard()
    const now = performance.now()
    if (now - lastRender > 200) {
      lastRender = now
      if (G.mode === 'step') renderBody(false)
      else isolate(keepList())
    }
  }

  // Mudou o tamanho da janela: o destaque volta à vista e o cartão escolhe o lado de novo, sem animação.
  window.addEventListener('resize', () => {
    clearTimeout(G.resizeTimer)
    G.resizeTimer = setTimeout(async () => {
      if (!G.open || G.moving || G.going) return
      setPadding()
      const els = currentTargets()
      if (els.length) await scrollToTarget(els, true)
      if (G.moving || !G.open) return
      G.holes = holesFor(currentTargets())
      placeCard(currentTargets())
    }, 150)
  })

  /* ---------- Teclado: Esc fecha (o Tab já fica no cartão e no destaque, pelo inert) ---------- */

  document.addEventListener('keydown', event => {
    if (!G.open || event.key !== 'Escape' || event.defaultPrevented) return
    // O menu do modo e o balão da barra de tempo fecham primeiro, com o Esc deles.
    if (visible($('run-menu')) || visible($('tl-pop'))) return
    event.preventDefault()
    close()
  })

  // Para app.js, que abre o guia depois de baixar este arquivo, e para os testes.
  window.serverestGuide = {
    close,
    open: () => open(),
    start: id => {
      if (!G.open) return open(id)
      G.path = id
      goTo(0)
    },
    state: () => ({ open: G.open, path: G.path, index: G.index, mode: G.mode, moving: !!G.moving || G.going })
  }
})()
