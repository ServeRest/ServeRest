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
    attributes: ['data-layout', 'data-route', 'data-key', 'data-send-mode', 'data-record', 'data-status',
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

  async function waitFor (test, ms) {
    const end = Date.now() + ms
    while (Date.now() < end) {
      if (test()) return true
      await sleep(120)
    }
    return false
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
    return t(key).replace(/\{([a-z_]+)\}/g, (mark, name) => Object.prototype.hasOwnProperty.call(names, name) ? String(names[name]) : mark)
  }

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
    // O envio mostrado no Resultado; o status só existe depois do veredito do fluxo.
    shown () {
      const box = $('shown')
      if (!box || box.hidden || !box.getAttribute('data-record')) return null
      return { key: box.getAttribute('data-record'), status: box.getAttribute('data-status') || '' }
    },
    verdict () {
      const summary = q('#flow .flow-summary[data-verdict]')
      if (!summary || $('flow').hidden) return null
      return { kind: summary.getAttribute('data-verdict'), stage: summary.getAttribute('data-stage') || '', label: (q('.flow-summary-stage', summary) || summary).textContent.trim() }
    },
    // Um envio pronto: a resposta chegou e o fluxo chegou ao veredito.
    ready (key) {
      const shown = P.shown()
      return !P.sending() && !!shown && (!key || shown.key === key) && !!shown.status && !!P.verdict()
    },
    // Enviada neste passo e ainda sem veredito: a resposta pode ter chegado, mas a câmera lenta ainda desenha.
    inFlight (key) {
      const shown = P.shown()
      return P.sending() || (!!shown && (!key || shown.key === key) && sent() && !P.ready(key))
    },
    status: () => (P.shown() || {}).status || '',
    flowOpen: () => !!$('flow-title') && $('flow-title').getAttribute('aria-expanded') !== 'false',
    stoppedRow () {
      const verdict = P.verdict()
      return verdict && verdict.kind === 'stopped' ? q('#flow .flow-stage[data-stage="' + CSS.escape(verdict.stage) + '"] > .flow-row') : null
    },
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
    await sleep(60)
    const route = P.route(key)
    if (route && (force || P.selected() !== key)) {
      route.click()
      await sleep(250)
    }
  }

  async function execute (key) {
    if (key && P.selected() !== key) await selectRoute(key)
    if (!$('run') || P.sending()) return
    $('run').click()
    await waitFor(() => P.ready(key), 40000)
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
        await sleep(150)
      }
    }
  }

  // Regra dos passos: um passo só fica feito com a ação feita DURANTE ele. O que a página já tinha ao entrar
  // (envios antigos, fluxo fechado, token em uso) nunca conta. G.ev guarda o que a pessoa (ou Fazer por mim,
  // que clica nos mesmos controles) fez no passo, e zera a cada troca de passo.
  const historyLength = () => qa('#history-body > li').length
  // Um envio neste passo: o clique em Executar, ou Ctrl + Enter (o Histórico ganha uma linha).
  const sent = () => !!G.ev.run || historyLength() > G.historyAt

  document.addEventListener('click', event => {
    if (!G.open || G.mode !== 'step' || !event.target.closest) return
    const target = event.target
    if (target.closest('#run-mode')) G.ev.menu = true
    if (target.closest('#run')) G.ev.run = true
    if (target.closest('#flow-title')) G.ev.title = true
    if (target.closest('#flow .flow-row')) G.ev.row = true
    if (target.closest('.tl-seg[data-part="server"], .tl-call[data-part="server"]')) G.ev.server = true
    if (target.closest('#use-token')) G.ev.useToken = true
    const route = target.closest('.route[data-key]')
    if (route) G.ev.routes[route.getAttribute('data-key')] = true
  }, true)
  document.addEventListener('keydown', event => {
    if (G.open && G.mode === 'step' && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) G.ev.run = true
  }, true)

  /* ---------- Os passos ---------- */

  // Depois do clique em Executar o destaque vai para o Resultado, onde o fluxo é desenhado. Só um envio deste
  // passo leva o destaque para lá: um resultado antigo na tela não conta.
  const runOrFlow = key => sent() && (P.inFlight(key) || P.ready(key)) ? [$('shown'), $('flow')] : [$('run-split'), visible($('run-menu')) ? $('run-menu') : null]
  const historyTargets = () => {
    const first = q('#history-body > li')
    return first ? [q('#history .zone-head'), first] : [$('history')]
  }
  const waiting = key => () => sent() && P.inFlight(key) ? fill('lab.guide.waiting') : ''

  // O envio de POST /carrinhos mostrado no Resultado foi feito neste passo e levou o header Authorization.
  function withToken () {
    return sent() && P.ready(CART) && !!q('#history-body .entry[aria-current="true"][data-token="sent"][data-key="' + CART + '"]')
  }

  // POST /login, neste passo: clicada, enviada com 200 e o token usado.
  const loginPicked = () => !!G.ev.routes[LOGIN] || (sent() && P.selected() === LOGIN)
  const loginDone = () => sent() && P.ready(LOGIN) && P.status() === '200'
  const tokenUsed = () => !!G.ev.useToken && !!$('token-done')
  // O login enviado neste passo voltou sem token. Com o corpo do exemplo (Restaurar exemplo escondido), quem
  // mudou foi o usuário de exemplo, no banco compartilhado: os passos que pedem o token passam a só explicar.
  function loginFailure () {
    if (!sent() || !P.ready(LOGIN) || P.status() === '200') return ''
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
        warn: () => P.selected() === CART && P.authValue() && !sent() ? fill('lab.guide.learn.send_warn') : '',
        waiting: waiting(CART),
        tasks: () => [{ text: fill('lab.guide.task_run'), done: sent() && P.ready(CART) }],
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
        anchor: () => P.stoppedRow() || q('#flow .flow-summary'),
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
          await sleep(150)
          const row = P.stoppedRow() || q('#flow .flow-row')
          if (row && row.getAttribute('aria-expanded') !== 'true') row.click()
          await sleep(200)
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
        warn: loginFailure,
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
              await sleep(120)
            }
            await execute(LOGIN)
          }
          if (loginDone() && $('use-token')) {
            showResponseTab()
            await sleep(60)
            $('use-token').click()
            await sleep(200)
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
          if (sent() && (withToken() || P.inFlight(CART))) return [$('shown'), $('flow')]
          return [$('run-split')].concat(emptyEdited() ? [$('auth-group')] : [])
        },
        anchor: () => withToken() && P.stoppedRow() ? P.stoppedRow() : null,
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
        warn: () => noToken() || P.selected() !== CART || P.authValue() || P.inFlight(CART) || withToken() ? '' : fill(emptyEdited() ? 'lab.guide.learn.again_undo' : 'lab.guide.learn.again_warn'),
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
              await sleep(150)
            }
            await execute(CART)
          }
          expandFlow()
          await sleep(150)
          const row = P.stoppedRow()
          if (row && row.getAttribute('aria-expanded') !== 'true') row.click()
          await sleep(200)
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
        targets: () => [$('run-split'), visible($('run-menu')) ? $('run-menu') : null].concat(sent() ? [$('shown'), $('flow')] : []),
        anchor: () => [$('run-split'), visible($('run-menu')) ? $('run-menu') : null],
        paras: () => [fill(P.split() ? 'lab.guide.tour.run_p1' : 'lab.guide.mode_reduced'), fill('lab.guide.tour.run_p2')],
        waiting: waiting(),
        tasks: () => [
          P.split() ? { text: fill('lab.guide.tour.run_menu'), done: !!G.ev.menu } : null,
          { text: fill('lab.guide.task_run'), done: sent() && P.ready() }
        ].filter(Boolean),
        // O Próximo só segue depois que o menu do modo abriu neste passo (pela pessoa ou por Fazer por mim).
        gate: () => !!G.ev.menu || !P.split(),
        gateText: 'lab.guide.tour.run_gate',
        doIt: async () => {
          if (!G.ev.menu && P.split()) {
            $('run-mode').click()
            await sleep(1400)
            if (visible($('run-menu'))) $('run-mode').click()
            await sleep(200)
          }
          if (!sent()) await execute(P.selected() || LOGIN)
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
          await sleep(200)
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
          await sleep(250)
          const segment = q('#flow .tl-seg[data-part="server"]')
          if (segment && segment.getAttribute('aria-expanded') !== 'true') segment.click()
          await sleep(200)
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

  const G = { open: false, path: null, index: -1, mode: null, ev: { routes: {} }, historyAt: 0, entry: {}, pre: false, busy: false, sig: '', targetKey: null, side: null, corner: null, loginBroken: false, attnTimer: null }
  let shade, ring, shield, card, live
  let frame = 0
  let lastRender = 0
  const rings = []

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

  function build () {
    shade = node('div', 'guide-shade')
    shield = node('div', 'guide-shield')
    ring = node('div', 'guide-ring', { 'aria-hidden': 'true' })
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
    document.body.append(shade, shield, ring, card)
    // Clicar fora: nada acontece na página, e o Fechar pulsa para mostrar a saída.
    shade.addEventListener('pointerdown', event => {
      event.preventDefault()
      nudgeClose()
    })
    ;[shade, shield].forEach(layer => layer.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
    }))
    shield.addEventListener('pointerdown', event => event.preventDefault())
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

  function open () {
    if (G.open) return
    G.open = true
    if (!card) build()
    for (const layer of [shade, shield, card, ...rings]) layer.hidden = false
    showChoice()
    loop()
  }

  function close () {
    if (!G.open) return
    G.open = false
    clearAttention()
    cancelAnimationFrame(frame)
    release()
    for (const layer of [shade, ring, shield, card, ...rings]) layer.hidden = true
    document.body.style.paddingBottom = ''
    G.path = null
    G.index = -1
    G.mode = null
    G.loginBroken = false
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

  function showChoice () {
    clearAttention()
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
    focusTitle()
  }

  function showEnd () {
    clearAttention()
    const path = PATHS[G.path]
    G.mode = 'end'
    G.sig = ''
    setHead([t(path.name)], 100, t('lab.guide.end_title'))
    const list = el('div')
    list.append(choice(PATHS[path.offer]))
    part('body').replaceChildren(...path.end.map(key => el('p', '', fill(key))), list)
    part('foot').replaceChildren(button('btn', 'back', t('lab.guide.back')), el('span', 'guide-grow'), button('btn btn-primary', 'close', t('lab.guide.close')))
    focusTitle()
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
    if (G.mode === 'wait') return
    clearAttention()
    const steps = PATHS[G.path].steps
    if (index >= steps.length) return showEnd()
    if (index < 0) return showChoice()
    const s = steps[index]
    // Enquanto o passo se prepara, nada dele vale ainda: nem destaque, nem cliques contados.
    G.mode = 'wait'
    if (s.prepare) {
      try {
        s.prepare()
      } catch (e) {}
      await sleep(80)
    }
    if (!G.open) return
    Object.assign(G, { mode: 'step', index, sig: '', targetKey: null, side: null, corner: null })
    part('exit-hint').hidden = true
    // O passo começa do zero: nada feito antes conta. Se a ação dele já estiver feita na página e não der para
    // refazer, o passo só explica (preDone).
    G.ev = { routes: {} }
    G.historyAt = historyLength()
    G.entry = { flowOpen: P.flowOpen() }
    G.pre = false
    try {
      G.pre = !!(s.preDone && s.preDone())
    } catch (e) {}
    const n = index + 1
    setHead([el('b', '', fill('lab.guide.step', { n, total: steps.length })), el('span', '', t(PATHS[G.path].name))], (n / steps.length) * 100, t(s.title))
    part('foot').replaceChildren(button('btn', 'back', t('lab.guide.back')), el('span', 'guide-grow'), button('btn guide-do', 'do', t('lab.guide.do')),
      button('btn btn-primary', 'next', t('lab.guide.next')))
    renderBody(true)
    focusTitle()
    announceTarget()
    startAttention(s)
  }

  function announceTarget () {
    if (G.mode === 'step') live.textContent = fill('lab.guide.highlight', { label: step().label() })
  }

  // O corpo do passo só é refeito quando o que ele mostra muda: o foco e a leitura ficam estáveis.
  function renderBody (force) {
    if (G.mode !== 'step') return
    const s = step()
    const missing = !!s.needs && !s.needs.test() && !G.busy
    const explain = !!s.explain && s.explain()
    const tasks = s.tasks && !G.pre && !explain ? s.tasks() : []
    const done = tasks.length > 0 && tasks.every(task => task.done)
    const warn = missing ? fill('lab.guide.needs') : (s.warn ? s.warn() : '')
    const wait = !done && s.waiting ? s.waiting() : ''
    const paras = s.paras().concat(G.pre && s.preText ? [fill(s.preText)] : []).filter(Boolean)
    const gated = !G.pre && !!s.gate && !s.gate()
    const sig = JSON.stringify([paras, tasks, warn, wait, done, G.busy, gated])
    isolate(keepList())
    if (!force && sig === G.sig) return
    const wasDone = !!G.sig && JSON.parse(G.sig)[4]
    G.sig = sig
    const body = paras.map(text => el('p', '', text))
    if (tasks.length) {
      const list = el('ul', 'guide-tasks')
      tasks.forEach(task => {
        const item = el('li', task.done ? 'is-done' : '')
        const mark = el('span', 'guide-mark', task.done ? '✓' : '')
        mark.setAttribute('aria-hidden', 'true')
        item.append(mark, el('span', '', task.text), el('span', 'sr-only', task.done ? ' ' + t('lab.guide.task_done') : ''))
        list.append(item)
      })
      body.push(list)
    }
    if (warn) body.push(el('p', 'guide-warn', warn))
    if (wait) body.push(el('p', 'guide-wait', wait))
    if (done) body.push(el('p', 'guide-done', t('lab.guide.done')))
    if (gated) {
      const gate = el('p', 'guide-gate', fill(s.gateText))
      gate.id = 'guide-gate'
      body.push(gate)
    }
    part('body').replaceChildren(...body)
    const next = q('[data-act="next"]', card)
    if (gated) {
      next.setAttribute('aria-disabled', 'true')
      next.setAttribute('aria-describedby', 'guide-gate')
    } else {
      next.removeAttribute('aria-disabled')
      next.removeAttribute('aria-describedby')
    }
    const doButton = q('[data-act="do"]', card)
    doButton.hidden = (G.pre && !missing) || (explain && !missing) || !(s.doIt || missing) || (done && !missing)
    doButton.toggleAttribute('aria-busy', G.busy)
    if (G.busy) doButton.setAttribute('aria-disabled', 'true')
    else doButton.removeAttribute('aria-disabled')
    if (done && !wasDone && !force) live.textContent = t('lab.guide.done')
  }

  async function onCardClick (event) {
    const picked = event.target.closest('.guide-choice')
    if (picked) {
      G.path = picked.getAttribute('data-path')
      G.loginBroken = false
      return goTo(0)
    }
    const control = event.target.closest('[data-act]')
    if (!control) return
    const kind = control.getAttribute('data-act')
    if (kind === 'close') return close()
    if (kind === 'back') return goTo(G.mode === 'end' ? PATHS[G.path].steps.length - 1 : G.index - 1)
    if (kind === 'next') {
      if (control.getAttribute('aria-disabled') === 'true') {
        const gate = $('guide-gate')
        if (gate && !reduced()) replay(gate, 'guide-shake')
        return
      }
      return goTo(G.index + 1)
    }
    if (kind === 'do' && !G.busy) {
      const s = step()
      const index = G.index
      G.busy = true
      renderBody(true)
      try {
        if (s.needs && !s.needs.test()) await s.needs.fix()
        if (s.doIt) await s.doIt()
        if (s.prepare) s.prepare()
      } finally {
        G.busy = false
        if (G.open && G.index === index && G.mode === 'step') {
          renderBody(true)
          live.textContent = s.tasks && s.tasks().every(task => task.done) ? t('lab.guide.done') : ''
        }
        // O botão some depois de feito: o foco vai para o Próximo, que continua o caminho.
        const next = q('[data-act="next"]', card)
        if (next && (!card.contains(document.activeElement) || control.hidden)) next.focus()
      }
    }
  }

  function focusTitle () {
    part('title').focus({ preventScroll: true })
  }

  /* ---------- Posição: recorte, anel e cartão, a cada quadro ---------- */

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

  function unionRect (nodes) {
    const rects = nodes.map(item => item.getBoundingClientRect()).filter(rect => rect.width || rect.height)
    if (!rects.length) return null
    const pad = 6
    const left = Math.min(...rects.map(rect => rect.left)) - pad
    const top = Math.min(...rects.map(rect => rect.top)) - pad
    const right = Math.max(...rects.map(rect => rect.right)) + pad
    const bottom = Math.max(...rects.map(rect => rect.bottom)) + pad
    return { left, top, right, bottom, width: right - left, height: bottom - top }
  }

  function holePath (r, W, H) {
    const x = Math.max(r.left, -10)
    const y = Math.max(r.top, -10)
    const w = Math.min(r.right, W + 10) - x
    const h = Math.min(r.bottom, H + 10) - y
    if (w <= 0 || h <= 0) return ''
    const k = Math.min(8, w / 2, h / 2)
    return ` M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`
  }

  // Com evenodd, recortes sobrepostos se anulariam: por isso eles chegam aqui já unidos (mergeRects).
  function roundedHoles (rects, W, H) {
    return `path(evenodd, 'M0 0H${W}V${H}H0Z${rects.map(r => holePath(r, W, H)).join('')}')`
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
            const left = Math.min(a.left, b.left)
            const top = Math.min(a.top, b.top)
            const right = Math.max(a.right, b.right)
            const bottom = Math.max(a.bottom, b.bottom)
            list.splice(j, 1)
            list[i] = { left, top, right, bottom, width: right - left, height: bottom - top }
            again = true
            break
          }
        }
      }
    }
    return list
  }

  function paintRings (holes) {
    while (rings.length < holes.length) {
      const copy = ring.cloneNode()
      copy.hidden = false
      document.body.append(copy)
      rings.push(copy)
    }
    rings.forEach((item, index) => {
      const r = holes[index]
      if (!r || !G.open) {
        item.style.display = 'none'
        return
      }
      Object.assign(item.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' })
    })
    ring.style.display = 'none'
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

  function scrollToAnchor (els) {
    const list = anchorEls(els)
    if (!list.length) return
    const behavior = reduced() ? 'auto' : 'smooth'
    if (list.length > 1) {
      const u = unionRect(list)
      if (u.top < 8 || u.bottom > window.innerHeight - 8) window.scrollTo({ top: window.scrollY + u.top - 16, behavior })
      return
    }
    const anchor = list[0]
    const r = anchor.getBoundingClientRect()
    const all = unionRect(els)
    if (narrow()) {
      // No telefone o cartão fica embaixo: o destaque precisa caber na faixa de cima.
      const room = window.innerHeight - card.offsetHeight - 24
      const fitsAll = !!all && all.height <= room
      const top = fitsAll ? all.top : r.top - 8
      if (top >= 8 && (fitsAll ? all.bottom : r.bottom) <= room) return
      anchor.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      const r2 = fitsAll ? unionRect(els) : anchor.getBoundingClientRect()
      window.scrollTo({ top: window.scrollY + r2.top - 12, behavior })
      return
    }
    if (r.top < 8 || r.bottom > window.innerHeight - 8) anchor.scrollIntoView({ block: r.height > window.innerHeight * 0.7 ? 'start' : 'center', inline: 'nearest', behavior })
  }

  function place () {
    const W = document.documentElement.clientWidth
    const H = window.innerHeight
    const els = currentTargets()
    const s = G.mode === 'step' ? step() : null
    const active = !!s && acts(s)
    const key = [...els, ...(s ? anchorEls(els) : [])].map(item => item.id || item.className).join('|') + '|' + G.index + G.mode
    if (key !== G.targetKey) {
      G.targetKey = key
      G.side = null
      G.corner = null
      isolate(keepList())
      if (els.length) {
        scrollToAnchor(els)
        if (s) announceTarget()
      }
    }
    const r = unionRect(els)
    // Destaques distantes (separate) ganham um recorte e um anel cada; os que se tocam viram um só.
    const holes = r && s && s.separate ? mergeRects(els.map(item => unionRect([item])).filter(Boolean)) : (r ? [r] : [])
    shade.style.clipPath = holes.length ? roundedHoles(holes, W, H) : 'none'
    paintRings(holes)
    if (r) {
      Object.assign(shield.style, { display: active ? 'none' : 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' })
      // Num passo que só explica, os links do passo continuam clicáveis: o escudo tem um furo em cada um.
      let links = []
      try {
        links = s && s.openLinks ? s.openLinks().filter(visible) : []
      } catch (e) {}
      shield.style.clipPath = !active && links.length
        ? `path(evenodd, 'M0 0H${r.width}V${r.height}H0Z ${links.map(link => { const b = link.getBoundingClientRect(); return `M${b.left - r.left - 2} ${b.top - r.top - 2}h${b.width + 4}v${b.height + 4}h${-(b.width + 4)}Z` }).join(' ')}')`
        : 'none'
    } else {
      shield.style.display = 'none'
    }
    placeCard(r, W, H, els)
  }

  function overlap (a, b) {
    if (!a || !b) return 0
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    return w > 0 && h > 0 ? w * h : 0
  }

  function placeCard (r, W, H, els) {
    const cw = card.offsetWidth
    const ch = card.offsetHeight
    const m = 16
    card.classList.toggle('is-docked', narrow() && !!r)
    if (narrow()) {
      card.style.left = ''
      card.style.top = r ? '' : Math.max(12, (H - ch) / 2) + 'px'
      document.body.style.paddingBottom = r ? (ch + 24) + 'px' : ''
      return
    }
    document.body.style.paddingBottom = ''
    if (!r) {
      card.style.left = Math.round((W - cw) / 2) + 'px'
      card.style.top = Math.round(Math.max(m, (H - ch) / 2)) + 'px'
      return
    }
    const fits = { right: r.right + m + cw <= W - m, left: r.left - m - cw >= m, bottom: r.bottom + m + ch <= H - m, top: r.top - m - ch >= m }
    if (!G.side || (G.side !== 'corner' && !fits[G.side])) G.side = ['right', 'left', 'bottom', 'top'].find(side => fits[side]) || 'corner'
    const clampY = y => Math.min(Math.max(m, y), H - ch - m)
    const clampX = x => Math.min(Math.max(m, x), W - cw - m)
    let x, y
    if (G.side === 'right') [x, y] = [r.right + m, clampY(r.top)]
    else if (G.side === 'left') [x, y] = [r.left - m - cw, clampY(r.top)]
    else if (G.side === 'bottom') [x, y] = [clampX(r.left), r.bottom + m]
    else if (G.side === 'top') [x, y] = [clampX(r.left), r.top - m - ch]
    else {
      // Sem lado livre: o canto da janela que menos cobre o que o passo quer mostrar (o anchor), depois o destaque.
      const a = unionRect(anchorEls(els))
      const corners = [[W - cw - m, H - ch - m], [m, H - ch - m], [W - cw - m, m], [m, m]]
      const score = ([cx, cy]) => {
        const c = { left: cx, top: cy, right: cx + cw, bottom: cy + ch }
        return overlap(c, a) * 1000 + overlap(c, r)
      }
      const best = corners.reduce((b, c) => score(c) < score(b) ? c : b)
      // Fica no canto atual enquanto ele não cobrir o anchor mais que o melhor: o cartão não pula ao rolar.
      const current = G.corner && corners.find(c => c[0] === G.corner[0] && c[1] === G.corner[1])
      G.corner = current && score(current) <= score(best) * 1.05 + 1 ? current : best
      ;[x, y] = G.corner
    }
    // O cartão nunca sai da janela, mesmo quando o destaque saiu dela.
    card.style.left = Math.round(clampX(x)) + 'px'
    card.style.top = Math.round(clampY(y)) + 'px'
  }

  function loop () {
    if (!G.open) return
    frame = requestAnimationFrame(loop)
    place()
    const now = performance.now()
    if (now - lastRender > 200) {
      lastRender = now
      if (G.mode === 'step') renderBody(false)
      else isolate(keepList())
    }
  }

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
    open,
    close,
    start: id => {
      open()
      G.path = id
      goTo(0)
    },
    state: () => ({ open: G.open, path: G.path, index: G.index, mode: G.mode })
  }
})()
