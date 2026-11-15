/* eslint-env browser */
// Estado, desenho e eventos da página do lab. As regras puras ficam em core.js.
(function () {
  'use strict'

  const core = window.serverestLabCore
  const texts = readTexts()
  const language = document.documentElement.getAttribute('lang') || 'pt-BR'
  const version = document.documentElement.getAttribute('data-version') || ''
  const baseUrl = window.location.origin

  const SLOW_MOTION_KEY = 'serverestFlowSlowMotion'
  // O Fluxo aberto ou fechado neste navegador ("false" quando a pessoa o fechou; aberto por padrão).
  const FLOW_OPEN_KEY = 'serverestFlowOpen'
  const LANGUAGE_KEY = 'swaggerLanguage'
  const STAGES_HEADER = 'x-serverest-stages'
  const MAX_BODY_CHARS = 300000
  const MAX_HISTORY = 50
  const RESPONSE_DELAY = 300
  // O Histórico guardado na sessão do navegador (sessionStorage: por aba, sobrevive a recarregar e à troca
  // de idioma, some quando a aba fecha). Os envios numa chave; o envio mostrado e os não vistos em outra,
  // pequena, que muda mais vezes.
  const HISTORY_KEY = 'serverestLabHistory'
  const VIEW_KEY = 'serverestLabView'
  // Um corpo de resposta maior que isto é guardado cortado (a Resposta diz que ele foi cortado).
  const STORED_BODY_CHARS = 100000
  // Espera real pelo servidor: só depois de 1 s sem resposta o Resultado mostra o envio; a partir de 5 s
  // aparece a frase do servidor que pode estar iniciando, e os círculos e o brilho param.
  const WAIT_DELAY = 1000
  const COLD_AFTER = 5
  // Resposta e Foi enviado são abas de pasta no Resultado.
  const RESULT_TABS = ['resposta', 'enviado']
  const RESULT_PANELS = { resposta: 'response', enviado: 'sent-out' }
  const THEME_KEY = 'serverestTheme'
  const TEXT_KEY = 'serverestTextSize'
  // Pedido da página anterior para a página nova brilhar na cor do idioma escolhido (só nesta aba).
  const GLOW_KEY = 'serverestLangGlow'
  // A versão nova cujo painel a pessoa já abriu (o ponto do aviso some para ela).
  const RELEASE_SEEN_KEY = 'serverestReleaseSeen'
  // O convite para dar opinião: o estado dele em JSON neste navegador (core.readInvite), e a marca desta aba.
  const FEEDBACK_KEY = 'serverestFeedbackInvite'
  const FEEDBACK_SESSION_KEY = 'serverestFeedbackInviteSession'
  // O convite do guia "Como usar": "opened" ou "dismissed" ("Agora não"); com qualquer valor, não volta.
  const GUIDE_KEY = 'serverestGuideInvite'
  // O formulário de opinião de cada idioma; VERSAO vira a versão da página no campo pré-preenchido. Vazio,
  // nenhuma entrada de opinião aparece (rodapé, convite e selo da barra).
  const FEEDBACK_FORM_URL = {
    'pt-BR': 'https://docs.google.com/forms/d/e/1FAIpQLScVAi6hLqT1rpsuN-Jtrxu2r8dcg20EjfTzsjci7wQHPtegPQ/viewform?usp=pp_url&entry.924035673=VERSAO',
    en: 'https://docs.google.com/forms/d/e/1FAIpQLScHuNJNhQc5eDK-vGqD5H4GcJPwFUYwBHbQPjoH52zxkhAQ7Q/viewform?usp=pp_url&entry.924035673=VERSAO',
    es: 'https://docs.google.com/forms/d/e/1FAIpQLSfHpCxjm3tKfEEANKKMrQyWz4_raAQ6Dpu-ow8k9CA90UwOHg/viewform?usp=pp_url&entry.924035673=VERSAO'
  }
  // O formulário deixa de aceitar respostas nesta data; depois dela as entradas de opinião somem sozinhas.
  // Precisa ser a mesma data configurada no Google Forms.
  const FEEDBACK_UNTIL = '2027-01-31T23:59:59-03:00'
  // A edição do formulário: quem respondeu fica 180 dias sem o convite; subir o número o traz de volta na hora.
  const FEEDBACK_FORM_EDITION = 1
  // Os links do Sobre (a faixa do Resultado vazio e o rodapé). Cada um passa por core.safeHref.
  const ABOUT_URLS = {
    postman: 'https://raw.githubusercontent.com/ServeRest/ServeRest/trunk/docs/swagger.json',
    repository: 'https://github.com/ServeRest/ServeRest',
    load: 'https://github.com/ServeRest/ServeRest#teste-de-carga',
    front: 'https://front.serverest.dev',
    issues: 'https://github.com/ServeRest/ServeRest/issues',
    author: 'https://github.com/PauloGoncalvesBH',
    fund: 'https://opencollective.com/serverest',
    contribute: 'https://github.com/ServeRest/ServeRest#contribuidores-',
    ngo: 'https://todasasletras.org/'
  }
  const TEXT_SIZES = ['normal', 'grande', 'maior']
  const TEXT_SIZE_NAMES = { normal: 'lab.topbar.size_normal', grande: 'lab.topbar.size_grande', maior: 'lab.topbar.size_maior' }
  // Só GET recebe o valor documentado no parâmetro de caminho; em DELETE e PUT ele é apenas exemplo.
  const PREFILL_METHODS = ['get']
  // Abaixo desta largura cada exemplo de Respostas possíveis fica fechado num details.
  const NARROW_EXAMPLES = '(width < 37.5rem)'
  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || '') || /Mac|iPhone|iPad/.test(navigator.userAgent || '')
  // Os textos "Como seguir" do fluxo (ui.flow.how.*) foram escritos para o antigo painel do Swagger, que
  // tinha outro jeito de obter o token. Nesta página, os que dizem como conseguir um token viram a
  // instrução única do campo Authorization, a mesma palavra por palavra em todo lugar.
  const HOW_KEYS = {
    'ui.flow.how.auth.token_missing': 'lab.auth.how_to_get',
    'ui.flow.how.auth.token_expired': 'lab.auth.how_to_get',
    'ui.flow.how.auth.token_invalid': 'lab.auth.how_to_get',
    'ui.flow.how.stage.auth': 'lab.auth.how_to_get',
    'ui.flow.how.auth.user_not_found': 'lab.flow.how.user_not_found',
    // O texto ui.flow.how.outside diz "caminho"; esta página diz path, como no resto dela.
    'ui.flow.how.outside': 'lab.flow.how.outside'
  }
  // A legenda do campo Authorization para cada estado de core.tokenCaptionState.
  const AUTH_CAPTION = {
    none: 'lab.auth.how_to_get',
    active: 'lab.token.active',
    active_no_exp: 'lab.token.active_no_exp',
    expired: 'lab.token.expired',
    edited: 'lab.auth.edited',
    filled: 'lab.auth.filled_from'
  }

  /* ---------- Textos ---------- */

  function readTexts () {
    try {
      return JSON.parse(document.getElementById('lab-texts').textContent)
    } catch (e) {
      return {}
    }
  }

  function t (key) {
    return Object.prototype.hasOwnProperty.call(texts, key) ? texts[key] : ''
  }

  // Frases com variáveis usam marcadores nomeados ({time}); o valor pode ser texto ou um elemento.
  function parts (key, values) {
    return t(key).split(/(\{[a-z_]+\})/).filter(piece => piece !== '').map(piece => {
      const match = /^\{([a-z_]+)\}$/.exec(piece)
      if (!match || !Object.prototype.hasOwnProperty.call(values, match[1])) return piece
      const value = values[match[1]]
      return value && value.nodeType ? value : String(value)
    })
  }

  function fillText (key, values) {
    return parts(key, values).map(piece => typeof piece === 'string' ? piece : piece.textContent).join('')
  }

  /* ---------- Utilitários ---------- */

  function $ (id) {
    return document.getElementById(id)
  }

  function el (tag, props) {
    const node = document.createElement(tag)
    Object.keys(props || {}).forEach(name => {
      const value = props[name]
      if (value === null || value === undefined || value === false) return
      if (name === 'class') node.className = value
      else if (name === 'text') node.textContent = value
      else if (name.slice(0, 2) === 'on') node.addEventListener(name.slice(2), value)
      else node.setAttribute(name, value === true ? '' : value)
    })
    for (let index = 2; index < arguments.length; index++) append(node, arguments[index])
    return node
  }

  function append (parent, child) {
    if (child === null || child === undefined || child === false) return
    if (Array.isArray(child)) {
      child.forEach(item => append(parent, item))
      return
    }
    parent.append(child.nodeType ? child : String(child))
  }

  function svgIcon (size, shapes) {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('aria-hidden', 'true')
    shapes.forEach(shape => {
      const node = document.createElementNS(ns, shape[0])
      Object.keys(shape[1]).forEach(name => node.setAttribute(name, shape[1][name]))
      svg.append(node)
    })
    return svg
  }

  function lockIcon (size) {
    return el('span', { class: 'lock' }, svgIcon(size || 13, [
      ['rect', { x: '3', y: '7', width: '10', height: '7.5', rx: '1.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' }],
      ['path', { d: 'M5.5 7V5a2.5 2.5 0 0 1 5 0v2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' }]
    ]))
  }

  function clock (date) {
    try {
      return date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch (e) {
      return date.toLocaleTimeString()
    }
  }

  function formatMs (ms) {
    return core.formatMs(ms, language)
  }

  function statusLine (record) {
    return record.status + (record.statusText ? ' ' + record.statusText : '')
  }

  function statusClass (status) {
    if (status >= 200 && status < 300) return 'ok'
    return status >= 400 ? 'fail' : 'warn'
  }

  function statusGlyph (status) {
    if (status >= 200 && status < 300) return '✓'
    return status >= 400 ? '✗' : '•'
  }

  // compact: só símbolo e código (fileira do histórico); o texto completo fica para o leitor de tela.
  function statusChip (record, compact) {
    if (record.error) {
      return el('span', { class: 'chip fail' }, el('span', { 'aria-hidden': 'true', text: '✗' }), t('lab.history.failed'))
    }
    return el('span', { class: 'chip ' + statusClass(record.status) }, el('span', { 'aria-hidden': 'true', text: statusGlyph(record.status) }),
      compact ? [el('span', { 'aria-hidden': 'true', text: String(record.status) }), el('span', { class: 'sr-only', text: statusLine(record) })] : statusLine(record))
  }

  function methodBadge (method) {
    return el('span', { class: 'method m-' + method.toLowerCase(), text: method.toUpperCase() })
  }

  function prefersReducedMotion () {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    } catch (e) {
      return false
    }
  }

  // A troca para uma coluna é uma consulta de recipiente em rem (vem antes com texto maior); o CSS
  // publica o layout em --layout, e o script lê de lá em vez de repetir a medida (currentLayout).
  function isNarrow () {
    return currentLayout() === 'pilha'
  }

  function readSlowMotion () {
    try {
      return window.localStorage.getItem(SLOW_MOTION_KEY) !== 'false'
    } catch (e) {
      return true
    }
  }

  function saveSlowMotion (enabled) {
    try {
      window.localStorage.setItem(SLOW_MOTION_KEY, enabled ? 'true' : 'false')
    } catch (e) {}
  }

  let announceTimer = null
  function announce (message) {
    const region = $('announcer')
    region.textContent = ''
    clearTimeout(announceTimer)
    announceTimer = setTimeout(() => { region.textContent = message }, 30)
  }

  // O anúncio do resultado de um envio termina com a contagem do Histórico quando o envio entrou com a
  // aba Histórico fechada. A contagem vai uma vez só, e nunca junto de outro anúncio.
  function announceResult (message) {
    const notes = [state.countNote, state.limitNote].filter(Boolean)
    state.countNote = ''
    state.limitNote = ''
    announce(notes.length ? message + ' ' + notes.join(' ') : message)
  }

  // Markdown mínimo das descrições do OpenAPI: um parágrafo por linha e `código`.
  function richText (source) {
    return String(source || '').split(/\n+/).map(line => line.trim()).filter(Boolean).map(line => {
      const paragraph = el('p')
      line.split('`').forEach((piece, index) => {
        append(paragraph, index % 2 ? el('code', { text: piece }) : piece.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1'))
      })
      return paragraph
    })
  }

  // Link para fora da página: sempre em outra aba, com ↗ à vista, e o leitor de tela fica sabendo. Um
  // endereço que não é http ou https não vira link (fica só o texto).
  function externalLink (href, label, props) {
    const safe = core.safeHref(href)
    if (!safe) return label
    return el('a', { ...props, href: safe, target: '_blank', rel: 'noopener' }, label, el('span', { 'aria-hidden': 'true', text: ' ↗' }), el('span', { class: 'sr-only', text: ' ' + t('lab.link.new_tab') }))
  }

  /* ---------- Estado ---------- */

  const state = {
    flowOpen: true,
    spec: null,
    specError: null,
    authHeader: 'Authorization',
    routes: [],
    selected: null,
    drafts: {},
    // O token da página: só o botão da resposta de POST /login o define.
    token: null,
    tokenAt: null,
    tokenExp: null,
    offer: null,
    history: [],
    shownId: null,
    // Envio cujo conteúdo acabou de ser devolvido à requisição (mostra a confirmação no lugar do botão).
    filledId: null,
    // O envio que a pessoa escolheu no Histórico (só ele oferece "Preencher a requisição com este envio")
    // e se esse preenchimento mudou o campo Authorization.
    pickedId: null,
    fillAuthChanged: false,
    seq: 0,
    loadSeq: 0,
    busy: false,
    // A hora do clique do envio em andamento (o círculo do Executar para aos 5 s).
    busyAt: null,
    busyTimer: null,
    // O registro mostrado em Foi enviado (pode ser o da espera, que ainda não está no Histórico).
    sentOutRecord: null,
    // A aba escolhida no Resultado e o envio a que ela se refere: outro envio volta para Resposta.
    resultTab: 'resposta',
    tabRecordId: null,
    // A aba de Corpo (JSON), JSON ou Schema: vale para a página inteira e não é guardada.
    bodyTab: 'json',
    // O comando que "Copiar comando" de Requisição a enviar copiou; a mensagem da cópia some quando ele muda.
    copiedDraft: null,
    // Coluna da esquerda: a aba escolhida (toda carga da página abre em Rotas) e a contagem do Histórico
    // que vai junto do próximo anúncio quando a aba Histórico está fechada.
    sideTab: 'rotas',
    countNote: '',
    // O aviso de que o Histórico chegou ao limite, que vai junto do próximo anúncio do resultado.
    limitNote: '',
    // Quantos envios chegaram com a aba Histórico fechada (a contagem fica roxa enquanto houver algum).
    unseen: 0,
    // O envio que estava no Resultado antes de a página recarregar, até as rotas chegarem.
    restoreShownId: null,
    // O envio cujo fluxo ainda anda: até o veredito, nenhum lugar da página mostra o status dele.
    pendingId: null,
    // O envio de POST /login cujo token a rota escolhida envia agora em Authorization (o selo "token em uso").
    tokenMark: null,
    // Cópia do que "Limpar" apagou, para "Desfazer"; some no próximo envio.
    undo: null,
    // O envio mostrado em Resultado acabou de chegar (live) ou é um envio anterior.
    shownLive: false,
    // O modo de execução do Executar dividido: 'lenta' (padrão) ou 'normal'.
    mode: readSlowMotion() ? 'lenta' : 'normal',
    reduced: prefersReducedMotion()
  }

  // A câmera lenta vale quando é o modo escolhido e o sistema não pede menos movimento.
  function slowMotion () {
    return state.mode === 'lenta' && !state.reduced
  }

  /* ---------- Topo e idioma ---------- */

  function routeHash (route) {
    return '#' + route.method + route.path
  }

  // Cada bandeira é um link comum para a mesma página no outro idioma, mantendo a rota escolhida. A do
  // idioma da página já vem marcada do servidor (is-active e aria-current).
  function updateLanguageLinks () {
    document.querySelectorAll('.lang-switcher__button').forEach(link => {
      link.setAttribute('href', '?lang=' + encodeURIComponent(link.getAttribute('data-lang')) + window.location.hash)
    })
  }

  // Aviso de versão nova: o servidor escreve a versão e a URL da release na raiz (vazias quando não há
  // aviso; a versão vazia é o aviso sem número). Sem número, o link para as releases; com número, o botão
  // que abre o painel, com um ponto enquanto o painel dessa versão não foi aberto neste navegador.
  function paintNotice () {
    const root = document.documentElement
    const url = root.getAttribute('data-notice-url') || ''
    const latest = root.getAttribute('data-notice-version') || ''
    const notice = core.releaseNotice({ running: version, version: latest, url })
    if (!notice) return
    if (notice.kind === 'plain') {
      const link = $('version-notice')
      link.href = core.safeHref(url)
      link.replaceChildren(t('lab.version.notice_plain'), el('span', { class: 'sr-only', text: ' ' + t('lab.link.new_tab') }))
      link.hidden = false
      return
    }
    $('release-line').textContent = fillText(notice.line, { version: latest })
    $('release-dot').hidden = readLocal(RELEASE_SEEN_KEY) === latest
    $('release-panel').replaceChildren(
      el('p', { class: 'rel-title', id: 'release-title', text: fillText(notice.title, { version: latest }) }),
      el('p', { text: fillText(notice.runningKey, { version }) }),
      el('p', null, externalLink(url, fillText('lab.release.notes', { version: latest }))),
      el('p', { text: t('lab.release.update') }),
      el('pre', { class: 'code-page', text: 'npx serverest@latest' }),
      el('pre', { class: 'code-page', text: 'docker pull paulogoncalvesbh/serverest:latest' }),
      el('div', { class: 'rel-actions' }, el('button', { type: 'button', class: 'btn', id: 'release-close', text: t('lab.release.close'), onclick: () => closeRelease(true) })))
    $('release-panel').setAttribute('aria-labelledby', 'release-title')
    const button = $('release-btn')
    button.hidden = false
    button.addEventListener('click', () => {
      if ($('release-panel').hidden) openRelease(latest)
      else closeRelease(false)
    })
    // O painel não prende o foco: um clique fora, ou o foco saindo do botão e do painel (Tab depois de
    // Fechar, Shift + Tab antes do botão), fecha, e o foco segue o caminho normal.
    document.addEventListener('pointerdown', event => {
      if (!$('release-panel').hidden && !$('release-panel').contains(event.target) && !button.contains(event.target)) closeRelease(false)
    })
    ;[button, $('release-panel')].forEach(node => node.addEventListener('focusout', event => {
      const next = event.relatedTarget
      if (next && !$('release-panel').contains(next) && next !== button) closeRelease(false)
    }))
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !$('release-panel').hidden) {
        event.preventDefault()
        closeRelease(true)
      }
    })
  }

  // A primeira abertura guarda a versão: o ponto some e não volta para essa versão.
  function openRelease (latest) {
    $('release-panel').hidden = false
    $('release-btn').setAttribute('aria-expanded', 'true')
    $('release-dot').hidden = true
    writeLocal(RELEASE_SEEN_KEY, latest)
  }

  function closeRelease (refocus) {
    if ($('release-panel').hidden) return
    $('release-panel').hidden = true
    $('release-btn').setAttribute('aria-expanded', 'false')
    if (refocus) $('release-btn').focus()
  }

  // Leitura e escrita no armazenamento do navegador que nunca quebram a página (armazenamento bloqueado,
  // cheio ou numa janela privada).
  function readLocal (key) {
    try {
      return window.localStorage.getItem(key)
    } catch (e) {
      return null
    }
  }

  function writeLocal (key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch (e) {}
  }

  function readSession (key) {
    try {
      return window.sessionStorage.getItem(key)
    } catch (e) {
      return null
    }
  }

  function writeSession (key, value) {
    try {
      window.sessionStorage.setItem(key, value)
    } catch (e) {}
  }

  /* ---------- Tema e tamanho do texto (na barra do topo) ---------- */

  function readPref (key, allowed, fallback) {
    try {
      const value = window.localStorage.getItem(key)
      return allowed.includes(value) ? value : fallback
    } catch (e) {
      return fallback
    }
  }

  function savePref (key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch (e) {}
  }

  const prefs = {
    theme: readPref(THEME_KEY, ['system', 'light', 'dark'], 'system'),
    text: readPref(TEXT_KEY, TEXT_SIZES, 'normal')
  }

  function systemDark () {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch (e) {
      return false
    }
  }

  // O botão do esquema em uso fica pressionado (aria-pressed). O desenho vem da raiz (data-theme, escrita
  // por prefs-boot.js antes da primeira pintura), então o botão certo já aparece marcado.
  function applyTheme () {
    const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && systemDark())
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String((button.getAttribute('data-theme-choice') === 'dark') === dark))
    })
  }

  // Nas pontas (Normal e Maior) o botão fica com aria-disabled e continua focável: com disabled o foco
  // cairia no body.
  function applyText () {
    document.documentElement.setAttribute('data-text', prefs.text)
    $('text-down').setAttribute('aria-disabled', String(prefs.text === TEXT_SIZES[0]))
    $('text-up').setAttribute('aria-disabled', String(prefs.text === TEXT_SIZES[TEXT_SIZES.length - 1]))
  }

  function stepText (delta) {
    const index = TEXT_SIZES.indexOf(prefs.text) + delta
    if (index < 0 || index >= TEXT_SIZES.length) return
    prefs.text = TEXT_SIZES[index]
    savePref(TEXT_KEY, prefs.text)
    applyText()
    announce(fillText('lab.topbar.text_announce', { size: t(TEXT_SIZE_NAMES[prefs.text]) }))
  }

  // Guarda o botão pressionado (claro ou escuro), mesmo quando ele é o esquema do sistema: se o sistema
  // mudar depois, vale a escolha da pessoa. "system" é só o padrão, até o primeiro clique.
  function chooseTheme (dark) {
    prefs.theme = dark ? 'dark' : 'light'
    savePref(THEME_KEY, prefs.theme)
    applyTheme()
  }

  function setupView () {
    applyTheme()
    applyText()
    // Na ponta, o clique não faz nada e o foco fica no botão.
    $('text-down').addEventListener('click', () => stepText(-1))
    $('text-up').addEventListener('click', () => stepText(1))
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.addEventListener('click', () => chooseTheme(button.getAttribute('data-theme-choice') === 'dark'))
    })
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
    } catch (e) {}
  }

  // O modo de execução vem do menu do Executar dividido. Trocar para o normal no meio da câmera lenta leva
  // direto ao veredito.
  function setMode (mode) {
    if (state.mode === mode) return
    state.mode = mode
    saveSlowMotion(mode === 'lenta')
    paintRunMode()
    if (mode === 'normal') finishFlowNow()
  }

  // Termina na hora a animação que estiver rodando (modo normal escolhido, menos movimento ligado).
  function finishFlowNow () {
    if (!flow.model || flow.active >= flow.end) return
    clearTimeout(flow.timer)
    flow.run++
    flow.active = flow.end
    paintFlow()
    finishFlow()
  }

  /* ---------- Sobre o ServeRest ---------- */

  // O endereço do formulário de opinião no idioma da página; vazio, nenhuma entrada de opinião aparece.
  function feedbackUrl () {
    return core.feedbackFormUrl(FEEDBACK_FORM_URL[language], version, Date.now(), FEEDBACK_UNTIL)
  }

  // As listas do rodapé, que a marcação traz vazias. A documentação Swagger abre nesta aba, como o link da
  // barra; os outros abrem em outra aba. O contato do mantenedor vem de info.contact do documento e fica de
  // fora sem URL (o resto do rodapé não depende do documento, por isso já aparece antes dele chegar).
  function renderAbout (spec) {
    const contact = (spec && spec.info && spec.info.contact) || {}
    const contactUrl = core.safeHref(contact.url || '')
    const form = feedbackUrl()
    const item = (...children) => el('li', null, children)
    $('about-beyond').replaceChildren(
      item(el('a', { href: '/swagger?lang=' + encodeURIComponent(language), text: t('lab.topbar.docs') })),
      item(externalLink(ABOUT_URLS.postman, t('lab.about.link_postman'))),
      item(externalLink(ABOUT_URLS.repository, t('lab.about.link_local'))),
      item(externalLink(ABOUT_URLS.load, t('lab.about.link_load'))),
      item(externalLink(ABOUT_URLS.front, t('lab.about.link_front'))))
    $('about-help').replaceChildren(...[
      item(externalLink(ABOUT_URLS.issues, t('lab.about.link_issue'))),
      contactUrl ? item(externalLink(contactUrl, fillText('lab.about.link_contact', { name: contact.name || '' }))) : null,
      form ? item(externalLink(form, t('lab.feedback.footer')), el('span', { class: 'foot-sub', text: t('lab.feedback.footer_note') })) : null
    ].filter(Boolean))
    $('about-support').replaceChildren(...supportItems())
    $('about-thanks').replaceChildren(...thanksParts())
  }

  // "Apoie o ServeRest" aparece no rodapé e no Sobre do Resultado vazio: os mesmos links e o mesmo
  // agradecimento, feitos de novo para cada lugar.
  function supportItems () {
    return [[ABOUT_URLS.author, 'lab.about.link_follow'], [ABOUT_URLS.repository, 'lab.about.link_star'], [ABOUT_URLS.fund, 'lab.about.link_fund'], [ABOUT_URLS.contribute, 'lab.about.link_contribute']]
      .map(([url, key]) => el('li', null, externalLink(url, t(key))))
  }

  function thanksParts () {
    return parts('lab.about.thanks', { link: externalLink(ABOUT_URLS.ngo, t('lab.about.thanks_link')) })
  }

  // O selo de opinião da barra: só com o endereço do formulário (o CSS o mostra a partir de 1024 px). O
  // brilho dele toca uma vez por carga da página: terminado ou interrompido, não volta (lab.css).
  function paintFeedbackPill () {
    const form = feedbackUrl()
    const pill = $('feedback-pill')
    if (!form) return
    const stopShine = () => pill.classList.add('shine-done')
    pill.addEventListener('animationend', stopShine, { once: true })
    pill.addEventListener('animationcancel', stopShine, { once: true })
    pill.href = form
    pill.hidden = false
  }

  // Sobre o ServeRest no Resultado vazio da primeira visita: a apresentação e os três links de quem vai
  // testar fora desta página, e o caminho para o rodapé.
  // Depois de quem vai testar fora daqui, como apoiar o projeto, como no rodapé, e o convite para o
  // formulário de opinião enquanto ele estiver aberto.
  function aboutBand () {
    const go = (key, linkKey, url) => el('li', null, parts(key, { link: externalLink(url, t(linkKey)) }))
    const form = feedbackUrl()
    return el('section', { class: 'result-about', 'aria-labelledby': 'result-about-title' },
      el('div', { class: 'band' }, el('h3', { class: 'band-title', id: 'result-about-title', text: t('lab.about.title') })),
      el('div', { class: 'band-body about-body' },
        el('p', null, el('strong', { text: t('lab.about.intro') })),
        el('p', { class: 'about-go', text: t('lab.about.go_title') }),
        el('ul', { class: 'go-list', role: 'list' },
          go('lab.about.go_postman', 'lab.about.go_postman_link', ABOUT_URLS.postman),
          go('lab.about.go_local', 'lab.about.go_local_link', ABOUT_URLS.repository),
          go('lab.about.go_load', 'lab.about.go_load_link', ABOUT_URLS.load)),
        el('p', { class: 'about-go', text: t('lab.about.group_support') }),
        el('ul', { class: 'go-list', role: 'list' }, supportItems()),
        form ? el('p', null, parts('lab.about.feedback', { link: externalLink(form, t('lab.about.feedback_link')) })) : null,
        el('p', { class: 'muted small' }, thanksParts()),
        el('p', { class: 'muted small' }, parts('lab.about.more', { link: el('a', { href: '#about', text: t('lab.about.more_link'), onclick: goToAbout }) }))))
  }

  // O hash guarda a rota escolhida: seguir #about trocaria a rota pela primeira ao recarregar ou mudar
  // de idioma. O clique rola até o rodapé e põe o foco nele sem mexer no endereço.
  function goToAbout (event) {
    event.preventDefault()
    const about = $('about')
    if (!about) return
    if (!about.hasAttribute('tabindex')) about.setAttribute('tabindex', '-1')
    about.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    about.focus({ preventScroll: true })
  }

  // O convite para dar opinião, no Resultado vazio (core.feedbackInvite decide: a partir do 3º envio, uma aba
  // por dia de uso, com dois dias de uso de folga entre um dia e outro nos 10 primeiros dias, depois uma vez a
  // cada 30 dias). O cartão diz o custo antes de pedir: 2 minutos, 7 perguntas, sem login. O estado fica em
  // JSON no localStorage; o dia em que esta aba mostrou o convite, no sessionStorage.
  const INVITE_ICONS = {
    art: [['path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z', 'stroke-width': '1.6', 'stroke-linejoin': 'round' }], ['path', { d: 'M8.5 9.6l2.2 2.2 4.6-4.6', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }]],
    time: [['circle', { cx: '8', cy: '8', r: '6.25', 'stroke-width': '1.5' }], ['path', { d: 'M8 4.5V8l2.5 1.5', 'stroke-width': '1.5', 'stroke-linecap': 'round' }]],
    questions: [['path', { d: 'M3 4h10M3 8h10M3 12h6', 'stroke-width': '1.5', 'stroke-linecap': 'round' }]],
    login: [['path', { d: 'M8 1.75l5 2v4c0 3.2-2.2 5.4-5 6.5-2.8-1.1-5-3.3-5-6.5v-4z', 'stroke-width': '1.5', 'stroke-linejoin': 'round' }]]
  }

  function inviteIcon (name, size, box) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    ;[['width', size], ['height', size], ['viewBox', box], ['aria-hidden', 'true'], ['fill', 'none'], ['stroke', 'currentColor']].forEach(([key, value]) => svg.setAttribute(key, value))
    INVITE_ICONS[name].forEach(([tag, attrs]) => {
      const shape = document.createElementNS('http://www.w3.org/2000/svg', tag)
      Object.entries(attrs).forEach(([key, value]) => shape.setAttribute(key, value))
      svg.append(shape)
    })
    return svg
  }

  function inviteState () {
    return core.readInvite(readLocal(FEEDBACK_KEY), core.dayKey(new Date()))
  }

  // Cada abertura da página conta o dia de uso, para a folga entre um convite e outro. Um valor antigo é
  // regravado na hora, para a resposta migrada ficar com o dia de hoje.
  function countUsageDay () {
    const raw = readLocal(FEEDBACK_KEY)
    const after = JSON.stringify(core.inviteVisit(inviteState(), core.dayKey(new Date())))
    if (after !== raw) writeLocal(FEEDBACK_KEY, after)
  }

  function feedbackInviteNode () {
    const form = feedbackUrl()
    if (!form) return null
    const today = core.dayKey(new Date())
    const decision = core.feedbackInvite({ count: state.history.length, today, state: inviteState(), session: readSession(FEEDBACK_SESSION_KEY), edition: FEEDBACK_FORM_EDITION })
    if (!decision.show) return null
    if (decision.state) writeLocal(FEEDBACK_KEY, JSON.stringify(decision.state))
    if (decision.session) writeSession(FEEDBACK_SESSION_KEY, decision.session)
    const promise = (icon, key) => el('span', null, inviteIcon(icon, '13', '0 0 16 16'), t(key))
    return el('section', { class: 'invite', id: 'invite', 'aria-labelledby': 'invite-title' },
      el('span', { class: 'inv-art' }, inviteIcon('art', '26', '0 0 24 24')),
      el('p', { class: 'invite-title', id: 'invite-title', text: t('lab.feedback.invite_title') }),
      el('p', { class: 'inv-promise' }, promise('time', 'lab.feedback.promise_time'), promise('questions', 'lab.feedback.promise_questions'), promise('login', 'lab.feedback.promise_login')),
      el('div', { class: 'invite-actions' },
        externalLink(form, t('lab.feedback.invite_go'), { class: 'btn btn-primary inv-go', onclick: () => endInvite(true) }),
        el('button', { type: 'button', class: 'btn btn-quiet', id: 'invite-close', text: t('lab.feedback.invite_close'), onclick: () => endInvite(false) })),
      el('p', { class: 'invite-where', text: t('lab.feedback.invite_where') }))
  }

  // "Responder" (o link abre o formulário em outra aba) tira o convite por 180 dias; "Agora não", só hoje. O
  // cartão sai depois do clique, para o link abrir antes; o foco vai para a primeira linha do Resultado vazio,
  // em vez de cair no body, e "Agora não" anuncia que o convite volta outro dia e onde o link continua.
  function endInvite (answered) {
    writeLocal(FEEDBACK_KEY, JSON.stringify(core.inviteEnd(inviteState(), core.dayKey(new Date()), answered, FEEDBACK_FORM_EDITION)))
    setTimeout(() => {
      const invite = $('invite')
      if (!invite) return
      const first = $('result-empty-first')
      if (first) first.focus()
      invite.remove()
      if (!answered) announce(t('lab.feedback.closed'))
    }, 0)
  }

  // O guia "Como usar" (guia.js) só é baixado quando abre pela primeira vez. Enquanto baixa, o botão fica
  // ocupado; numa falha, uma frase curta diz isso, e o botão continua valendo. Abrir o guia encerra o convite.
  let guideLoading = false
  function openGuide (trigger) {
    if (guideLoading) return
    if (window.serverestGuide) {
      writeLocal(GUIDE_KEY, 'opened')
      if ($('guide-invite')) $('guide-invite').remove()
      window.serverestGuide.open()
      return
    }
    guideLoading = true
    const busy = [$('guide-open'), trigger].filter(Boolean)
    busy.forEach(button => button.setAttribute('aria-busy', 'true'))
    const script = el('script', { src: '/lab/assets/guia.js?v=' + encodeURIComponent(version) })
    script.onload = script.onerror = () => {
      guideLoading = false
      busy.forEach(button => button.removeAttribute('aria-busy'))
      if (window.serverestGuide) return openGuide()
      script.remove()
      const note = el('p', { class: 'rel-pop', 'aria-hidden': 'true', text: t('lab.guide.load_failed') })
      note.style.cssText = 'left: auto; right: 20px'
      // No fim da barra, fora do caminho do flex (logo depois do botão, ela desfaria o encaixe dele com .bar-end).
      $('guide-open').parentNode.append(note)
      setTimeout(() => note.remove(), 6000)
      announce(t('lab.guide.load_failed'))
    }
    document.head.append(script)
  }

  // O convite da primeira visita só aparece com o Histórico desta aba vazio (o de opinião pede 3 envios: os dois
  // nunca ficam juntos) e some de vez quando o guia abre ou em "Agora não".
  function guideInviteNode () {
    if (readLocal(GUIDE_KEY)) return null
    return el('section', { class: 'invite', id: 'guide-invite', 'aria-labelledby': 'guide-invite-title' },
      el('p', { class: 'invite-title', id: 'guide-invite-title', text: t('lab.guide.invite_lead') }),
      el('p', { text: t('lab.guide.invite_text') }),
      el('div', { class: 'invite-actions' },
        el('button', { type: 'button', class: 'btn btn-primary', text: t('lab.guide.invite_open'), onclick: event => openGuide(event.currentTarget) }),
        el('button', { type: 'button', class: 'btn btn-quiet', text: t('lab.feedback.invite_close'), onclick: dismissGuideInvite })))
  }

  function dismissGuideInvite () {
    writeLocal(GUIDE_KEY, 'dismissed')
    $('result-empty-first').focus()
    $('guide-invite').remove()
    announce(fillText('lab.guide.where', { open: t('lab.guide.open') }))
  }

  // O seletor de idioma do Swagger. A bandeira do idioma da página não recarrega; as outras guardam o
  // idioma escolhido e pedem à página nova que brilhe 1 s na cor da bandeira (sem brilho com menos
  // movimento pedido pelo sistema).
  function setupTopbar () {
    // A versão leva à página dela no GitHub: estáveis e betas têm release publicada.
    const box = $('version')
    const releaseHref = core.releaseUrl(version)
    box.textContent = ''
    // A seta de "abre outra aba" aparece só com o mouse ou o foco, por cima do espaço ao lado: a barra continua
    // numa linha.
    if (releaseHref) append(box, el('a', { class: 'version-link', href: releaseHref, target: '_blank', rel: 'noopener' }, fillText('lab.topbar.version', { version }), el('span', { class: 'hover-arrow', 'aria-hidden': 'true', text: '↗' }), el('span', { class: 'sr-only', text: ' ' + t('lab.link.new_tab') })))
    updateLanguageLinks()
    $('guide-open').addEventListener('click', () => openGuide(null))
    document.querySelectorAll('.lang-switcher__button').forEach(link => {
      link.addEventListener('click', event => {
        const code = link.getAttribute('data-lang')
        if (code === language) {
          event.preventDefault()
          return
        }
        try {
          window.localStorage.setItem(LANGUAGE_KEY, code)
        } catch (e) {}
        try {
          window.sessionStorage.setItem(GLOW_KEY, code)
        } catch (e) {}
      })
    })
    let glow = null
    try {
      glow = window.sessionStorage.getItem(GLOW_KEY)
      if (glow === language) window.sessionStorage.removeItem(GLOW_KEY)
    } catch (e) {}
    if (glow !== language || prefersReducedMotion()) return
    const pill = $('lang-switcher')
    // O estilo de repouso é calculado antes, para o brilho entrar com a transição de 0,15 s.
    pill.getBoundingClientRect()
    pill.setAttribute('data-glow-lang', language)
    pill.classList.add('lang-switcher--glow')
    setTimeout(() => {
      pill.classList.remove('lang-switcher--glow')
      pill.removeAttribute('data-glow-lang')
    }, 1000)
  }

  /* ---------- Documento OpenAPI ---------- */

  function loadSpec () {
    const seq = ++state.loadSeq
    state.spec = null
    state.specError = null
    const list = $('route-list')
    list.textContent = ''
    list.append(el('p', { class: 'empty' }, el('span', { class: 'spin', 'aria-hidden': 'true' }), ' ', t('lab.routes.loading')))
    $('routes-count').textContent = ''
    renderRequest()
    // A versão na URL troca a lista a cada versão nova: fora do localhost o servidor a deixa no cache do
    // navegador por um ano, e a visita seguinte não pede a lista de novo.
    const url = '/swagger.json?lang=' + encodeURIComponent(language) + '&v=' + encodeURIComponent(version)
    fetch(url).then(res => {
      if (!res.ok) throw new Error(fillText('lab.routes.http_error', { status: res.status + ' ' + core.statusText(res.status) }))
      return res.json()
    }).then(spec => {
      if (seq !== state.loadSeq) return
      state.spec = spec
      state.routes = core.buildRoutes(spec)
      state.authHeader = core.authHeaderOf(spec)
      const wanted = state.selected ? state.selected.key : routeKeyFromHash()
      state.selected = state.routes.find(route => route.key === wanted) || state.routes[0] || null
      renderRoutes()
      renderRequest()
      renderAbout(spec)
      showAfterLoad()
    }).catch(error => {
      if (seq !== state.loadSeq) return
      state.specError = (error && error.message) || String(error)
      state.routes = []
      renderRoutes()
      renderRequest()
      announce(t('lab.routes.error'))
    })
  }

  /* ---------- Rotas ---------- */

  function routeKeyFromHash () {
    try {
      const hash = decodeURIComponent(window.location.hash.slice(1))
      const match = /^(get|post|put|patch|delete)(\/.*)$/.exec(hash)
      return match ? match[1] + ' ' + match[2] : null
    } catch (e) {
      return null
    }
  }

  function writeHash (route) {
    try {
      window.history.replaceState(null, '', routeHash(route))
    } catch (e) {}
    updateLanguageLinks()
  }

  function renderRoutes () {
    const list = $('route-list')
    list.textContent = ''
    if (state.specError) {
      list.append(el('div', { class: 'error-box' },
        el('p', { text: t('lab.routes.error') }),
        el('p', { class: 'small', text: fillText('lab.routes.error_detail', { error: state.specError }) }),
        el('button', { class: 'btn', type: 'button', onclick: loadSpec, text: t('lab.routes.retry') })))
      $('routes-count').textContent = ''
      return
    }
    const query = $('filter').value.trim().toLowerCase()
    const shown = state.routes.filter(route => {
      if (!query) return true
      return (route.method + ' ' + route.path + ' ' + route.summary + ' ' + route.tag).toLowerCase().indexOf(query) !== -1
    })
    $('routes-count').textContent = query
      ? fillText('lab.routes.count_filtered', { shown: shown.length, total: state.routes.length })
      : fillText('lab.routes.count', { count: state.routes.length })
    $('side-count-rotas').textContent = query
      ? fillText('lab.routes.count_filtered', { shown: shown.length, total: state.routes.length })
      : String(state.routes.length)
    if (!shown.length) {
      list.append(el('p', { class: 'empty', text: fillText('lab.routes.empty', { query: $('filter').value.trim() }) }))
      return
    }
    core.tagOrder(state.spec, state.routes).forEach(tag => {
      const items = shown.filter(route => route.tag === tag)
      if (!items.length) return
      const ul = el('ul')
      items.forEach(route => {
        const lock = route.needsToken ? lockIcon() : null
        if (lock) {
          lock.setAttribute('title', t('lab.routes.needs_token'))
          lock.append(el('span', { class: 'sr-only', text: t('lab.routes.needs_token') }))
        }
        ul.append(el('li', null, el('button', {
          type: 'button',
          class: 'route',
          'data-key': route.key,
          'aria-current': state.selected && state.selected.key === route.key ? 'true' : null,
          onclick: () => selectRoute(route, true)
        },
        methodBadge(route.method),
        el('span', { class: 'path', text: route.path }),
        lock,
        el('span', { class: 'sum', text: route.summary }),
        el('span', { class: 'last' }))))
      })
      // A descrição do grupo fica sob o nome dele, como o Swagger UI mostra a descrição de cada tag.
      const description = tagDescription(tag)
      const name = tag || t('lab.routes.untagged')
      const count = el('span', { text: String(items.length) })
      const desc = description ? el('p', { class: 'group-desc', text: description }) : null
      list.append(el('div', { class: 'group' }, el('h3', null, name, count), desc, ul))
    })
    paintRouteMarks()
  }

  /* ---------- Coluna da esquerda: abas, ou o Histórico em coluna própria ---------- */

  // O layout vem do CSS: consultas de recipiente em rem (mudam com o tamanho do texto) põem em --layout
  // pilha (uma coluna), abas (três zonas, Rotas e Histórico como abas) ou quatro (o Histórico numa quarta
  // coluna, à direita do Resultado). O script só lê o resultado e o repete em data-layout na raiz, para o
  // CSS das abas e para quem precisa ancorar algo na página (um tour guiado, os testes).
  function currentLayout () {
    const value = getComputedStyle($('app')).getPropertyValue('--layout').trim()
    return ['pilha', 'abas', 'quatro'].includes(value) ? value : 'abas'
  }

  function sideTabbed () {
    return currentLayout() === 'abas'
  }

  const SIDE_PANELS = { rotas: { panel: 'routes', title: 'routes-title' }, historico: { panel: 'history', title: 'hist-title' } }
  let lastFocus = null

  function sidePanel (id) {
    return $(SIDE_PANELS[id].panel)
  }

  // O Histórico fica no DOM onde está na tela, para o teclado seguir a ordem visual: com abas, logo depois
  // das Rotas, dentro da coluna; com quatro zonas e numa coluna só, depois do Resultado. A lista de abas
  // só existe no layout com abas (fora dele, uma aba sozinha não seria aba).
  function placeSide () {
    const layout = currentLayout()
    const tabbed = layout === 'abas'
    // Uma consulta de recipiente pode já ter escondido o elemento com o foco, e o navegador então já
    // devolveu o foco ao body: o elemento é o último que o recebeu (lastFocus).
    const active = document.activeElement === document.body && lastFocus && lastFocus.isConnected ? lastFocus : document.activeElement
    // A aba com o foco some quando a lista de abas se esconde: o foco vai para o painel dela.
    const focusedTab = active && $('side-tabs').contains(active) ? active.id.replace('side-tab-', '') : null
    document.documentElement.setAttribute('data-layout', layout)
    $('side-tabs').hidden = !tabbed
    // A lista de rotas só fecha numa coluna. Fora dela volta aberta, senão o filtro ou a rota que receber
    // o foco nas abas sumiria debaixo dele quando a pilha voltasse.
    if (layout !== 'pilha' && $('routes').classList.contains('collapsed')) setRoutesCollapsed(false)
    const history = $('history')
    const inSide = history.parentElement === $('side')
    if (tabbed !== inSide) {
      const focused = history.contains(active) ? active : null
      if (tabbed) $('side').append(history)
      else $('result').after(history)
      if (focused) focusInView(focused)
    }
    // Com quatro zonas o Histórico está à vista: os envios marcados como novos passam a vistos (e a
    // contagem não precisa mais ir no anúncio). Numa coluna só ele fica embaixo do Resultado, talvez fora
    // da tela, então a marca espera a volta das abas.
    if (layout === 'quatro') {
      const had = state.unseen
      state.unseen = 0
      state.countNote = ''
      state.limitNote = ''
      if (had) saveView()
    }
    paintSideTabs()
    paintHistBadge(false)
    if (tabbed) {
      // O foco estava num painel que a aba fechada esconde: a aba dele passa a ser a escolhida.
      const owner = Object.keys(SIDE_PANELS).find(id => sidePanel(id).contains(active))
      if (owner && owner !== state.sideTab) selectSideTab(owner, false)
    } else if (focusedTab && SIDE_PANELS[focusedTab]) {
      focusPanel(focusedTab)
      return
    }
    // O layout novo escondeu o próprio controle com o foco (o botão que fecha a lista de rotas só existe
    // numa coluna): o foco vai para o painel que o contém, em vez de cair no body.
    if (active && active !== document.body && active.isConnected && !active.getClientRects().length) {
      const owner = Object.keys(SIDE_PANELS).find(id => sidePanel(id).contains(active))
      if (owner) focusPanel(owner)
    }
  }

  // Fora das abas os painéis não recebem o foco pelo Tab; o tabindex -1 existe só enquanto o foco está nele.
  function focusPanel (id) {
    holdFocus(id)
    focusInView(sidePanel(id))
  }

  // O foco que a página move fica à vista. Numa coluna só, o painel que o recebe pode estar longe da
  // rolagem atual (o Histórico vai para o fim da página, as Rotas ficam no topo).
  function focusInView (node) {
    node.focus({ preventScroll: true })
    node.scrollIntoView({ block: 'nearest' })
  }

  // Tirar o tabindex do painel que está com o foco joga o foco no body. Ele fica com -1 enquanto o foco
  // estiver nele; ao sair, recebe o tabindex de repouso do layout da hora (0 só no Histórico com abas).
  const heldPanels = new Set()
  function holdFocus (id) {
    const panel = sidePanel(id)
    panel.tabIndex = -1
    if (heldPanels.has(id)) return
    heldPanels.add(id)
    panel.addEventListener('blur', () => {
      heldPanels.delete(id)
      if (sideTabbed() && id === 'historico') panel.tabIndex = 0
      else panel.removeAttribute('tabindex')
    }, { once: true })
  }

  // Com abas, cada painel é um tabpanel nomeado pela aba; fora delas, uma zona nomeada pelo próprio h2.
  function paintSideTabs () {
    const tabbed = sideTabbed()
    Object.keys(SIDE_PANELS).forEach(id => {
      const panel = sidePanel(id)
      const title = SIDE_PANELS[id].title
      const tab = $('side-tab-' + id)
      const on = state.sideTab === id
      tab.setAttribute('aria-selected', on ? 'true' : 'false')
      tab.tabIndex = on ? 0 : -1
      panel.classList.toggle('side-off', tabbed && !on)
      if (tabbed) {
        panel.setAttribute('role', 'tabpanel')
        panel.setAttribute('aria-labelledby', tab.id)
      } else {
        panel.removeAttribute('role')
        panel.setAttribute('aria-labelledby', title)
      }
      // O painel do Histórico começa por texto (a contagem ou o aviso de vazio), não por um controle: como
      // pede o padrão de abas, ele mesmo recebe o foco depois da aba. O das Rotas começa pelo filtro.
      if (tabbed && id === 'historico') panel.tabIndex = 0
      else if (panel === document.activeElement) holdFocus(id)
      else panel.removeAttribute('tabindex')
    })
  }

  function selectSideTab (id, focus) {
    state.sideTab = id
    paintSideTabs()
    // Abrir a aba é ver os envios: o destaque da contagem sai, e ela não vai mais no anúncio.
    if (id === 'historico') {
      state.unseen = 0
      state.countNote = ''
      state.limitNote = ''
    }
    paintHistBadge(false)
    if (id === 'historico') keepEntryInView()
    if (focus) $('side-tab-' + id).focus()
    saveView()
  }

  // Abas com o teclado: setas, Home e End, com ativação automática. A aba escolhida não é guardada: toda
  // carga da página abre em Rotas, mesmo depois de recarregar ou trocar de idioma.
  function setupSide () {
    const ids = Object.keys(SIDE_PANELS)
    ids.forEach((id, index) => {
      const tab = $('side-tab-' + id)
      tab.addEventListener('click', () => selectSideTab(id, false))
      tab.addEventListener('keydown', event => {
        let next = null
        if (event.key === 'ArrowRight') next = (index + 1) % ids.length
        else if (event.key === 'ArrowLeft') next = (index - 1 + ids.length) % ids.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = ids.length - 1
        if (next === null) return
        event.preventDefault()
        selectSideTab(ids[next], true)
      })
    })
    // O último elemento a receber o foco. Sai quando a pessoa tira o foco dele sem levá-lo a outro lugar (um
    // clique fora de qualquer controle). Quando é uma regra de CSS que o esconde, o blur chega com ele já
    // sem caixa, e ele fica aqui para placeSide.
    document.addEventListener('focusin', event => { lastFocus = event.target })
    document.addEventListener('focusout', event => {
      if (!event.relatedTarget && event.target.getClientRects().length) lastFocus = null
    })
    // O layout depende da largura e do tamanho do texto: confere a cada mudança de tamanho, e só mexe no
    // DOM quando ele troca.
    let last = null
    const check = () => {
      const now = currentLayout()
      if (now === last) return
      last = now
      placeSide()
    }
    if (window.ResizeObserver) new ResizeObserver(() => window.requestAnimationFrame(check)).observe(document.body)
    window.addEventListener('resize', check)
    check()
  }

  function tagDescription (tag) {
    const found = ((state.spec && state.spec.tags) || []).find(item => item.name === tag)
    return found && found.description ? found.description : ''
  }

  function latestFor (key) {
    return core.lastResultByRoute(state.history).get(key) || null
  }

  // Cada rota mostra a marca do seu envio mais recente (símbolo e código): a lista vira o registro
  // do que já foi tentado. Atualiza no lugar, sem refazer a lista, para não perder a rolagem.
  function paintRouteMarks () {
    // A marca espera o veredito do fluxo: um envio pendente não muda a marca da rota.
    const latest = core.lastResultByRoute(state.history.filter(item => item.id !== state.pendingId))
    document.querySelectorAll('.route').forEach(button => {
      const mark = button.querySelector('.last')
      const record = latest.get(button.getAttribute('data-key')) || null
      mark.textContent = ''
      if (!record) return
      const code = record.error ? t('lab.history.failed') : String(record.status)
      const status = record.error ? t('lab.history.failed') : statusLine(record)
      mark.className = 'last chip ' + (record.error ? 'fail' : statusClass(record.status))
      mark.append(el('span', { 'aria-hidden': 'true', text: (record.error ? '✗' : statusGlyph(record.status)) + ' ' + code }),
        el('span', { class: 'sr-only', text: fillText('lab.routes.last', { status }) }))
    })
  }

  function selectRoute (route, fromClick) {
    state.selected = route
    writeHash(route)
    document.querySelectorAll('.route').forEach(button => {
      if (button.getAttribute('data-key') === route.key) button.setAttribute('aria-current', 'true')
      else button.removeAttribute('aria-current')
    })
    renderRequest()
    // O resultado acompanha a rota: o envio mais recente dela, marcado como anterior, ou um estado vazio.
    showForSelected()
    if (fromClick && isNarrow()) {
      // A lista fica aberta enquanto a pessoa explora; depois do primeiro envio, fecha a cada escolha.
      if (state.history.length) setRoutesCollapsed(true)
      $('request').focus({ preventScroll: true })
      $('request').scrollIntoView({ block: 'start' })
    }
  }

  function setRoutesCollapsed (collapsed) {
    $('routes').classList.toggle('collapsed', collapsed)
    const toggle = $('routes-toggle')
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
    toggle.textContent = collapsed ? t('lab.routes.show') : t('lab.routes.hide')
  }

  /* ---------- Requisição ---------- */

  function draftFor (route) {
    if (!state.drafts[route.key]) {
      const params = {}
      route.params.forEach(param => {
        params[param.in + ':' + param.name] = prefills(route, param) ? String(param.def) : ''
      })
      // Sem a chave auth a rota segue o token da página; a primeira edição do campo cria a chave.
      state.drafts[route.key] = { params, body: route.body ? JSON.stringify(route.body.example, null, 2) : '' }
    }
    return state.drafts[route.key]
  }

  function prefills (route, param) {
    return param.in === 'path' && param.def !== undefined && PREFILL_METHODS.includes(route.method)
  }

  function authValue (route) {
    return core.authValueFor(draftFor(route), state.token)
  }

  function currentRequest (route) {
    return core.buildRequest(route, draftFor(route), { baseUrl, authValue: authValue(route), authHeader: state.authHeader })
  }

  // O link da rota na documentação mora no cabeçalho da zona e some quando não há rota escolhida. O nome
  // acessível é uma frase só, que começa pelo texto visível (quem usa comando de voz diz o que vê).
  function paintDocLink (route) {
    const link = $('doc-link')
    link.hidden = !route
    if (!route) return
    const label = t('lab.docs.route_short')
    link.href = core.swaggerLink(route, language)
    link.setAttribute('aria-label', fillText('lab.docs.route_name', { label }))
    link.replaceChildren(label, el('span', { 'aria-hidden': 'true', text: ' ↗' }))
  }

  // "O que é POST? ↗": a página do método na MDN, numa aba nova, no idioma da página quando a MDN tem a
  // tradução. O nome acessível é uma frase inteira em aria-label, que começa pelo texto visível e já diz que
  // abre outra aba.
  function methodLink (method) {
    const name = method.toUpperCase()
    const mdn = core.mdnMethodUrl(name, language)
    return el('a', { class: 'method-link', href: mdn.url, target: '_blank', rel: 'noopener', 'aria-label': fillText(mdn.english ? 'lab.method.link_name_english' : 'lab.method.link_name', { method: name }) },
      parts('lab.method.what', { method: el('span', { class: 'm-name', text: name }) }),
      el('span', { 'aria-hidden': 'true', text: ' ↗' }))
  }

  // A Requisição sem abas: o título, a descrição, a barra de endereço com a URL já resolvida, a linha do
  // atalho e as seções com faixa: Parâmetros, Corpo (JSON) (só com corpo; com as abas JSON e Schema quando
  // o documento traz o schema), Requisição a enviar (o comando curl, refeito a cada edição) e Respostas possíveis,
  // sempre à vista e por último.
  function renderRequest () {
    const box = $('request')
    box.textContent = ''
    state.copiedDraft = null
    if (state.specError || !state.spec || !state.selected) {
      let message = t('lab.request.loading')
      if (state.specError) message = t('lab.request.no_spec')
      else if (state.spec) message = t('lab.request.choose')
      box.append(el('p', { class: 'muted small', id: 'req-title', text: message }))
      box.removeAttribute('data-route')
      paintDocLink(null)
      return
    }
    const route = state.selected
    const draft = draftFor(route)
    paintDocLink(route)
    box.setAttribute('data-route', route.key)

    // O título da rota abre a zona; o grupo e a descrição dele ficam na lista de rotas.
    append(box, [
      el('h3', { class: 'req-title', id: 'req-title', text: route.summary || route.method.toUpperCase() + ' ' + route.path }),
      route.description ? el('div', { class: 'req-desc' }, richText(route.description)) : null,
      el('div', { class: 'req-bar-wrap' },
        el('div', { class: 'req-bar' },
          methodBadge(route.method),
          // A base e o caminho: a base sai quando não cabe; o title guarda a URL inteira. O caminho já vem com
          // os parâmetros preenchidos (paintResolvedUrl, a cada edição).
          el('code', { class: 'req-path', id: 'req-path', title: baseUrl + route.path },
            el('span', { class: 'req-base', text: baseUrl }),
            el('span', { class: 'req-route' }, el('span', { dir: 'ltr', id: 'req-route-text', text: route.path }))),
          runControl())),
      el('div', { class: 'req-hint' },
        methodLink(route.method),
        el('span', { class: 'kbd-hint' }, parts('lab.actions.shortcut', { ctrl: el('kbd', { text: ctrlName() }), enter: el('kbd', { text: 'Enter' }) }))),
      reqSection('params', t('lab.section.params'), null, paramsContent(route, draft)),
      route.body ? reqSection('body', t('lab.section.body'), null, bodyContent(route, draft)) : null,
      reqSection('sent', t('lab.sent.title'), draftCopyButton(), curlBlock()),
      reqSection('responses', t('lab.section.responses'), null, null)
    ])
    paintDocResponses()
    refreshPreview()
    setBusy(state.busy)
  }

  // Uma seção da Requisição: a faixa (título h4 e, à direita, os controles da seção) e o conteúdo.
  function reqSection (id, title, tools, content) {
    const titleId = 'sec-' + id + '-title'
    return el('section', { class: 'req-section', id: 'sec-' + id, 'aria-labelledby': titleId },
      el('div', { class: 'band' },
        el('h4', { class: 'band-title', id: titleId, text: title }),
        tools ? el('div', { class: 'band-tools' }, tools) : null),
      el('div', { class: 'band-body', id: 'sec-' + id + '-body' }, content))
  }

  /* ---------- Executar dividido e o modo de execução ---------- */

  // Um ícone do sprite do começo do body, decorativo.
  function icon (id, className) {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('class', 'ico' + (className ? ' ' + className : ''))
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    const use = document.createElementNS(ns, 'use')
    use.setAttribute('href', '#' + id)
    svg.append(use)
    return svg
  }

  // Os dois itens do menu: normal (as setas do ServeRest) e câmera lenta (o caracol).
  const RUN_MODES = [
    { mode: 'normal', icon: 'i-setas', label: 'lab.run.normal', sub: 'lab.run.normal_sub' },
    { mode: 'lenta', icon: 'i-snail', label: 'lab.run.slow', sub: 'lab.run.slow_sub' }
  ]

  // Executar envia no modo em uso; o segmento da direita abre o menu do modo, no padrão de botão de menu:
  // Enter, Espaço ou as setas abrem com o foco no item marcado; as setas andam pelos itens (com volta), Home
  // e End vão às pontas; Escape fecha e devolve o foco ao segmento; Tab, Shift + Tab, um clique fora ou o
  // foco saindo fecham. Escolher um item fecha o menu, leva o foco a Executar e não envia. Os itens ficam
  // fora da ordem do Tab (tabindex -1), como pede o padrão de menu.
  function runControl () {
    const run = el('button', { type: 'button', class: 'btn btn-primary', id: 'run', onclick: execute })
    const modeButton = el('button', { type: 'button', class: 'run-mode', id: 'run-mode', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': 'run-menu' })
    const items = RUN_MODES.map(item => el('button', {
      type: 'button',
      role: 'menuitemradio',
      class: 'run-item',
      'data-mode': item.mode,
      tabindex: '-1',
      'aria-checked': 'false',
      'aria-labelledby': 'run-item-' + item.mode,
      'aria-describedby': 'run-item-' + item.mode + '-sub'
    },
    icon('i-check', 'ico-check'),
    el('span', { class: 'run-item-label', id: 'run-item-' + item.mode }, icon(item.icon), t(item.label)),
    el('span', { class: 'run-item-sub', id: 'run-item-' + item.mode + '-sub', text: t(item.sub) })))
    const menu = el('ul', { class: 'run-menu', id: 'run-menu', role: 'menu', 'aria-labelledby': 'run-mode', hidden: true },
      items.map(item => el('li', { role: 'none' }, item)))
    const split = el('div', { class: 'run-split', id: 'run-split' }, run, modeButton, menu)
    modeButton.addEventListener('click', () => {
      if (menu.hidden) openRunMenu()
      else closeRunMenu(true)
    })
    modeButton.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()
      openRunMenu()
    })
    items.forEach((item, index) => {
      item.addEventListener('click', () => {
        setMode(item.getAttribute('data-mode'))
        closeRunMenu(false)
        $('run').focus()
      })
      item.addEventListener('keydown', event => {
        let next = null
        if (event.key === 'ArrowDown') next = (index + 1) % items.length
        else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = items.length - 1
        if (next !== null) {
          event.preventDefault()
          items[next].focus()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          closeRunMenu(true)
        } else if (event.key === 'Tab') {
          // Tab e Shift + Tab fecham o menu e seguem a ordem do Tab a partir do segmento: o próximo controle
          // depois dele, ou Executar antes dele.
          closeRunMenu(true)
        }
      })
    })
    // O foco que sai do botão dividido fecha o menu (Tab, Shift + Tab, um clique em outro lugar).
    split.addEventListener('focusout', event => {
      if (!split.contains(event.relatedTarget)) closeRunMenu(false)
    })
    return split
  }

  function openRunMenu () {
    const menu = $('run-menu')
    const button = $('run-mode')
    if (!menu || button.getAttribute('aria-disabled') === 'true') return
    menu.hidden = false
    button.setAttribute('aria-expanded', 'true')
    const checked = menu.querySelector('[aria-checked="true"]') || menu.querySelector('[role="menuitemradio"]')
    checked.focus()
  }

  // refocus: o foco volta ao segmento (Escape, ou um clique nele com o menu aberto). Sem refocus, um foco que
  // ainda estava num item vai para Executar, nunca para o body.
  function closeRunMenu (refocus) {
    const menu = $('run-menu')
    if (!menu || menu.hidden) return
    const inside = menu.contains(document.activeElement)
    menu.hidden = true
    $('run-mode').setAttribute('aria-expanded', 'false')
    if (refocus) $('run-mode').focus()
    else if (inside) $('run').focus({ preventScroll: true })
  }

  // O segmento mostra o ícone do modo em uso e a seta de menu; os nomes dizem o modo. Com menos movimento
  // pedido pelo sistema a câmera lenta não anima: o segmento some e Executar fica um botão só, e o modo
  // guardado não muda.
  function paintRunMode () {
    const run = $('run')
    const button = $('run-mode')
    if (!run || !button) return
    const slow = state.mode === 'lenta'
    const name = fillText('lab.run.mode', { mode: t(slow ? 'lab.run.mode_slow' : 'lab.run.mode_normal') })
    button.replaceChildren(icon(slow ? 'i-snail' : 'i-setas'), icon('i-chev', 'ico-chev'))
    button.setAttribute('aria-label', name)
    button.setAttribute('title', name)
    button.hidden = state.reduced
    if (state.reduced) closeRunMenu(false)
    document.querySelectorAll('#run-menu [role="menuitemradio"]').forEach(item => item.setAttribute('aria-checked', String(item.getAttribute('data-mode') === state.mode)))
    // Durante o envio o nome é o texto visível ("Executando").
    if (!state.busy && slowMotion()) run.setAttribute('aria-label', t('lab.run.execute_slow'))
    else run.removeAttribute('aria-label')
    // Os data-* daqui em diante são para o guia (guia.js), que nunca lê o texto traduzido.
    run.setAttribute('data-send-mode', slowMotion() ? 'lenta' : 'normal')
  }

  function publicLine () {
    return el('p', { class: 'auth-public' }, lockIcon(14), el('span', null, t('lab.auth.public_title') + ' ' + t('lab.auth.public')))
  }

  // Parâmetros: path, query e, nas rotas com cadeado, a linha do header Authorization, na mesma grade. Cada
  // linha já diz onde o parâmetro vai, então não há legenda de grupo.
  function paramsContent (route, draft) {
    const rows = route.params.filter(param => param.in === 'path')
      .concat(route.params.filter(param => param.in === 'query'))
      .map(param => paramField(route, param, draft))
    if (route.needsToken) rows.push(authField(route, draft))
    return [
      rows.length ? el('div', { class: 'params' }, rows) : el('p', { class: 'params-none', text: t('lab.params.none') }),
      route.needsToken ? null : publicLine()
    ]
  }

  // Requisição a enviar: o comando curl do rascunho, sempre com o corpo inteiro, e sob ele a mensagem da cópia.
  function curlBlock () {
    return [
      el('pre', { class: 'code-page curl-pre', id: 'curl-pre' }),
      el('div', { class: 'captions' }, el('p', { class: 'copy-msg', id: 'copy-msg' }))
    ]
  }

  function draftCopyButton () {
    return el('button', { type: 'button', class: 'btn btn-copy', id: 'copy-draft', 'aria-label': t('lab.copy.command_draft'), text: t('lab.copy.command'), onclick: copyDraft })
  }

  /* ---------- Respostas possíveis ---------- */

  const examplesQuery = (() => {
    try {
      return window.matchMedia(NARROW_EXAMPLES)
    } catch (e) {
      return null
    }
  })()

  function narrowExamples () {
    return !!(examplesQuery && examplesQuery.matches)
  }

  // Refeita quando a largura cruza 37,5 rem: abaixo disso cada exemplo fica num details fechado.
  function paintDocResponses () {
    const box = $('sec-responses-body')
    if (!box || !state.selected) return
    box.replaceChildren()
    append(box, docResponses(state.selected))
  }

  // Respostas documentadas da rota (responses do documento): o status code, a descrição e o exemplo de
  // corpo, para o aluno saber o que verificar. Como a tabela do Swagger, com as duas colunas em toda largura.
  // O status recebido nunca é marcado aqui.
  function docResponses (route) {
    if (!route.responses.length) return el('p', { class: 'muted small', text: t('lab.responses.none') })
    const narrow = narrowExamples()
    return [
      el('p', { class: 'doc-intro', text: t('lab.responses.intro') }),
      el('div', { class: 'doc-cols', 'aria-hidden': 'true' }, el('span', { text: t('lab.responses.col_code') }), el('span', { text: t('lab.responses.col_desc') })),
      el('ul', { class: 'doc-responses' }, route.responses.map(response => el('li', { id: 'doc-response-' + response.status },
        el('span', { class: 'doc-code' }, docCodeLink(response.status)),
        el('span', { class: 'doc-desc' }, richInline(response.description)),
        response.example !== undefined
          ? docExample(response.example, narrow)
          : el('p', { class: 'doc-none', text: t('lab.responses.no_example') }))))
    ]
  }

  // "401 ↗" visível, um link para a página do status na MDN, numa aba nova. O nome acessível é uma frase
  // inteira em aria-label, que já diz que abre outra aba.
  function docCodeLink (code) {
    if (!/^\d{3}$/.test(String(code))) return String(code)
    const mdn = core.mdnStatusUrl(code, language)
    const name = fillText(mdn.english ? 'lab.status.link_name_english' : 'lab.status.link_name', { status: String(code) })
    return el('a', { href: mdn.url, target: '_blank', rel: 'noopener', 'aria-label': name },
      String(code),
      el('span', { 'aria-hidden': 'true', text: ' ↗' }))
  }

  function docExample (example, narrow) {
    const text = JSON.stringify(example, null, 2)
    const pre = el('pre', { class: 'code-page' })
    // highlightJson escapa cada pedaço antes de envolvê-lo (a mesma marcação da resposta).
    pre.innerHTML = core.highlightJson(text)
    if (!narrow) {
      pre.classList.add('doc-example')
      return pre
    }
    const lines = text.split('\n').length
    return el('details', { class: 'doc-example' },
      el('summary', { text: lines === 1 ? t('lab.responses.show_example_one') : fillText('lab.responses.show_example', { count: lines }) }),
      pre)
  }

  function richInline (source) {
    return String(source || '').split('`').map((piece, index) => index % 2 ? el('code', { text: piece }) : piece)
  }

  // O campo é montado uma vez por rota: refreshPreview roda a cada tecla e só ajusta textos e
  // visibilidade, para que digitar não tire o foco nem mova o cursor. Ele é uma linha da grade de
  // parâmetros, com o tipo "string (header)" sob o nome.
  function authField (route, draft) {
    const input = el('input', {
      class: 'input mono',
      id: 'auth-input',
      type: 'text',
      ...core.FIELD_ASSISTS_OFF,
      'aria-describedby': 'auth-type auth-caption auth-error'
    })
    input.value = authValue(route)
    const error = el('p', { class: 'auth-error', id: 'auth-error' })
    const clearError = () => {
      input.removeAttribute('aria-invalid')
      error.textContent = ''
    }
    input.addEventListener('input', () => {
      draft.auth = input.value
      delete draft.authFrom
      clearError()
      refreshPreview()
    })
    const undo = el('button', {
      type: 'button',
      class: 'btn btn-quiet',
      id: 'auth-undo',
      text: t('lab.auth.undo'),
      onclick: () => {
        delete draft.auth
        delete draft.authFrom
        clearError()
        refreshPreview()
        input.focus()
        announce(t(state.token ? 'lab.auth.undone_with_token' : 'lab.auth.undone_empty'))
      }
    })
    const discard = el('button', { type: 'button', class: 'btn btn-quiet', id: 'auth-discard', text: t('lab.token.discard'), onclick: discardToken })
    const lock = lockIcon(13)
    lock.append(el('span', { class: 'sr-only', text: t('lab.routes.needs_token') }))
    // Sem marca de obrigatório: a página deixa enviar sem o header, e o fluxo mostra a recusa.
    return el('div', { class: 'field auth-row', id: 'auth-group' },
      el('div', { class: 'param-label' }, lock, el('label', { for: 'auth-input' }, el('code', { text: state.authHeader }))),
      input,
      paramType('auth-type', 'string', t('lab.params.in_header')),
      el('p', { class: 'auth-caption', id: 'auth-caption' }),
      error,
      el('div', { class: 'auth-actions' }, undo, discard))
  }

  function paramField (route, param, draft) {
    const id = 'param-' + param.in + '-' + param.name
    const key = param.in + ':' + param.name
    let input
    if (param.enumValues) {
      input = el('select', { class: 'input mono', id })
      input.append(el('option', { value: '', text: t('lab.params.not_sent') }))
      param.enumValues.forEach(value => input.append(el('option', { value: String(value), text: String(value) })))
    } else {
      input = el('input', {
        class: 'input mono',
        id,
        type: 'text',
        ...core.FIELD_ASSISTS_OFF,
        placeholder: exampleOfParam(param) !== undefined ? fillText('lab.params.example', { example: exampleOfParam(param) }) : null
      })
    }
    input.value = draft.params[key]
    const update = () => {
      draft.params[key] = input.value
      input.removeAttribute('aria-invalid')
      refreshPreview()
    }
    input.addEventListener('input', update)
    input.addEventListener('change', update)
    // Em DELETE e PUT o valor documentado vira só exemplo: uma frase diz por que o campo começa vazio.
    const unfilled = param.in === 'path' && param.def !== undefined && !prefills(route, param)
    const helps = [
      param.description ? el('span', { class: 'param-help', id: id + '-help', text: param.description }) : null,
      unfilled ? el('span', { class: 'param-help', id: id + '-empty', text: t('lab.params.no_prefill') }) : null
    ].filter(Boolean)
    // Como na tabela do Swagger: sob o nome, o tipo e o lugar do parâmetro, sem tradução ("string" e, na
    // linha de baixo, "(path)" ou "(query)"). Na grade, a célula fica abaixo do nome; a ajuda, abaixo do campo.
    const type = paramType(id + '-type', param.type, t(param.in === 'path' ? 'lab.params.in_path' : 'lab.params.in_query'))
    input.setAttribute('aria-describedby', [type].concat(helps).map(help => help.id).join(' '))
    return el('div', { class: 'field' },
      el('label', { class: 'param-label', for: id },
        el('code', { text: param.name }),
        param.required ? el('span', { class: 'req-mark', text: t('lab.params.required') }) : null),
      input,
      type,
      helps)
  }

  // O tipo numa linha e o lugar na de baixo, como no Swagger UI. O espaço entre os dois mantém
  // "string (query)" na descrição que o leitor de tela lê.
  function paramType (id, type, where) {
    return el('span', { class: 'param-type', id },
      type ? [el('span', { class: 'param-type-name', text: type }), ' '] : null,
      el('span', { class: 'param-in', text: where }))
  }

  function exampleOfParam (param) {
    return param.example !== undefined ? param.example : param.def
  }

  // O editor do corpo, na mesma ordem do campo Authorization: o campo, a legenda que diz de onde vem o
  // corpo, o aviso de JSON e "Restaurar exemplo", que só aparece quando há o que restaurar. O que muda fica
  // abaixo do editor, então ele nunca se move enquanto se digita.
  function bodyEditor (route, draft) {
    const editor = el('textarea', { class: 'editor', id: 'body-editor', ...core.FIELD_ASSISTS_OFF, wrap: 'off', 'aria-describedby': 'body-state json-note' })
    editor.value = draft.body
    editor.rows = Math.min(18, Math.max(6, draft.body.split('\n').length + 1))
    const note = el('p', { class: 'json-note', id: 'json-note' })
    let wasInvalid = false
    const checkJson = announceChange => {
      let invalid = false
      if (editor.value.trim()) {
        try {
          JSON.parse(editor.value)
        } catch (e) {
          invalid = true
        }
      }
      note.textContent = invalid ? t('lab.body.invalid') : ''
      if (announceChange && invalid && !wasInvalid) announce(t('lab.body.invalid'))
      wasInvalid = invalid
    }
    const example = JSON.stringify(route.body.example, null, 2)
    const stateText = el('p', { class: 'body-state', id: 'body-state' })
    const restore = el('button', { type: 'button', class: 'btn btn-quiet', id: 'body-restore', text: t('lab.body.restore') })
    const paintBodyState = () => {
      const same = draft.body === example
      stateText.textContent = same ? t('lab.body.state_example') : draft.bodyFrom ? fillText('lab.body.state_filled', { time: clock(draft.bodyFrom) }) : t('lab.body.state_edited')
      restore.hidden = same
    }
    restore.addEventListener('click', () => {
      draft.body = example
      delete draft.bodyFrom
      editor.value = draft.body
      checkJson(false)
      refreshPreview()
      paintBodyState()
      // O botão some quando o corpo volta ao exemplo: o foco vai para o editor, como no "Desfazer a edição".
      editor.focus()
      announce(t('lab.body.restored'))
    })
    editor.addEventListener('input', () => {
      draft.body = editor.value
      delete draft.bodyFrom
      checkJson(true)
      refreshPreview()
      paintBodyState()
    })
    checkJson(false)
    paintBodyState()
    // A faixa já diz Corpo (JSON); o rótulo completo fica para o leitor de tela.
    return el('div', { class: 'field' },
      el('label', { for: 'body-editor', class: 'sr-only', text: t('lab.body.label') }),
      editor,
      stateText,
      note,
      el('div', { class: 'body-actions' }, restore))
  }

  /* ---------- Schema do corpo ---------- */

  // O schema do corpo da rota, só quando o documento diz quais campos existem e quais são obrigatórios. Sem
  // isso não há tabela: uma lista sem "obrigatório" ensinaria errado.
  function bodySchema (route) {
    const schema = route && route.body ? route.body.schema : null
    return schema && schema.properties && Array.isArray(schema.required) ? schema : null
  }

  // Corpo (JSON): as abas JSON (o editor) e Schema (a tabela), como no Swagger; sem schema, só o editor.
  function bodyContent (route, draft) {
    const field = bodyEditor(route, draft)
    const schema = bodySchema(route)
    return schema ? bodyTabs(field, schemaParts(schema)) : field
  }

  // A aba escolhida vale para a página inteira e não fica guardada. Teclado como nas outras abas: setas com
  // volta, Home e End, com ativação automática.
  const BODY_TABS = ['json', 'schema']
  const BODY_TAB_NAMES = { json: 'lab.body_tabs.json', schema: 'lab.body_tabs.schema' }

  function bodyTabs (field, schemaNodes) {
    const buttons = BODY_TABS.map(id => el('button', { class: 'folder-tab', type: 'button', role: 'tab', id: 'body-tab-' + id, 'aria-controls': 'body-panel-' + id, text: t(BODY_TAB_NAMES[id]) }))
    const strip = el('div', { class: 'folder-tabs body-tabs', role: 'tablist', 'aria-label': t('lab.body_tabs.label') }, buttons)
    const panels = [
      el('div', { class: 'body-panel', id: 'body-panel-json', role: 'tabpanel', 'aria-labelledby': 'body-tab-json' }, field),
      el('div', { class: 'body-panel', id: 'body-panel-schema', role: 'tabpanel', 'aria-labelledby': 'body-tab-schema', tabindex: '0' }, schemaNodes)
    ]
    BODY_TABS.forEach((id, index) => {
      buttons[index].addEventListener('click', () => selectBodyTab(id, false))
      buttons[index].addEventListener('keydown', event => {
        let next = null
        if (event.key === 'ArrowRight') next = (index + 1) % BODY_TABS.length
        else if (event.key === 'ArrowLeft') next = (index - 1 + BODY_TABS.length) % BODY_TABS.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = BODY_TABS.length - 1
        if (next === null) return
        event.preventDefault()
        selectBodyTab(BODY_TABS[next], true)
      })
    })
    paintBodyTabs(buttons, panels)
    return [strip].concat(panels)
  }

  function paintBodyTabs (buttons, panels) {
    BODY_TABS.forEach((id, index) => {
      const on = state.bodyTab === id
      buttons[index].setAttribute('aria-selected', on ? 'true' : 'false')
      buttons[index].tabIndex = on ? 0 : -1
      panels[index].hidden = !on
    })
  }

  function selectBodyTab (id, focus) {
    state.bodyTab = id
    const buttons = BODY_TABS.map(item => $('body-tab-' + item))
    if (buttons.some(button => !button)) return
    paintBodyTabs(buttons, BODY_TABS.map(item => $('body-panel-' + item)))
    if (focus) $('body-tab-' + id).focus()
  }

  // Cada regra tem a frase do campo obrigatório e a do campo opcional ("Se for enviado, …"), as duas
  // inteiras, para cada idioma ter a sua ordem de palavras.
  const SCHEMA_RULES = {
    not_blank: ['lab.schema.rule.not_blank', 'lab.schema.rule_if_sent.not_blank'],
    any: ['lab.schema.rule.any', 'lab.schema.rule_if_sent.any'],
    email: ['lab.schema.rule.email', 'lab.schema.rule_if_sent.email'],
    enum: ['lab.schema.rule.enum', 'lab.schema.rule_if_sent.enum'],
    enum_quoted: ['lab.schema.rule.enum_quoted', 'lab.schema.rule_if_sent.enum_quoted'],
    enum_one: ['lab.schema.rule.enum_one', 'lab.schema.rule_if_sent.enum_one'],
    integer: ['lab.schema.rule.integer', 'lab.schema.rule_if_sent.integer'],
    integer_min: ['lab.schema.rule.integer_min', 'lab.schema.rule_if_sent.integer_min'],
    number: ['lab.schema.rule.number', 'lab.schema.rule_if_sent.number'],
    number_min: ['lab.schema.rule.number_min', 'lab.schema.rule_if_sent.number_min'],
    boolean: ['lab.schema.rule.boolean', 'lab.schema.rule_if_sent.boolean'],
    array: ['lab.schema.rule.array', 'lab.schema.rule_if_sent.array'],
    array_min_one: ['lab.schema.rule.array_min_one', 'lab.schema.rule_if_sent.array_min_one'],
    array_min: ['lab.schema.rule.array_min', 'lab.schema.rule_if_sent.array_min'],
    object: ['lab.schema.rule.object', 'lab.schema.rule_if_sent.object']
  }

  // A regra de um campo: o nome da frase e os valores dela. Um enum de string mostra os valores com aspas, e
  // a frase avisa das aspas quando um valor parece outro tipo ("true" e "false").
  function schemaRule (prop) {
    if (Array.isArray(prop.enum) && prop.enum.length) {
      const shown = prop.enum.map(value => prop.type === 'string' ? JSON.stringify(String(value)) : String(value))
      if (shown.length === 1) return { rule: 'enum_one', values: { value: el('code', { text: shown[0] }) } }
      const quoted = prop.type === 'string' && prop.enum.some(value => {
        try {
          return typeof JSON.parse(value) !== 'string'
        } catch (e) {
          return false
        }
      })
      // Os valores separados por vírgula, sem conjunção (a frase termina na lista).
      const list = el('span', null, shown.map((value, index) => [index ? ', ' : null, el('code', { text: value })]))
      return { rule: quoted ? 'enum_quoted' : 'enum', values: { values: list } }
    }
    if (prop.type === 'string') return { rule: prop.format === 'email' ? 'email' : prop.minLength >= 1 ? 'not_blank' : 'any', values: {} }
    if (prop.type === 'integer' || prop.type === 'number') {
      if (prop.minimum === undefined) return { rule: prop.type, values: {} }
      return { rule: prop.type === 'integer' ? 'integer_min' : 'number_min', values: { min: prop.minimum } }
    }
    if (prop.type === 'boolean') return { rule: 'boolean', values: {} }
    if (prop.type === 'array') {
      const rule = prop.minItems === 1 ? 'array_min_one' : prop.minItems > 1 ? 'array_min' : 'array'
      return { rule, values: { min: prop.minItems }, itemsBelow: !!(prop.items && prop.items.properties) }
    }
    if (prop.type === 'object') return { rule: 'object', values: {} }
    return null
  }

  function ruleCell (row) {
    const rule = schemaRule(row.prop)
    if (!rule) return el('td')
    const sentence = parts(SCHEMA_RULES[rule.rule][row.required ? 0 : 1], rule.values)
    // Um array de objetos avisa que os campos de cada item vêm logo abaixo, numa frase própria.
    return el('td', null, sentence, rule.itemsBelow ? ' ' + t('lab.schema.rule.items_below') : null)
  }

  // A introdução, a tabela Campo e Regra (um campo por linha; um array de objetos ganha a linha de grupo e,
  // abaixo, os campos de cada item) e, quando o documento proíbe campos a mais, a frase do fim.
  function schemaParts (schema) {
    const table = el('table', { class: 'schema-table' },
      el('colgroup', null, el('col', { class: 'schema-col-field' }), el('col')),
      el('thead', null, el('tr', null, el('th', { scope: 'col', text: t('lab.schema.col_field') }), el('th', { scope: 'col', text: t('lab.schema.col_rule') }))))
    let body = null
    core.schemaRows(schema).forEach(row => {
      if (row.groupLabel) {
        body = el('tbody', { class: 'schema-items' }, el('tr', { class: 'schema-group' }, el('th', { scope: 'rowgroup', colspan: '2' }, parts('lab.schema.group', { name: el('code', { text: row.groupLabel }) }))))
        table.append(body)
        return
      }
      if (!body || (!row.group && body.classList.contains('schema-items'))) {
        body = el('tbody')
        table.append(body)
      }
      // Um campo de grupo tem um nome só para o leitor de tela ("quantidade, em cada item de produtos"); o
      // nome visível fica fora da árvore de acessibilidade, para não ser lido duas vezes.
      const name = row.group
        ? [el('span', { class: 'sr-only', text: fillText('lab.schema.field_in_group', { field: row.name, group: row.group }) }), el('code', { 'aria-hidden': 'true', text: row.name })]
        : el('code', { text: row.name })
      body.append(el('tr', { 'data-field': row.path },
        el('th', { scope: 'row', tabindex: '-1' },
          el('span', { class: 'param-label' },
            name,
            ' ',
            row.required ? el('span', { class: 'req-mark', text: t('lab.params.required') }) : el('span', { class: 'opt-mark', text: t('lab.schema.optional') })),
          el('span', { class: 'param-type', text: row.type })),
        ruleCell(row)))
    })
    return [
      el('p', { class: 'schema-intro', text: fillText('lab.schema.intro', { stage: t('ui.flow.stage_label.schema') }) }),
      table,
      schema.additionalProperties === false ? el('p', { class: 'schema-unknown', id: 'schema-unknown', tabindex: '-1', text: t('lab.schema.unknown') }) : null
    ]
  }

  // O alvo do link do fluxo: o campo que o corpo da resposta aponta primeiro (produtos[0].quantidade vira
  // produtos.quantidade), ou a frase do fim quando a mensagem diz que o campo não é permitido. As mensagens
  // da API são sempre em português.
  function schemaTarget (record) {
    if (!record || record.error) return null
    let body = null
    try {
      body = JSON.parse(record.bodyText)
    } catch (e) {
      return null
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null
    const key = Object.keys(body)[0]
    if (!key) return null
    const match = /^([^.[\]]+)(?:\[\d+\])?(?:\.([^.[\]]+))?/.exec(key)
    if (!match) return null
    const path = match[1] + (match[2] ? '.' + match[2] : '')
    const row = Array.from(document.querySelectorAll('#sec-body-body tr[data-field]')).find(item => item.getAttribute('data-field') === path)
    if (row) return row
    if (typeof body[key] === 'string' && /não é permitido$/.test(body[key].trim())) return $('schema-unknown')
    return null
  }

  // Do fluxo para o schema: escolhe a aba Schema, leva o campo à vista e o foco para ele, e pinta a linha por
  // 2 s (com menos movimento, a rolagem é na hora; a cor fica, porque não é movimento).
  function goToSchema (record) {
    const target = schemaTarget(record)
    if (!target) return
    selectBodyTab('schema', false)
    target.scrollIntoView({ block: 'center', behavior: state.reduced ? 'auto' : 'smooth' })
    const focusNode = target.tagName === 'TR' ? target.querySelector('th') : target
    focusNode.focus({ preventScroll: true })
    if (target.tagName !== 'TR') return
    target.classList.add('schema-hit')
    clearTimeout(target.hitTimer)
    target.hitTimer = setTimeout(() => target.classList.remove('schema-hit'), 2000)
  }

  // A cada mudança no rascunho: a URL da barra, o comando de Requisição a enviar, o campo Authorization e a caixa
  // de Preencher.
  function refreshPreview () {
    paintTokenMark()
    const route = state.selected
    if (!route || !$('curl-pre')) return
    const request = currentRequest(route)
    paintResolvedUrl(request)
    renderCurl($('curl-pre'), request)
    // A mensagem da cópia vale para o comando copiado: some quando o comando muda.
    if (state.copiedDraft !== null && state.copiedDraft !== core.curlOf(request)) {
      state.copiedDraft = null
      $('copy-msg').className = 'copy-msg'
      $('copy-msg').replaceChildren()
    }
    if (route.needsToken) paintAuth(route)
    // Cada mudança no rascunho decide de novo se o envio mostrado em Resultado é diferente dele.
    paintFill()
    paintSentDiff()
  }

  // A barra mostra a URL já resolvida: os parâmetros de path preenchidos e a query no fim. Um parâmetro de
  // path vazio fica {nome}, como no comando.
  function paintResolvedUrl (request) {
    const text = $('req-route-text')
    const path = $('req-path')
    if (!text || !path) return
    text.textContent = request.url.slice(baseUrl.length)
    path.title = request.url
  }

  function tokenValues () {
    return {
      time: state.tokenAt ? clock(state.tokenAt) : '',
      expires: state.tokenExp ? clock(state.tokenExp) : ''
    }
  }

  // A linha de ajuda diz, em frases inteiras, de onde veio o valor do campo e até quando ele vale.
  function paintAuth (route) {
    const draft = draftFor(route)
    const edited = typeof draft.auth === 'string'
    const input = $('auth-input')
    if (!edited && input.value !== authValue(route)) input.value = authValue(route)
    const sends = !!core.trimHeaderValue(authValue(route))
    const caption = $('auth-caption')
    caption.textContent = ''
    if (!sends) caption.append(el('strong', { class: 'auth-absent', text: t('lab.auth.absent') }), ' ')
    const captionState = core.tokenCaptionState({ hasToken: !!state.token, expiresAt: state.tokenExp, now: Date.now(), edited, filledFrom: draft.authFrom })
    // Preenchido por um envio, {time} é a hora desse envio; nos outros estados, a do token.
    const values = captionState === 'filled' ? { time: clock(draft.authFrom) } : tokenValues()
    const text = fillText(AUTH_CAPTION[captionState], values)
    if (captionState === 'expired') caption.append(el('span', { class: 'auth-expired', text }), ' ', t('lab.auth.how_to_get'))
    else caption.append(text)
    $('auth-undo').hidden = !edited
    $('auth-discard').hidden = edited || !state.token
  }

  // Durante o envio Executar fica com aria-disabled (não disabled), então o foco não cai no body; execute e
  // Ctrl + Enter não enviam de novo enquanto um envio está em andamento. O segmento do modo acompanha:
  // indisponível, e o menu não abre.
  function setBusy (busy) {
    const run = $('run')
    if (!run) return
    if (busy) run.setAttribute('aria-disabled', 'true')
    else run.removeAttribute('aria-disabled')
    run.setAttribute('aria-busy', busy ? 'true' : 'false')
    run.textContent = ''
    // O círculo gira na fase dos outros (syncSpin) e para aos 5 s, como o da Resposta; refeito depois disso
    // (troca de rota), ele já nasce parado.
    if (busy) run.append(syncSpin(el('span', { class: 'spin' + (busyStill() ? ' is-still' : ''), 'aria-hidden': 'true' })), ' ', t('lab.actions.executing'))
    else run.append(t('lab.actions.execute'))
    const mode = $('run-mode')
    if (mode) {
      if (busy) {
        closeRunMenu(false)
        mode.setAttribute('aria-disabled', 'true')
      } else mode.removeAttribute('aria-disabled')
    }
    paintRunMode()
  }

  function busyStill () {
    return state.busy && state.busyAt !== null && performance.now() - state.busyAt >= COLD_AFTER * 1000
  }

  // Aos 5 s do clique, mesmo sem a espera à vista (outra rota escolhida), o círculo do botão para; com a
  // espera à vista, tickWaiting para os dois no mesmo quadro.
  function stillBusySpin () {
    const spin = document.querySelector('#run .spin')
    if (spin) spin.classList.toggle('is-still', busyStill())
  }

  /* ---------- Comando curl e cópia ---------- */

  // A requisição de um envio, montada do registro (nunca do rascunho), para Foi enviado.
  function recordRequest (record) {
    return { method: record.method, url: record.url, headers: record.requestHeaders, body: record.bodySent }
  }

  // Uma linha por parte do comando (span em bloco): todas menos a primeira começam com dois espaços, todas
  // menos a última terminam em " \". O innerText do bloco é exatamente core.curlOf, também numa seleção
  // feita à mão; o botão copia sempre a string de core.curlOf, nunca o texto da tela.
  // withTimes acrescenta a linha da opção -w, a mesma que vai junto ao copiar com os tempos do curl.
  function renderCurl (pre, request, withTimes) {
    const list = core.curlParts(request)
    const lines = list.map((part, index) => {
      const line = el('span', { class: 'curl-part', 'data-kind': part.kind })
      if (index > 0) line.append('  ')
      curlPartContent(line, part)
      if (index < list.length - 1 || withTimes) keepTailTogether(line)
      return line
    })
    if (withTimes) lines.push(el('span', { class: 'curl-part', 'data-kind': 'times' }, '  ' + core.CURL_TIMES))
    pre.replaceChildren(...lines)
  }

  // O último caractere da parte e o " \" do fim ficam numa peça que não quebra, então a barra nunca vai
  // sozinha para a linha de baixo, nem quando a parte não cabe e quebra em qualquer ponto.
  function keepTailTogether (line) {
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT)
    let last = null
    while (walker.nextNode()) if (walker.currentNode.data) last = walker.currentNode
    const cont = el('span', { class: 'curl-cont', text: ' \\' })
    if (!last) {
      line.append(cont)
      return
    }
    const end = last.data.length > 1 ? last.splitText(last.data.length - 1) : last
    const tail = el('span', { class: 'curl-tail' })
    end.replaceWith(tail)
    tail.append(end, cont)
  }

  // A URL quebra nas divisas do caminho: depois de cada / (fora do // do esquema), de ? e de &. O <wbr> não
  // entra no innerText nem no texto copiado. Um pedaço que sozinho não cabe na linha ainda quebra em qualquer
  // ponto (overflow-wrap do bloco), em vez de sair pela borda.
  function urlWithBreaks (quoted) {
    const span = el('span', { class: 'curl-url' })
    const scheme = quoted.indexOf('://')
    let start = 0
    for (let index = scheme === -1 ? 0 : scheme + 3; index < quoted.length - 1; index++) {
      if ('/?&'.indexOf(quoted.charAt(index)) === -1) continue
      span.append(quoted.slice(start, index + 1), el('wbr'))
      start = index + 1
    }
    span.append(quoted.slice(start))
    return span
  }

  function curlPartContent (line, part) {
    const flag = text => el('span', { class: 'curl-flag', text })
    if (part.kind === 'start') {
      line.append('curl ', flag('-X'), ' ', el('span', { class: 'curl-method', text: part.method }), ' ', urlWithBreaks(core.shellQuote(part.url)))
      return
    }
    if (part.kind === 'header') {
      const quoted = core.shellQuote(part.name + ': ' + part.value)
      line.append(flag('-H'), ' ')
      if (quoted.slice(1, 1 + part.name.length) === part.name) line.append("'", el('span', { class: 'curl-hname', text: part.name }), quoted.slice(1 + part.name.length))
      else line.append(quoted)
      return
    }
    line.append(flag(part.flag), ' ')
    // O corpo ganha as cores do JSON só quando é JSON e não tem aspas simples (que o shell escaparia).
    let json = false
    if (part.body.indexOf("'") === -1) {
      try {
        JSON.parse(part.body)
        json = true
      } catch (e) {}
    }
    if (!json) {
      line.append(core.shellQuote(part.body))
      return
    }
    // highlightJson escapa cada pedaço antes de envolvê-lo.
    const holder = el('span')
    holder.innerHTML = core.highlightJson(part.body)
    line.append("'", ...holder.childNodes, "'")
  }

  // A tecla de comando do sistema da pessoa, no atalho e nas mensagens de cópia.
  function ctrlName () {
    return IS_MAC ? 'Cmd' : 'Ctrl'
  }

  function selectContents (node) {
    try {
      const range = document.createRange()
      range.selectNodeContents(node)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
    } catch (e) {}
  }

  // O rótulo vira "Copiado" por 2 s; o nome acessível (aria-label) não muda.
  function flashCopied (button) {
    const label = button.getAttribute('data-label') || button.textContent
    button.setAttribute('data-label', label)
    button.textContent = t('lab.copy.done_label')
    clearTimeout(button.copyTimer)
    button.copyTimer = setTimeout(() => { button.textContent = label }, 2000)
  }

  function copyText (text, done) {
    const fallback = () => {
      const active = document.activeElement
      const area = el('textarea', { class: 'copy-buffer', 'aria-hidden': 'true', tabindex: '-1' })
      area.value = text
      document.body.append(area)
      area.select()
      let ok = false
      try {
        ok = document.execCommand('copy')
      } catch (e) {}
      area.remove()
      if (active && active !== document.body && active.focus) active.focus({ preventScroll: true })
      done(ok)
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => done(true), fallback)
    else fallback()
  }

  // Copia um comando curl. Sem área de transferência, o comando inteiro fica selecionado no bloco e a
  // mensagem diz como copiar com o teclado.
  function copyCommand (button, command, pre, message, onShown, doneKey) {
    copyText(command, ok => {
      if (ok) {
        const done = t(doneKey || 'lab.copy.command_done')
        flashCopied(button)
        message.className = 'copy-msg'
        message.replaceChildren(done)
        announce(done)
      } else {
        selectContents(pre)
        message.className = 'copy-msg fail'
        message.replaceChildren(...parts('lab.copy.command_failed', { ctrl: el('kbd', { text: ctrlName() }) }))
        announce(fillText('lab.copy.command_failed', { ctrl: ctrlName() }))
      }
      if (onShown) onShown()
    })
  }

  function copyDraft () {
    const command = core.curlOf(currentRequest(state.selected))
    copyCommand($('copy-draft'), command, $('curl-pre'), $('copy-msg'), () => { state.copiedDraft = command })
  }

  /* ---------- Envio ---------- */

  function send (route, request, kind) {
    const record = {
      id: ++state.seq,
      kind,
      at: new Date(),
      method: request.method,
      path: route.path,
      // Rota com cadeado: só nelas a entrada do Histórico diz com ou sem Authorization (K8).
      protected: !!route.needsToken,
      url: request.url,
      status: null,
      statusText: '',
      ms: 0,
      // Os headers enviados ficam no registro: quem revê pelo histórico vê qual Authorization foi.
      requestHeaders: request.headers.map(header => [header[0], header[1]]),
      authSent: request.headers.some(header => header[0] === state.authHeader),
      // O comando inteiro (método, URL, headers e corpo): compará-lo com o do rascunho diz se a
      // requisição mudou desde este envio.
      curl: core.curlOf(request),
      // O corpo que foi de fato no envio (undefined quando a rota não tem corpo), para Foi enviado.
      bodySent: request.body,
      // O rascunho como estava no envio, para "Preencher a requisição com este envio".
      sent: null,
      headers: [],
      stagesHeader: null,
      // As fases da Resource Timing (core.resourcePhases); null sem a entrada do navegador.
      timing: null,
      bodyText: '',
      error: null
    }
    const headers = {}
    request.headers.forEach(header => { headers[header[0]] = header[1] })
    const url = absoluteUrl(request.url)
    // O tempo total é o da Resource Timing, a mesma fonte do DevTools: o relógio da página, de antes do fetch
    // até depois de res.text(), somava o trabalho da própria página e dava alguns ms a mais. Limpar antes
    // deixa só a entrada deste envio e não deixa o buffer do navegador encher. O relógio fica para quando
    // não há entrada.
    clearResourceTimings()
    const start = performance.now()
    // O registro sai antes da resposta, para a espera real mostrar o envio e Foi enviado.
    const done = fetch(request.url, { method: request.method, headers, body: request.body, cache: 'no-store' }).then(res => {
      record.status = res.status
      record.statusText = core.statusText(res.status) || res.statusText
      res.headers.forEach((value, name) => record.headers.push([name, value]))
      record.stagesHeader = res.headers.get(STAGES_HEADER)
      return res.text()
    }).then(body => {
      const clock = performance.now() - start
      const entry = core.resourceEntry(resourceEntries(url), start)
      record.ms = entry ? entry.duration : clock
      record.timing = core.resourcePhases(entry)
      record.bodyText = body
      return record
    }).catch(error => {
      record.ms = performance.now() - start
      record.error = (error && error.message) || String(error)
      return record
    })
    return { record, done }
  }

  // A URL como o navegador a registra na Resource Timing (o nome da entrada).
  function absoluteUrl (url) {
    try {
      return new URL(url, window.location.href).href
    } catch (e) {
      return url
    }
  }

  function clearResourceTimings () {
    try {
      performance.clearResourceTimings()
    } catch (e) {}
  }

  function resourceEntries (url) {
    try {
      return performance.getEntriesByName(url, 'resource')
    } catch (e) {
      return []
    }
  }

  function execute () {
    if (state.busy || !state.selected) return
    // Ctrl + Enter com o menu do modo aberto envia no modo marcado; o menu fecha antes (o foco vai a Executar).
    closeRunMenu(false)
    const route = state.selected
    const draft = draftFor(route)
    const missing = route.params.find(param => param.in === 'path' && !String(draft.params['path:' + param.name] || '').trim())
    if (missing) {
      const input = $('param-path-' + missing.name)
      input.setAttribute('aria-invalid', 'true')
      input.focus()
      announce(fillText('lab.params.missing', { name: missing.name }))
      return
    }
    if (route.needsToken && !core.isSendableHeaderValue(authValue(route))) {
      const input = $('auth-input')
      input.setAttribute('aria-invalid', 'true')
      $('auth-error').textContent = t('lab.auth.invalid')
      input.focus()
      announce(t('lab.auth.invalid'))
      return
    }
    // Executar fica com aria-disabled durante o envio e mantém o foco; se uma troca de rota o refizer, o
    // foco volta a ele, sem rolar a página.
    const hadFocus = document.activeElement === $('run')
    const clickAt = performance.now()
    state.busy = true
    state.busyAt = clickAt
    setBusy(true)
    clearTimeout(state.busyTimer)
    state.busyTimer = setTimeout(() => {
      tickWaiting()
      stillBusySpin()
    }, COLD_AFTER * 1000 + 20)
    const sent = { params: Object.assign({}, draft.params), body: draft.body, auth: route.needsToken ? authValue(route) : '' }
    const outgoing = send(route, currentRequest(route), 'route')
    outgoing.record.sent = sent
    // Espera real: passado 1 s sem resposta, e com a mesma rota escolhida, o Resultado passa a mostrar este
    // envio (cabeçalho, Foi enviado e a espera). Antes de 1 s, nada muda.
    let arrived = false
    const waitTimer = setTimeout(() => {
      if (arrived || !state.selected || state.selected.key !== core.recordKey(outgoing.record)) return
      startWaiting(outgoing.record, clickAt)
    }, WAIT_DELAY)
    outgoing.done.then(record => {
      arrived = true
      clearTimeout(waitTimer)
      // O envio da espera nunca ficou pendente: revealPending (abaixo) só mostra um envio anterior.
      stopWaiting()
      state.busy = false
      state.busyAt = null
      clearTimeout(state.busyTimer)
      setBusy(false)
      // Um envio anterior que ainda esperava o veredito mostra o status agora; o novo, se aparece em
      // Resultado, fica pendente até o fluxo dele chegar ao veredito (na hora, sem a câmera lenta).
      revealPending()
      const showsHere = !!state.selected && state.selected.key === core.recordKey(record)
      if (showsHere) state.pendingId = record.id
      // Um envio novo encerra a oferta de desfazer a limpeza do Histórico.
      state.undo = null
      addHistory(record)
      // Se a pessoa trocou de rota durante o envio, o resultado não aparece como se fosse da rota nova.
      if (showsHere) {
        state.pickedId = null
        show(record, 'live')
      } else {
        announceResult(fillText('lab.announce.other_route', { route: record.method + ' ' + record.path }))
      }
      if (hadFocus && $('run') && document.activeElement === document.body) $('run').focus({ preventScroll: true })
    })
  }

  /* ---------- Token da página ---------- */

  // O único jeito de a página ter um token é a resposta real de POST /login: um botão logo abaixo do corpo
  // o passa para o campo Authorization de todas as rotas com cadeado que não foram editadas.

  function editedRoutes () {
    return state.routes.filter(route => route.needsToken && state.drafts[route.key] && typeof state.drafts[route.key].auth === 'string').length
  }

  function tokenOffer (record) {
    const token = core.loginToken(record)
    if (!token) return null
    state.offer = { box: el('div', { class: 'token-offer', id: 'token-offer' }), token, record }
    paintOffer(false)
    return state.offer.box
  }

  // A oferta segue core.offerState cada vez que é pintada: o botão, ou a frase de que o token já é o da
  // página. Depois do clique, a frase visível é a de "já preenche" e o anúncio é o de "Pronto".
  function paintOffer (justUsed) {
    const offer = state.offer
    if (!offer) return null
    if (core.offerState({ record: offer.record, pageToken: state.token }) === 'in_use') {
      const kept = editedRoutes() ? t('lab.token.edited_kept') : ''
      const visible = [t('lab.token.in_use'), kept].filter(Boolean).join(' ')
      const done = el('p', { class: 'token-done', id: 'token-done', tabindex: '-1' }, el('span', { 'aria-hidden': 'true', text: '✓ ' }), visible)
      offer.box.replaceChildren(done)
      return { node: done, text: [t(justUsed ? 'lab.token.used' : 'lab.token.in_use'), kept].filter(Boolean).join(' ') }
    }
    offer.box.replaceChildren(el('button', { type: 'button', class: 'btn btn-token', id: 'use-token', text: t('lab.token.use'), onclick: useToken }))
    return null
  }

  function useToken () {
    const offer = state.offer
    state.token = offer.token
    state.tokenAt = offer.record.at
    state.tokenExp = core.decodeJwtExp(offer.token)
    refreshPreview()
    const done = paintOffer(true)
    // O botão some: o foco vai para a frase que o substitui, e ela também é anunciada.
    done.node.focus()
    announce(done.text)
  }

  function discardToken () {
    state.token = null
    state.tokenAt = null
    state.tokenExp = null
    refreshPreview()
    paintOffer(false)
    if ($('auth-input')) $('auth-input').focus()
    announce(t('lab.token.discarded'))
  }

  /* ---------- Histórico na sessão do navegador ---------- */

  // sessionStorage é por aba: sobrevive a recarregar e à troca de idioma (que recarrega a página) e é
  // apagado quando a aba fecha. Fica o que a página já guarda de cada envio, o envio mostrado e os não
  // vistos. Nunca a aba da esquerda (a página sempre abre em Rotas), o envio pendente (ele volta já com o
  // veredito), um envio que ainda espera o servidor, a cópia de Desfazer, os rascunhos e o token da página.
  // Toda leitura e gravação fica num try/catch: sem armazenamento, o Histórico vive só na memória da página.

  function isQuotaError (error) {
    return !!error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22 || error.code === 1014)
  }

  // Gravado só quando a lista muda. Sem espaço, os envios mais antigos saem (fica a metade mais recente) e a
  // gravação tenta uma vez mais; depois desiste em silêncio. Só a cópia guardada perde envios.
  function saveHistory () {
    let list = state.history.map(record => core.storedRecord(record, STORED_BODY_CHARS))
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify({ v: 1, history: list }))
        return
      } catch (error) {
        if (!isQuotaError(error)) return
        list = list.slice(0, Math.ceil(list.length / 2))
      }
    }
  }

  // O envio mostrado e os não vistos mudam mais vezes que a lista: ficam numa chave pequena.
  // Enquanto as rotas não chegam, o envio mostrado continua sendo o que veio da sessão (uma recarga nesse
  // meio tempo não o perde).
  function saveView () {
    const shownId = state.shownId !== null ? state.shownId : state.restoreShownId
    try {
      window.sessionStorage.setItem(VIEW_KEY, JSON.stringify({ v: 1, shownId, unseen: state.unseen }))
    } catch (error) {}
  }

  function discardStored (key) {
    try {
      window.sessionStorage.removeItem(key)
    } catch (error) {}
  }

  function readStored (key) {
    try {
      return window.sessionStorage.getItem(key)
    } catch (error) {
      return null
    }
  }

  // Na carga da página, antes da primeira pintura das marcas das Rotas, do Histórico, da contagem e das
  // abas. Um valor corrompido é descartado inteiro (core.readStoredHistory).
  function restoreSession () {
    const raw = readStored(HISTORY_KEY)
    if (raw !== null) {
      const list = core.readStoredHistory(raw, MAX_HISTORY)
      if (list) {
        state.history = list
        state.seq = list.reduce((max, item) => Math.max(max, item.id), 0)
      } else {
        discardStored(HISTORY_KEY)
      }
    }
    const rawView = readStored(VIEW_KEY)
    if (rawView === null) return
    let view = null
    try {
      view = JSON.parse(rawView)
    } catch (error) {}
    if (!view || view.v !== 1) {
      discardStored(VIEW_KEY)
      return
    }
    if (state.history.some(item => item.id === view.shownId)) state.restoreShownId = view.shownId
    if (Number.isInteger(view.unseen) && view.unseen > 0) state.unseen = Math.min(view.unseen, state.history.length)
  }

  // Depois de carregar as rotas: o envio que estava à vista volta ao Resultado, se é da rota escolhida (a do
  // endereço, que a recarga mantém); senão, o de sempre (o envio mais recente da rota, ou o vazio). Um envio
  // anterior ao último volta como escolhido no Histórico, com a oferta de Preencher.
  function showAfterLoad () {
    const id = state.restoreShownId
    state.restoreShownId = null
    const record = id === null ? null : state.history.find(item => item.id === id)
    if (!record || !state.selected || core.recordKey(record) !== state.selected.key) {
      showForSelected()
      return
    }
    state.pickedId = core.isOlderThanLatest(record, state.history) ? record.id : null
    show(record, 'history', true)
  }

  /* ---------- Histórico ---------- */

  // O modelo vem de core.buildFlowModel; só os textos de como conseguir um token mudam (HOW_KEYS).
  function flowModelOf (record) {
    const model = core.buildFlowModel(core.parseStages(record.stagesHeader), record.status, texts)
    if (model && HOW_KEYS[model.howKey]) model.howKey = HOW_KEYS[model.howKey]
    return model
  }

  function stageName (stage) {
    return stage.labelKey ? t(stage.labelKey) : stage.name
  }

  function addHistory (record) {
    const wasFull = state.history.length >= MAX_HISTORY
    state.history.unshift(record)
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY
    const tabbed = currentLayout() === 'abas'
    const closed = tabbed && state.sideTab !== 'historico'
    // Os novos nunca passam do total: a lista guarda só os últimos MAX_HISTORY envios.
    if (closed) state.unseen = Math.min(state.unseen + 1, state.history.length)
    insertEntry(record)
    paintRouteMarks()
    // A contagem da aba gira na hora em que o envio entra na lista, com a aba fechada ou aberta: ela só diz
    // que houve um envio, não como ele terminou, então não estraga o fluxo. Com a aba fechada fica roxa até
    // a aba ser aberta. No limite o número não muda: a roda das unidades tenta subir e trava.
    paintHistBadge(tabbed)
    if (tabbed && wasFull) rodaJam($('hist-badge-num'))
    // Com a aba Histórico fechada, a página não troca de aba sozinha: a contagem muda na aba e vai junto
    // do próximo anúncio (o do resultado), para um anúncio não apagar o outro.
    const count = state.history.length
    state.countNote = closed
      ? fillText(count === 1 ? 'lab.history.count_note_one' : 'lab.history.count_note', { count })
      : ''
    saveHistory()
    saveView()
  }

  // A contagem na aba Histórico: o total de envios, numa caixa que fica roxa cheia enquanto houver envios
  // que chegaram com a aba fechada. roll: um envio acabou de entrar, e os dígitos que mudam giram.
  function paintHistBadge (roll) {
    const badge = $('side-count-historico')
    const count = state.history.length
    badge.hidden = !count
    rodaSet($('hist-badge-num'), count ? String(count) : '', roll)
    const fresh = state.unseen > 0
    badge.classList.toggle('is-new', fresh)
    $('hist-badge-new').textContent = fresh ? ' ' + fillText(state.unseen === 1 ? 'lab.history.new_one' : 'lab.history.new', { count: state.unseen }) : ''
  }

  // A contagem como roda: cada dígito é uma fita de números que sobe dentro de uma janela da altura de uma
  // linha (1.25em, o line-height da caixa), e só gira o dígito que muda (de 9 para 10, a dezena entra
  // girando do vazio). A fita fica escondida do leitor de tela; o número real fica no .sr-only, o primeiro
  // filho de num, e o nome da aba continua "Histórico 10 (9 novos)". Com menos movimento, o número só troca.
  const RODA_MS = 400
  function rodaSet (num, text, roll) {
    num.firstChild.textContent = text
    const row = num.lastChild
    while (row.children.length < text.length) row.prepend(el('span', { class: 'odo-d' }, el('span', { class: 'odo-s' })))
    while (row.children.length > text.length) row.firstChild.remove()
    Array.from(row.children).forEach((slot, index) => rodaTurn(slot.firstChild, text[index], roll))
  }

  // A fita tem uma linha por dígito e sobe da linha em que está até a última. Com envios seguidos, a fita
  // que ainda gira continua do ponto em que está, com o dígito novo no fim: rola mais, sem salto.
  function rodaTurn (strip, digit, roll) {
    const lines = strip.textContent.split('\n')
    if (lines[lines.length - 1] === digit) return
    let at = 0
    const running = strip.getAnimations ? strip.getAnimations()[0] : null
    if (running) {
      const shift = getComputedStyle(strip).transform
      at = shift === 'none' ? 0 : -new DOMMatrixReadOnly(shift).m42 / (parseFloat(getComputedStyle(strip).fontSize) * 1.25)
      running.cancel()
    }
    if (!roll || prefersReducedMotion() || !strip.animate) {
      strip.textContent = digit
      return
    }
    const passed = Math.max(0, Math.min(Math.floor(at + 0.01), lines.length - 1))
    const kept = lines.slice(passed).concat(digit)
    strip.textContent = kept.join('\n')
    const turn = strip.animate([
      { transform: 'translateY(' + (-(at - passed) * 1.25) + 'em)' },
      { transform: 'translateY(' + (-(kept.length - 1) * 1.25) + 'em)' }
    ], { duration: RODA_MS, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' })
    turn.onfinish = () => {
      strip.textContent = digit
      turn.cancel()
    }
  }

  // O tranco no limite, em 460 ms (1.25em é uma linha da fita): a unidade sobe acelerando até um batente a
  // 40% do caminho até o próximo dígito (130 ms), bate e volta um pouco (150 ms), encosta de novo (170 ms),
  // fica travada (até 270 ms) e volta com mola, passando um pouco do lugar (395 ms), até parar (460 ms).
  const JAM_MS = 460
  const RODA_JAM = [
    { offset: 0, transform: 'translateY(0)', easing: 'cubic-bezier(0.5, 0, 1, 1)' },
    { offset: 0.283, transform: 'translateY(-0.5em)', easing: 'ease-out' },
    { offset: 0.326, transform: 'translateY(-0.4em)', easing: 'ease-in' },
    { offset: 0.37, transform: 'translateY(-0.5em)' },
    { offset: 0.587, transform: 'translateY(-0.5em)', easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
    { offset: 0.859, transform: 'translateY(0.1em)', easing: 'ease-in-out' },
    { offset: 1, transform: 'translateY(0)' }
  ]

  // No limite a contagem não muda: a unidade tenta subir para o próximo dígito (o ::after da fita) e trava,
  // e a dezena fica parada. Um tranco por vez: até o tranco terminar (animation.finished), ou enquanto a
  // fita ainda gira, um envio novo não recomeça o tranco nem entra na fila.
  const jamming = new WeakSet()
  function rodaJam (num) {
    const slot = num.lastChild.lastElementChild
    const strip = slot && slot.firstChild
    if (!strip || !strip.animate || jamming.has(strip) || strip.getAnimations().length || prefersReducedMotion()) return
    jamming.add(strip)
    strip.dataset.next = String((Number(strip.textContent) + 1) % 10)
    const jam = strip.animate(RODA_JAM, { duration: JAM_MS })
    const done = () => {
      jamming.delete(strip)
      delete strip.dataset.next
    }
    jam.finished.then(done, done)
  }

  // A entrada nova ganha um contorno roxo que se apaga. Só cor e posição.
  // A contagem no limite tenta subir e bate no teto: um tranco curto para os lados.
  const COUNT_BUMP = [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }]
  const ENTRY_ARRIVE = [{ boxShadow: 'inset 0 0 0 2px var(--accent)' }, { boxShadow: 'inset 0 0 0 2px transparent' }]

  // Os dois sinais são animações de script (Web Animations), que tocam uma vez só. Uma animação de CSS
  // recomeça do início sempre que o elemento volta a aparecer depois de um display: none (o painel da aba
  // fechada, a lista de abas fora do layout com abas) e repetiria o sinal sem envio novo. Esta segue o
  // relógio mesmo escondida e, se já acabou, não toca de novo. Tocar outra vez cancela a anterior.
  const playing = new WeakMap()
  function playOnce (node, keyframes, options) {
    if (!node.animate || prefersReducedMotion()) return null
    const previous = playing.get(node)
    if (previous) previous.cancel()
    const animation = node.animate(keyframes, options)
    playing.set(node, animation)
    return animation
  }

  // Os sinais na lista (o contorno do veredito, o espaço que abre para a entrada nova) só tocam com o
  // Histórico à vista: na quarta coluna, ou na aba aberta.
  function historyOnScreen () {
    const layout = currentLayout()
    return layout === 'quatro' || (layout === 'abas' && state.sideTab === 'historico')
  }

  // O fluxo do envio pendente chegou ao veredito (ou deu lugar a outro envio): o status aparece em todos os
  // lugares de uma vez. Com o Histórico à vista, a entrada ganha o contorno que some em 2 s. A entrada muda
  // no lugar, sem refazer a lista, para o foco ficar onde está.
  function revealPending () {
    const id = state.pendingId
    if (id === null) return
    state.pendingId = null
    const record = state.history.find(item => item.id === id)
    if (!record) return
    const entry = document.querySelector('#history-body .entry[data-id="' + id + '"]')
    if (entry) paintEntry(entry, record)
    paintRouteMarks()
    if (state.shownId === id) {
      renderShown(record, state.shownLive)
      renderResponse(record, state.shownLive)
    }
    if (historyOnScreen()) flashEntry(entry)
  }

  // O contorno do veredito só toca na entrada do topo, e para na hora quando outra entra acima dela: com
  // envios seguidos, ele não desce junto com a entrada nem se acumula em várias.
  let flashing = null
  function flashEntry (entry) {
    if (!entry || entry.parentNode !== $('history-body').firstElementChild) return
    flashing = entry
    playOnce(entry, ENTRY_ARRIVE, { duration: 2000, easing: 'ease-out' })
  }

  function stopFlash () {
    const animation = flashing && playing.get(flashing)
    if (animation) animation.cancel()
    flashing = null
  }

  // O lugar da entrada nova abre em altura e as de baixo descem junto; o conteúdo aparece no lugar, sem
  // viajar. Enquanto o lugar abre, o conteúdo fica cortado nele.
  function openEntry (item) {
    const height = item.getBoundingClientRect().height
    const grow = playOnce(item, [{ height: '0px', borderBottomColor: 'transparent' }, { height: height + 'px' }], { duration: 330, easing: 'cubic-bezier(0.2, 0, 0, 1)' })
    if (!grow) return
    item.style.overflow = 'hidden'
    const done = () => { item.style.overflow = '' }
    grow.onfinish = done
    grow.oncancel = done
    // Fora do playOnce: no modo normal o veredito chega na hora, e o contorno de flashEntry, tocado pelo
    // playOnce no mesmo botão, cancelaria o aparecer.
    item.firstChild.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 270, delay: 130, easing: 'ease-out', fill: 'backwards' })
  }

  // Um envio novo entra no topo sem refazer a lista: as entradas que já estavam ficam, com o foco, e a
  // mais antiga sai quando a lista passa de MAX_HISTORY. Com a lista vazia
  // (a frase de vazio à vista), ela é desenhada inteira. A contagem da aba fica para addHistory: pintada
  // aqui, ela já chegaria ao número novo e a roda não giraria.
  function insertEntry (record) {
    stopFlash()
    const list = $('history-body')
    if (!list.children.length) {
      renderHistory(true)
      return
    }
    const wasFull = list.children.length >= MAX_HISTORY
    paintTokenMark()
    const item = entryItem(record)
    list.prepend(item)
    while (list.children.length > MAX_HISTORY) list.lastElementChild.remove()
    paintHistoryFrame(true)
    if (historyOnScreen()) openEntry(item)
    // Ao chegar ao limite, o aviso é anunciado uma vez; no limite, cada envio novo faz a contagem bater no teto.
    if (!wasFull && list.children.length >= MAX_HISTORY) state.limitNote = fillText('lab.history.limit_reached', { max: MAX_HISTORY })
    if (list.children.length >= MAX_HISTORY && historyOnScreen()) playOnce($('hist-count'), COUNT_BUMP, { duration: 420, easing: 'ease-in-out' })
  }

  // O Histórico é um painel próprio: uma lista vertical de envios, o mais recente primeiro. Escolher um
  // mostra o fluxo e a resposta dele sem enviar de novo (e seleciona a rota dele). A ordem dos filhos é
  // a das colunas da tabela; nas entradas estreitas o CSS só reposiciona a hora.
  function renderHistory (keepBadge) {
    const list = $('history-body')
    list.textContent = ''
    state.tokenMark = tokenInUse()
    paintHistoryFrame(keepBadge)
    state.history.forEach(record => list.append(entryItem(record)))
  }

  // O que acompanha a lista: a contagem no título e na aba, Limpar, a frase de vazio e a de Histórico limpo.
  // keepBadge: um envio está entrando, e addHistory pinta a contagem da aba logo depois, girando.
  function paintHistoryFrame (keepBadge) {
    const count = state.history.length
    // No limite, a contagem diz que parou de crescer, e uma linha explica que o mais antigo sai.
    const full = count >= MAX_HISTORY
    $('hist-count').textContent = count ? fillText(full ? 'lab.history.count_full' : count === 1 ? 'lab.history.count_one' : 'lab.history.count', { count }) : ''
    $('hist-count').classList.toggle('at-limit', full)
    $('hist-limit').textContent = fillText('lab.history.limit_note', { max: MAX_HISTORY })
    $('hist-limit').hidden = !full
    if (!keepBadge) paintHistBadge(false)
    $('hist-clear').hidden = !count
    $('hist-scroll').hidden = !count
    $('hist-empty').hidden = !!count
    $('hist-empty').textContent = t('lab.history.empty')
    $('hist-cleared').hidden = !(state.undo && !count)
  }

  // data-token: o envio levou o header Authorization; data-token-in-use: é o login do selo, à vista.
  function entryItem (record) {
    const entry = el('button', {
      type: 'button',
      class: 'entry',
      'data-id': String(record.id),
      'data-key': core.recordKey(record),
      'data-token': record.authSent ? 'sent' : null,
      'aria-current': record.id === state.shownId ? 'true' : null,
      onclick: () => pickHistory(record)
    })
    paintEntry(entry, record)
    return el('li', null, entry)
  }

  function paintEntry (entry, record) {
    entry.replaceChildren(...entryParts(record))
    entry.toggleAttribute('data-token-in-use', record.id === state.tokenMark && record.id !== state.pendingId)
  }

  // Os filhos de uma entrada, na ordem das colunas da tabela: hora, método, path, cadeado, status, o que a
  // resposta trouxe e o tempo total. O cadeado diz que o envio levou o header Authorization, com token
  // válido ou não; sem o header ele não aparece (na tabela a coluna fica vazia). Ele e o path já se sabem
  // no envio, então aparecem também enquanto o fluxo não chega ao veredito; o status, a resposta e o tempo
  // ficam sob um esqueleto da mesma largura em todo envio, sobre um chip neutro (D29), e a frase de que o
  // resultado aparece no fim do fluxo fica para o leitor de tela.
  function entryParts (record) {
    const head = [
      el('time', { datetime: record.at.toISOString(), text: clock(record.at) }),
      methodBadge(record.method),
      el('span', { class: 'path', text: record.path }),
      record.authSent ? el('span', { class: 'tok' }, lockIcon(13), el('span', { class: 'sr-only', text: t('lab.history.sent_token') })) : el('span', { class: 'tok' })
    ]
    if (record.id === state.pendingId) {
      return head.concat(el('span', { class: 'chip-slot', 'aria-hidden': 'true' }, neutralChip()),
        el('span', { class: 'pending-note' }, el('span', { class: 'sr-only', text: t('lab.pending.short') })),
        el('span', { class: 'ms' }))
    }
    return head.concat(entryChip(record), entryResponse(record), el('span', { class: 'ms', text: formatMs(record.ms) }))
  }

  // O status na entrada: o ✓/✗ e o código à vista; a frase ("Bad Request") fica para o leitor de tela, que
  // ouve "400 Bad Request". Um envio sem resposta continua "falhou".
  function entryChip (record) {
    if (record.error) return statusChip(record)
    return el('span', { class: 'chip ' + statusClass(record.status) }, el('span', { 'aria-hidden': 'true', text: statusGlyph(record.status) }),
      el('span', { text: String(record.status) }), record.statusText ? [' ', el('span', { class: 'sr-only', text: record.statusText })] : null)
  }

  // Na resposta, só o que serve para a próxima requisição: o _id de um 201 (o recurso criado) ou, no login
  // cujo token a rota escolhida envia agora em Authorization, o selo "token em uso". As mensagens da
  // resposta ficam na Resposta.
  function entryResponse (record) {
    if (record.id === state.tokenMark) {
      return el('span', { class: 'resp' }, el('span', { class: 'tok-badge' }, svgIcon(11, KEY_SHAPES), t('lab.history.token_in_use')))
    }
    const id = createdId(record)
    return el('span', { class: 'resp' }, id ? [el('span', { class: 'lbl', text: '_id: ' }), el('span', { class: 'mono', text: id })] : null)
  }

  const KEY_SHAPES = [
    ['circle', { cx: '5', cy: '8', r: '2.75', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' }],
    ['path', { d: 'M7.75 8H14.5M12.5 8v2.5M14.5 8v2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' }]
  ]

  function createdId (record) {
    if (record.error || record.status !== 201) return null
    try {
      const body = JSON.parse(record.bodyText)
      return body && typeof body._id === 'string' ? body._id : null
    } catch (e) {
      return null
    }
  }

  // O login cujo token a rota escolhida envia agora em Authorization: o token da página ou o valor que a
  // pessoa digitou no campo dela, como a requisição o monta (core.authValueFor, sem os espaços das pontas).
  // O token da página não fica guardado na sessão: depois de recarregar, o selo segue o que a rota enviaria.
  function tokenInUse () {
    const route = state.selected
    const value = route ? core.authValueFor(draftFor(route), state.token) : (state.token || '')
    return core.tokenInUseId(state.history, core.trimHeaderValue(value))
  }

  // Repinta o selo quando o valor muda (rota, campo, token da página, envio, Limpar, Desfazer): só as duas
  // entradas que mudam, no lugar, para o foco ficar onde está.
  function paintTokenMark () {
    const id = tokenInUse()
    if (id === state.tokenMark) return
    const changed = [state.tokenMark, id]
    state.tokenMark = id
    changed.forEach(item => {
      const record = item === null ? null : state.history.find(entry => entry.id === item)
      const entry = record && document.querySelector('#history-body .entry[data-id="' + item + '"]')
      if (entry) paintEntry(entry, record)
    })
  }

  // A entrada mostrada fica à vista dentro do painel; só a lista rola, nunca a página.
  function keepEntryInView () {
    const entry = document.querySelector('.entry[aria-current="true"]')
    const box = $('hist-scroll')
    if (!entry || box.scrollHeight <= box.clientHeight) return
    const head = box.querySelector('.hist-cols')
    const headHeight = head && getComputedStyle(head).display !== 'none' ? head.offsetHeight : 0
    const boxRect = box.getBoundingClientRect()
    const rect = entry.getBoundingClientRect()
    if (rect.top < boxRect.top + headHeight) box.scrollTop -= boxRect.top + headHeight - rect.top
    else if (rect.bottom > boxRect.bottom) box.scrollTop += rect.bottom - boxRect.bottom
  }

  // A rota do envio passa a ser a escolhida, sem mexer no resultado (quem chama decide o que mostrar).
  function selectRouteOf (record) {
    const route = state.routes.find(item => item.key === core.recordKey(record))
    if (!route || route === state.selected) return
    state.selected = route
    writeHash(route)
    document.querySelectorAll('.route').forEach(button => {
      if (button.getAttribute('data-key') === route.key) button.setAttribute('aria-current', 'true')
      else button.removeAttribute('aria-current')
    })
    renderRequest()
  }

  // K4: com zonas lado a lado, se o cabeçalho do Resultado ficou acima da janela, ele volta à vista e o
  // foco fica na entrada; numa coluna só, a página rola até ele e o foco vai para ele.
  function pickHistory (record) {
    selectRouteOf(record)
    state.pickedId = record.id
    show(record, 'history')
    const behavior = state.reduced ? 'auto' : 'smooth'
    if (isNarrow()) {
      $('result').scrollIntoView({ block: 'start', behavior })
      $('shown').focus({ preventScroll: true })
    } else if ($('shown').getBoundingClientRect().top < 0) {
      $('result').scrollIntoView({ block: 'start', behavior })
    }
  }

  // P3: Limpar guarda uma cópia do que apaga (entradas, o envio mostrado, os não vistos) e oferece Desfazer
  // até o próximo envio. Um envio pendente mostra o status antes; o fluxo que ainda anda para, porque o
  // anúncio dele falaria de um envio apagado. A cópia guardada na sessão também fica vazia.
  function clearHistory () {
    revealPending()
    clearTimeout(flow.timer)
    flow.run++
    state.undo = { history: state.history.slice(), shownId: state.shownId, shownLive: state.shownLive, pickedId: state.pickedId, unseen: state.unseen }
    state.history = []
    state.shownId = null
    state.unseen = 0
    state.countNote = ''
    state.limitNote = ''
    renderHistory()
    paintRouteMarks()
    showForSelected()
    paintHistBadge(false)
    saveHistory()
    saveView()
    announce(t('lab.history.clear_done'))
    // O botão Limpar some com o histórico: o foco vai para Desfazer, na linha que o substitui.
    $('hist-undo').focus({ preventScroll: true })
  }

  // Desfazer devolve a cópia exatamente: as entradas, o envio mostrado (e com ele o Resultado e a rota dele,
  // se a pessoa escolheu outra no meio), as marcas das rotas e os não vistos.
  function undoClear () {
    const saved = state.undo
    if (!saved) return
    state.undo = null
    state.history = saved.history
    state.unseen = saved.unseen
    renderHistory()
    paintRouteMarks()
    paintHistBadge(false)
    const record = state.history.find(item => item.id === saved.shownId)
    if (record) {
      selectRouteOf(record)
      state.pickedId = saved.pickedId
      show(record, saved.shownLive ? 'live' : 'history', true, true)
    } else {
      showForSelected()
    }
    saveHistory()
    saveView()
    $('hist-clear').focus({ preventScroll: true })
    announce(t('lab.history.restored'))
  }

  /* ---------- Exibição de um registro ---------- */

  // A zona Resultado sempre diz qual requisição mostra; ao trocar de rota, mostra o envio mais
  // recente dessa rota (marcado como anterior) ou um estado vazio para ela.
  function showForSelected () {
    const route = state.selected
    const record = route ? latestFor(route.key) : null
    state.pickedId = null
    if (record) show(record, 'history', true)
    else renderResultEmpty(route)
  }

  function setResultMode (hasRecord) {
    $('result-origin').hidden = !hasRecord
    $('result-edit').hidden = !hasRecord
    $('result-empty').hidden = hasRecord
    $('shown').hidden = !hasRecord
    $('flow').hidden = !hasRecord
    // As abas aparecem com um envio, e cada painel só quando a aba dele está escolhida.
    $('result-tabs').hidden = !hasRecord
    paintResultTabs()
    if (!hasRecord) {
      unmountTime()
      releaseResponseHeight()
      $('response').setAttribute('aria-busy', 'false')
      state.sentOutRecord = null
      state.tabRecordId = null
    }
  }

  /* ---------- Abas do Resultado: Resposta e Foi enviado ---------- */

  // O mesmo componente das abas Rotas e Histórico. Os títulos h3 ficam no começo de cada painel, só para o
  // leitor de tela; Copiar corpo fica na linha do subtítulo Corpo e Copiar comando na primeira linha de Foi
  // enviado. Setas com volta, Home e End; a aba escolhida já mostra o painel, e nada é anunciado.
  function setupResultTabs () {
    RESULT_TABS.forEach((id, index) => {
      const button = $('res-tab-' + id)
      button.addEventListener('click', () => selectResultTab(id, false))
      button.addEventListener('keydown', event => {
        let next = null
        if (event.key === 'ArrowRight') next = (index + 1) % RESULT_TABS.length
        else if (event.key === 'ArrowLeft') next = (index - 1 + RESULT_TABS.length) % RESULT_TABS.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = RESULT_TABS.length - 1
        if (next === null) return
        event.preventDefault()
        selectResultTab(RESULT_TABS[next], true)
      })
    })
    $('sent-out-copy').addEventListener('click', copySent)
    $('sent-out-times').addEventListener('change', () => { if (state.sentOutRecord) renderSentOut(state.sentOutRecord) })
    paintResultTabs()
  }

  function paintResultTabs () {
    const shown = !$('result-tabs').hidden
    RESULT_TABS.forEach(id => {
      const on = state.resultTab === id
      const button = $('res-tab-' + id)
      button.setAttribute('aria-selected', on ? 'true' : 'false')
      button.tabIndex = on ? 0 : -1
      $(RESULT_PANELS[id]).hidden = !shown || !on
    })
  }

  function selectResultTab (id, focus) {
    state.resultTab = id
    paintResultTabs()
    if (focus) $('res-tab-' + id).focus()
  }

  // Cada envio novo que aparece no Resultado (um envio, uma entrada do Histórico, a troca de rota) abre em
  // Resposta. O redesenho do mesmo envio (o veredito, Mostrar a resposta agora) não muda a aba: quem abriu
  // Foi enviado durante a câmera lenta continua lá. A escolha não fica guardada.
  function resetResultTab (record) {
    if (state.tabRecordId === record.id) return
    state.tabRecordId = record.id
    state.resultTab = 'resposta'
  }

  function markCurrentEntry () {
    document.querySelectorAll('.entry').forEach(button => {
      if (button.getAttribute('data-id') === String(state.shownId)) button.setAttribute('aria-current', 'true')
      else button.removeAttribute('aria-current')
    })
  }

  // mode: 'live' (acabou de chegar) ou 'history' (envio anterior, sem animação). still: desenha sem animar
  // (o envio devolvido por Desfazer).
  function show (record, mode, quiet, still) {
    stopWaiting()
    const live = mode === 'live'
    const changed = state.shownId !== record.id
    state.shownId = record.id
    state.shownLive = live
    markCurrentEntry()
    resetResultTab(record)
    setResultMode(true)
    renderShown(record, live)
    renderResponse(record, live)
    renderSentOut(record)
    renderFlow(record, live, live && !still && slowMotion(), quiet)
    if (changed) saveView()
    if (!quiet) revealFlow()
    keepEntryInView()
  }

  /* ---------- Transições suaves ---------- */

  // Quando o conteúdo do Resultado muda de altura ou um esqueleto vira valor, a troca anda em pouco tempo em
  // vez de pular: o olho acompanha o que mudou. Nada aqui antecipa o veredito (D29): as trocas acontecem nos
  // mesmos momentos de antes; só deixam de ser instantâneas. Com menos movimento, nada anima.
  const SWAP_GROW_MS = 220
  const SWAP_FADE_MS = 150
  const swaps = new Map()
  const growing = new WeakMap()

  function motionOk () {
    return !state.reduced && !!document.body.animate
  }

  // Guarda a altura (e, com crossfade, uma cópia do conteúdo) antes de quem chama trocar o conteúdo do nó.
  // Depois do código síncrono (microtarefa), a altura anda até a nova e a cópia some sobre o conteúdo novo.
  // Só a borda de baixo anda: o topo do conteúdo fica onde estava. Várias trocas no mesmo passo viram uma.
  function smoothSwap (node, crossfade = true) {
    if (!motionOk() || swaps.has(node) || !node.isConnected || !node.getClientRects().length) return
    const entry = { from: node.getBoundingClientRect().height, ghost: null }
    if (crossfade && node.children.length) entry.ghost = ghostOf(Array.from(node.children).filter(child => !child.classList.contains('swap-ghost')))
    swaps.set(node, entry)
    queueMicrotask(() => settleSwap(node))
  }

  // A cópia é só imagem: fora da árvore de acessibilidade, sem foco e sem ids repetidos.
  function ghostOf (nodes) {
    const ghost = el('div', { class: 'swap-ghost', 'aria-hidden': 'true' })
    ghost.inert = true
    nodes.forEach(node => ghost.append(node.cloneNode(true)))
    ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
    return ghost
  }

  // Esqueleto e valor se cruzam; dois conteúdos reais sobrepostos (o modo normal, uma entrada do Histórico)
  // seriam ruído, então trocam na hora e só a altura anda.
  const SKELETON = ['.pv', '.wait-box', '.skel']

  function settleSwap (node) {
    const entry = swaps.get(node)
    swaps.delete(node)
    if (!entry || !node.isConnected) return
    const fresh = Array.from(node.children).filter(child => !child.classList.contains('swap-ghost'))
    const skeletal = entry.ghost && SKELETON.some(sel => entry.ghost.querySelector(sel) || fresh.some(child => child.matches(sel)))
    if (skeletal && fresh.length) {
      node.querySelectorAll(':scope > .swap-ghost').forEach(old => old.remove())
      node.append(entry.ghost)
      const out = entry.ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SWAP_FADE_MS, easing: 'ease-out' })
      out.onfinish = out.oncancel = () => entry.ghost.remove()
      fresh.forEach(child => fadeIn(child))
    }
    const previous = growing.get(node)
    if (previous) previous.cancel()
    const to = node.getBoundingClientRect().height
    if (Math.abs(to - entry.from) < 1) return
    node.style.overflow = 'clip'
    const grow = node.animate([{ height: entry.from + 'px' }, { height: to + 'px' }], { duration: SWAP_GROW_MS, easing: 'ease-out' })
    growing.set(node, grow)
    grow.onfinish = grow.oncancel = () => {
      if (growing.get(node) !== grow) return
      growing.delete(node)
      node.style.overflow = ''
    }
  }

  // Um valor que acabou de sair do esqueleto aparece em vez de surgir de uma vez.
  function fadeIn (node, delay = 0) {
    if (!node || !motionOk()) return
    node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: SWAP_FADE_MS, delay, easing: 'ease-out', fill: 'backwards' })
  }

  // Com uma resposta na tela, o envio novo não encolhe a Resposta até o esqueleto para crescer de novo no
  // veredito: a área guarda a altura da resposta anterior como mínima enquanto espera, e o veredito anda uma
  // vez só, dessa altura até a da resposta nova. A altura guardada é a do envio anterior: não diz nada do
  // novo (D29). Sem resposta anterior (primeiro envio, rota sem envios), o esqueleto vem com a altura dele.
  // Da espera real para o esqueleto da câmera lenta a altura guardada continua: a área já não tem resposta,
  // mas a mínima ainda é a dela. Uma altura que ainda anda vale pelo ponto de chegada.
  function holdResponseHeight (area) {
    if (!motionOk()) {
      area.style.minHeight = ''
      return
    }
    if (!area.querySelector(':scope > .res-line, :scope > .net-error')) return
    const grow = growing.get(area)
    const height = grow ? parseFloat(grow.effect.getKeyframes()[1].height) : area.getBoundingClientRect().height
    area.style.minHeight = height + 'px'
  }

  function releaseResponseHeight () {
    $('res-body-area').style.minHeight = ''
  }

  /* ---------- Espera real pelo servidor ---------- */

  const wait = { interval: null, record: null, clickAt: 0, seconds: 0 }

  // Limpa a espera (o contador, o estado e o que ela pôs no Fluxo e na Resposta); quem chama redesenha o
  // Resultado (show, renderResultEmpty).
  function stopWaiting () {
    clearInterval(wait.interval)
    if (wait.record) {
      smoothSwap($('res-body-area'))
      $('flow-body').textContent = ''
      releaseFlowReserve()
      $('res-body-area').textContent = ''
      $('response').setAttribute('aria-busy', 'false')
    }
    wait.interval = null
    wait.record = null
  }

  // Sob o esqueleto do status (no cabeçalho do Resultado e na entrada do Histórico) vai um chip neutro e
  // invisível, com o mesmo texto e a mesma largura em todo envio: ele só dá à linha a altura da do status. Uma
  // cópia do status real diria pelo tamanho como o envio terminou (D29).
  function neutralChip () {
    return el('span', { class: 'chip chip-neutral' }, el('span', { text: '•' }), '000')
  }

  // O cabeçalho do Resultado: método, path e "Status code" com o status. Até o veredito o status dá lugar ao
  // esqueleto, e o lugar inteiro sai da árvore de acessibilidade (D29). Num envio novo da mesma rota nada é
  // refeito: "Status code" é o mesmo nos dois estados e fica parado, e só o valor cruza com o esqueleto, que
  // fica na mesma célula, com a mesma largura (CSS). Um envio que não chegou ao servidor não tem status code:
  // fica só "falhou".
  function paintShown (record, pending) {
    const box = $('shown')
    const labelled = pending || !record.error
    const key = [record.method, record.path, labelled].join(' ')
    let status = box.querySelector(':scope > .shown-status')
    if (!status || box.getAttribute('data-key') !== key) {
      status = el('span', { class: 'shown-status' }, labelled ? [el('span', { class: 'status-label', text: t('lab.status.label') }), ' '] : null,
        el('span', { class: 'status-value' }, el('span', { class: 'status-real' }), neutralChip()))
      box.replaceChildren(
        el('span', { class: 'sr-only', text: t('lab.result.shown_label') }),
        methodBadge(record.method),
        el('code', { class: 'shown-path', text: record.path }),
        status)
      box.setAttribute('data-key', key)
    }
    // Como o chip, o status só chega no veredito.
    box.setAttribute('data-record', core.recordKey(record))
    if (pending) box.removeAttribute('data-status')
    else box.setAttribute('data-status', record.error ? 'error' : String(record.status))
    const real = status.querySelector('.status-real')
    if (!pending) real.replaceChildren(statusChip(record))
    status.classList.toggle('is-pending', pending)
    // O status anterior sai da página quando acaba de sumir: até o veredito, o lugar só tem o esqueleto.
    if (pending) afterTransitions(real, () => { if (status.classList.contains('is-pending')) real.replaceChildren() })
    if (pending) status.setAttribute('aria-hidden', 'true')
    else status.removeAttribute('aria-hidden')
  }

  // Passado 1 s sem resposta: o Resultado mostra este envio (método e path, com o lugar do status guardado),
  // o Fluxo diz que o caminho vem com a resposta, a Resposta mostra a espera com os segundos desde o clique e
  // Foi enviado já mostra o comando. A entrada do Histórico só nasce na chegada (D28).
  function startWaiting (record, clickAt) {
    // Um envio anterior que ainda esperava o veredito mostra o status agora, e o fluxo dele para.
    revealPending()
    clearTimeout(flow.timer)
    flow.run++
    flow.record = null
    flow.model = null
    stopWaiting()
    wait.record = record
    wait.clickAt = clickAt
    wait.seconds = 0
    state.shownId = null
    state.shownLive = true
    state.pickedId = null
    state.offer = null
    markCurrentEntry()
    resetResultTab(record)
    setResultMode(true)
    paintShown(record, true)
    paintOrigin(record, true)
    paintFill()
    setReplayReady(false)
    unmountTime()
    $('flow-body').textContent = ''
    reserveFlow(record)
    $('flow-body').append(el('p', { class: 'flow-note', text: t('lab.wait.flow') }))
    $('response').setAttribute('aria-busy', 'true')
    const area = $('res-body-area')
    smoothSwap(area)
    holdResponseHeight(area)
    area.textContent = ''
    area.append(waitView())
    alignSkeleton()
    renderSentOut(record)
    tickWaiting()
    wait.interval = setInterval(tickWaiting, 250)
    announce(t('lab.wait.announce'))
    revealFlow()
  }

  // O círculo (tempo desconhecido) e os segundos desde o clique; de 5 s em diante, a frase do servidor que
  // pode estar iniciando, e o círculo e o brilho do esqueleto param. O esqueleto da resposta fica abaixo,
  // como na câmera lenta; o círculo e os segundos só aqui, para um servidor lento e a câmera lenta não
  // parecerem a mesma coisa.
  function waitView () {
    return el('div', { class: 'wait-box' },
      el('p', { class: 'wait-line' }, syncSpin(el('span', { class: 'wait-ring', id: 'wait-ring', 'aria-hidden': 'true' })), el('span', { id: 'wait-count' })),
      el('p', { class: 'wait-cold is-off', id: 'wait-cold', text: t('lab.wait.cold') }),
      skeleton(busyStill()))
  }

  // Os segundos contam do clique, inteiros, a partir de 1; o texto só muda quando o número muda.
  function tickWaiting () {
    if (!wait.record) return
    const seconds = Math.max(1, Math.floor((performance.now() - wait.clickAt) / 1000))
    if (seconds === wait.seconds) return
    wait.seconds = seconds
    const cold = seconds >= COLD_AFTER
    if ($('wait-count')) $('wait-count').textContent = fillText('lab.wait.server', { seconds })
    if ($('wait-cold')) $('wait-cold').classList.toggle('is-off', !cold)
    if ($('wait-ring')) $('wait-ring').classList.toggle('is-still', cold)
    document.querySelectorAll('#res-body-area .skel').forEach(node => node.classList.toggle('is-still', cold))
    const spin = document.querySelector('#run .spin')
    if (spin) spin.classList.toggle('is-still', cold)
  }

  // A altura da cascata desenhada, por rota, largura do Fluxo e tamanho do texto. Na espera real o Fluxo
  // guarda essa altura (ou a de uma cascata de cinco etapas, no CSS), para a Resposta e Foi enviado não
  // pularem quando a cascata chega. Nada nela diz como o envio termina.
  const flowHeights = {}

  function flowHeightKey (record) {
    return [core.recordKey(record), $('flow-body').clientWidth, getComputedStyle(document.documentElement).fontSize, state.flowOpen ? 'aberto' : 'fechado'].join('|')
  }

  function reserveFlow (record) {
    const body = $('flow-body')
    const known = flowHeights[flowHeightKey(record)]
    body.style.minHeight = known ? known + 'px' : ''
    body.classList.toggle('flow-reserve', !known)
    if (!known && !state.flowOpen) body.style.setProperty('--read-row-h', readRowHeight(body) + 'px')
  }

  // Fechado, sem altura medida desta rota, a reserva é a das partes fixas (CSS) mais a fileira da linha de
  // leitura nesta largura: a frase mais longa dela, na coluna que sobra ao lado da marca "escala ajustada".
  // Uma cópia invisível da fileira é medida e sai.
  function readRowHeight (body) {
    const longest = list => list.reduce((a, b) => b.length > a.length ? b : a, '')
    const read = el('p', { class: 'fc-read' }, el('span', { class: 'fc-read-text' }))
    read.setAttribute('data-reserve', longest([t('lab.flow.read.time_hint'), t('lab.flow.read.time_hint_stopped')]))
    read.setAttribute('data-reserve-touch', t('lab.flow.read.time_hint_touch'))
    const row = el('div', { class: 'fc-read-row', 'aria-hidden': 'true' }, read, el('span', { class: 'fc-scale', text: t('lab.time.adjusted_mark') }))
    row.style.visibility = 'hidden'
    body.append(row)
    const height = row.getBoundingClientRect().height + parseFloat(getComputedStyle(row).marginTop)
    row.remove()
    return height
  }

  function releaseFlowReserve () {
    const body = $('flow-body')
    body.style.minHeight = ''
    body.style.removeProperty('--read-row-h')
    body.classList.remove('flow-reserve')
  }

  function renderShown (record, live) {
    paintShown(record, record.id === state.pendingId)
    paintOrigin(record, live)
    if (state.filledId !== record.id) state.filledId = null
    paintFill()
  }

  /* ---------- Preencher a requisição com um envio ---------- */

  // Escolher um envio antigo não mexe no rascunho. Quando o que está na requisição é diferente do que este
  // envio mandou (o comando curl dos dois não bate), o topo de Foi enviado diz isso (paintSentDiff), e ali
  // ficam o botão, a linha que diz o que ele não faz e a confirmação; no Resultado, só a marca na aba. Só
  // redesenha quando o estado muda, para não tirar o foco do botão.
  function paintFill () {
    const record = state.history.find(item => item.id === state.shownId)
    const route = state.selected
    let mode = 'none'
    const picked = record && record.id === state.pickedId && core.isOlderThanLatest(record, state.history)
    if (picked && record.sent && route && core.recordKey(record) === route.key && !$('shown').hidden) {
      if (core.recordDiffersFromDraft(record, currentRequest(route))) {
        state.filledId = null
        mode = 'differs'
      } else if (state.filledId === record.id) {
        mode = 'done'
      }
    }
    const key = mode + ':' + (record ? record.id : '')
    const inner = $('sent-fill')
    if (!inner || inner.getAttribute('data-state') === key) return
    inner.setAttribute('data-state', key)
    inner.textContent = ''
    inner.hidden = mode === 'none'
    if (mode === 'differs') {
      // D31: o botão diz o que faz, e a linha de baixo diz o que ele não faz e qual é o passo seguinte.
      append(inner, [el('button', { type: 'button', class: 'btn', id: 'fill-btn', text: t('lab.fill.action'), onclick: () => fillFromRecord(record) }),
        el('span', { class: 'fill-hint', text: t('lab.fill.hint') })])
    } else if (mode === 'done') {
      inner.append(el('p', { class: 'fill-done', id: 'fill-done', tabindex: '-1' }, el('span', { 'aria-hidden': 'true', text: '✓ ' }), fillText('lab.fill.done', { time: clock(record.at) }), state.fillAuthChanged ? ' ' + t('lab.fill.auth_changed') : ''))
    }
  }

  // Devolve à zona Requisição o que o envio mandou: parâmetros de caminho e de consulta, corpo e o
  // valor de Authorization (como edição desta rota, só se for diferente do que o campo já mostra).
  function fillFromRecord (record) {
    const route = state.routes.find(item => item.key === core.recordKey(record))
    if (!route || !record.sent) return
    const draft = draftFor(route)
    draft.params = Object.assign({}, record.sent.params)
    draft.body = record.sent.body
    // A legenda do corpo passa a dizer de qual envio ele veio, até a próxima edição.
    if (route.body) draft.bodyFrom = record.at
    const authChanged = route.needsToken && authValue(route) !== record.sent.auth
    if (authChanged) {
      draft.auth = record.sent.auth
      draft.authFrom = record.at
    } else if (route.needsToken) {
      delete draft.authFrom
    }
    state.filledId = record.id
    state.fillAuthChanged = authChanged
    renderRequest()
    // O botão some: o foco vai para a frase que o substitui, e ela também é anunciada.
    const done = $('fill-done')
    if (done) done.focus({ preventScroll: true })
    announce(fillText('lab.fill.announce', { route: record.method + ' ' + record.path, time: clock(record.at) }) + (authChanged ? ' ' + t('lab.fill.auth_changed') : ''))
  }

  function renderResultEmpty (route) {
    stopWaiting()
    state.shownId = null
    markCurrentEntry()
    setResultMode(false)
    saveView()
    // O fluxo do envio que ainda espera o veredito continua, escondido: no fim dele a entrada e a marca da
    // rota mostram o status e o resultado é anunciado, como com o fluxo à vista. Os outros param aqui.
    if (!(flow.record && flow.record.id === state.pendingId)) {
      clearTimeout(flow.timer)
      flow.run++
      flow.record = null
      flow.model = null
    }
    state.offer = null
    const box = $('result-empty')
    box.textContent = ''
    // Primeira visita: esta aba ainda não tem Histórico (um recarregamento com Histórico não é primeira visita).
    const first = !state.history.length
    const routeLine = route ? el('p', { class: 'result-route' }, parts('lab.result.not_sent', { route: el('code', { text: route.method.toUpperCase() + ' ' + route.path }) })) : null
    const how = el('p', { text: t('lab.result.not_sent_how') })
    // A primeira linha recebe o foco quando o convite é fechado.
    const firstLine = routeLine || how
    firstLine.id = 'result-empty-first'
    firstLine.setAttribute('tabindex', '-1')
    append(box, [
      el('div', { class: 'result-empty-lines' },
        // As setas da marca abrem o Resultado vazio; a logo completa fica na barra e no rodapé.
        el('div', { class: 'result-empty-head' },
          el('span', { class: 'setas', 'aria-hidden': 'true' }, el('span', { class: 'setas-p' }), el('span', { class: 'setas-d' })),
          routeLine),
        how,
        el('p', { class: 'muted small', text: t(first ? 'lab.result.history_note' : 'lab.result.others') })),
      // O Sobre aparece em toda rota ainda não executada, não só na primeira visita: quem troca de rota
      // também chega a um Resultado vazio. O convite do guia ou o de opinião, quando cabe, vem antes dele.
      first ? guideInviteNode() : feedbackInviteNode(),
      aboutBand()
    ])
  }

  // Depois de um envio o Resultado rola com a página (sem rolagem própria). Lado a lado: se o cabeçalho dele
  // ficou acima da janela (Ctrl + Enter de um editor rolado, ou o Resultado vazio, grudado no topo, deixou de
  // grudar), ele volta à vista e o foco fica onde está. Numa coluna só a página rola até a zona; com o foco
  // em Executar, ele vai junto, para o título do Fluxo (o próximo Tab é "Rever em câmera lenta"), em vez de
  // ficar longe da tela, onde Enter enviaria de novo.
  function revealFlow () {
    const behavior = state.reduced ? 'auto' : 'smooth'
    if (!isNarrow()) {
      if ($('shown').getBoundingClientRect().top < 0) $('result').scrollIntoView({ block: 'start', behavior })
      return
    }
    const top = $('result').getBoundingClientRect().top
    if (top >= 0 && top <= window.innerHeight * 0.4) return
    $('result').scrollIntoView({ block: 'start', behavior })
    if (document.activeElement === $('run')) $('flow-title').focus({ preventScroll: true })
  }

  // Numa coluna só, do Resultado de volta para a barra de endereço da Requisição. O foco vai para o endereço
  // (não para um campo, que abriria o teclado do telefone); o próximo Tab é Executar.
  function editRequest (event) {
    event.preventDefault()
    const bar = document.querySelector('.req-bar-wrap')
    const target = $('req-path')
    if (!bar || !target) {
      $('request').focus()
      return
    }
    bar.scrollIntoView({ block: 'start', behavior: state.reduced ? 'auto' : 'smooth' })
    target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }

  // De onde vem o envio mostrado, no fim da linha do título "Resultado": enviado agora e o último desta rota
  // em grafite, um anterior ao último em tinta e semibold (nunca no roxo dos links).
  function originTag (record, live) {
    const time = clock(record.at)
    if (live) return el('span', { class: 'tag', text: fillText('lab.origin.now', { time }) })
    const latest = latestFor(core.recordKey(record))
    if (!latest || latest.id === record.id) return el('span', { class: 'tag', text: fillText('lab.origin.latest', { time }) })
    return el('span', { class: 'tag origin-older', text: fillText('lab.origin.older', { time }) })
  }

  function paintOrigin (record, live) {
    const node = originTag(record, live)
    node.id = 'result-origin'
    node.classList.add('result-origin')
    $('result-origin').replaceWith(node)
  }

  /* ---------- Foi enviado ---------- */

  // O comando curl deste envio, montado do registro (nunca do rascunho), com a legenda dos headers que o
  // navegador acrescenta. Não é resultado, então aparece desde o clique (espera), durante a câmera lenta e
  // depois de um erro de rede. O nome acessível de Copiar comando guarda a hora do envio.
  function renderSentOut (record) {
    state.sentOutRecord = record
    const area = $('sent-out-area')
    area.textContent = ''
    const button = $('sent-out-copy')
    clearTimeout(button.copyTimer)
    button.textContent = t('lab.copy.command')
    button.removeAttribute('data-label')
    button.setAttribute('aria-label', fillText('lab.copy.command_sent', { time: clock(record.at) }))
    const pre = el('pre', { class: 'code-page curl-pre', id: 'sent-out-pre' })
    const withTimes = $('sent-out-times').checked
    renderCurl(pre, recordRequest(record), withTimes)
    append(area, [
      el('div', { class: 'sent-differs', id: 'sent-differs', hidden: true }),
      el('div', { class: 'sent-command', id: 'sent-command' },
        pre,
        el('div', { class: 'captions' },
          el('p', { class: 'caption', text: t('lab.sent_out.caption') }),
          withTimes ? curlTimesNote() : null)),
      el('div', { class: 'captions sent-out-notes' },
        el('div', { class: 'sent-fill', id: 'sent-fill', hidden: true }),
        el('p', { class: 'copy-msg', id: 'sent-out-msg' }))
    ])
    paintSentDiff()
    paintFill()
  }

  // O que cada tempo do -w quer dizer, numa lista curta, e por que o total do curl costuma passar o da barra.
  const CURL_TIME_TEXT = {
    time_namelookup: 'lab.sent_out.times.dns',
    time_connect: 'lab.sent_out.times.connect',
    time_appconnect: 'lab.sent_out.times.tls',
    time_starttransfer: 'lab.sent_out.times.first_byte',
    time_total: 'lab.sent_out.times.total'
  }

  function curlTimesNote () {
    return el('div', { class: 'curl-times' },
      el('p', { class: 'caption', text: t('lab.sent_out.times_intro') }),
      el('dl', { class: 'curl-times-list' }, core.CURL_TIME_VARS.map(name => [el('dt', { text: name }), el('dd', { text: t(CURL_TIME_TEXT[name]) })])),
      el('p', { class: 'caption', text: t('lab.sent_out.times_caveat') }))
  }

  // Com "Incluir os tempos do curl" marcado, o comando vai com a opção -w: depois da resposta, o curl escreve
  // os próprios tempos no terminal.
  function copySent () {
    const record = state.sentOutRecord
    if (!record || !$('sent-out-pre')) return
    const withTimes = $('sent-out-times').checked
    copyCommand($('sent-out-copy'), withTimes ? core.curlWithTimes(record.curl) : record.curl, $('sent-out-pre'), $('sent-out-msg'), null, withTimes ? 'lab.copy.command_timed_done' : null)
  }

  // Do balão do total para a caixa "Incluir os tempos do curl", na aba da requisição enviada.
  function goToCurlTimes () {
    closeTimePop(false)
    selectResultTab('enviado', false)
    const box = $('sent-out-times')
    box.scrollIntoView({ block: 'nearest' })
    box.focus({ preventScroll: true })
  }

  // O envio de Foi enviado é diferente do rascunho da mesma rota? A aba ganha a caixa "≠ Requisição a enviar" e um
  // nome que diz isso, e o painel começa pelo que difere. Nada é anunciado.
  function paintSentDiff () {
    const record = state.sentOutRecord
    const route = state.selected
    const ours = !!record && !!route && core.recordKey(record) === route.key
    const draft = ours ? currentRequest(route) : null
    const differs = ours && core.curlOf(draft) !== record.curl
    $('res-tab-diff').hidden = !differs
    if (differs) $('res-tab-enviado').setAttribute('aria-label', t('lab.sent_out.tab_diff_name'))
    else $('res-tab-enviado').removeAttribute('aria-label')
    paintDiffCaption(differs)
  }

  // O topo de Foi enviado: uma frase só, dizendo que a requisição na tela está diferente deste envio, sem
  // listar o que mudou; o comando logo abaixo já mostra o envio inteiro.
  function paintDiffCaption (differs) {
    const box = $('sent-differs')
    if (!box || box.hidden === !differs) return
    box.hidden = !differs
    box.textContent = differs ? t('lab.sent_out.differs') : ''
  }

  /* ---------- Resposta ---------- */

  // Até o veredito do fluxo, nem status nem corpo (D29): no lugar, a caixa da câmera lenta. Depois: a linha
  // do status ("Status code" e o status, um link para a página dele na MDN) com o que a documentação diz
  // dele, a oferta do token (K3), o corpo e os headers da resposta, sempre à vista.
  function renderResponse (record, live) {
    const area = $('res-body-area')
    // O controle com o foco (Mostrar a resposta agora quando o fluxo termina sozinho, Usar este token,
    // Copiar corpo) some quando a área é refeita: o foco vai para o painel Resposta e não cai no body.
    const restore = area.contains(document.activeElement)
    if (restore) $('response').focus({ preventScroll: true })
    smoothSwap(area)
    if (record.id === state.pendingId) holdResponseHeight(area)
    else releaseResponseHeight()
    area.textContent = ''
    state.offer = null
    if (record.id === state.pendingId) {
      $('response').setAttribute('aria-busy', 'true')
      area.append(pendingView(record))
      alignSkeleton()
      return
    }
    $('response').setAttribute('aria-busy', 'false')
    if (record.error) {
      area.append(el('div', { class: 'net-error' },
        el('strong', { text: t('lab.response.network_error') }),
        el('span', { class: 'small', text: fillText('lab.response.network_detail', { error: record.error }) })))
      if (restore) keepResponseInView(false)
      return
    }
    const body = record.bodyText
    // Um corpo guardado cortado na sessão (bodyCut, o tamanho real) também mostra o aviso.
    const fullLength = record.bodyCut || body.length
    const truncated = fullLength > MAX_BODY_CHARS || !!record.bodyCut
    // prettyJson reindenta sem converter valores: o corpo mostrado tem os mesmos números e chaves que chegaram.
    const pretty = core.prettyJson(body)
    const pre = el('pre')
    let shownText = pretty !== null ? pretty : body
    if (truncated) shownText = shownText.slice(0, MAX_BODY_CHARS)
    if (pretty !== null && !truncated) pre.innerHTML = core.highlightJson(shownText)
    else pre.textContent = shownText
    // Um corpo vazio não tem o que copiar: em vez do bloco escuro, a nota "(corpo vazio)" em itálico.
    const empty = body === ''
    const copy = empty ? null : el('button', { type: 'button', class: 'btn btn-copy', id: 'copy-body', 'aria-label': t('lab.copy.body_name'), text: t('lab.copy.body'), onclick: copyBody })

    append(area, [
      el('div', { class: 'res-line' }, statusLink(record), simpleDocLine(record, documentedResponse(record))),
      el('div', { class: 'sub-row' }, el('h4', { class: 'sub-label', text: t('lab.response.body_label') }), copy),
      empty ? el('p', { class: 'empty-body', text: t('lab.response.empty_body') }) : el('div', { class: 'code res-body' }, pre),
      empty ? null : el('p', { class: 'copy-msg', id: 'body-copy-msg' }),
      // A oferta do token fica logo abaixo do corpo, onde o token aparece: assim a linha do status, o
      // "Copiar corpo" e o corpo ficam no mesmo lugar em toda rota, com ou sem token.
      tokenOffer(record),
      truncated ? el('p', { class: 'muted small', text: fillText('lab.response.truncated', { count: fullLength }) }) : null,
      el('h4', { class: 'sub-label', text: fillText('lab.response.headers', { count: record.headers.length }) }),
      responseHeaders(record.headers)
    ])
    if (restore) keepResponseInView(false)
  }

  // "Status code ✗ 401 Unauthorized ↗": um link só, para a página do status na MDN, numa aba nova. O nome
  // acessível é uma frase inteira em aria-label, que começa pelo texto visível e já diz que abre outra aba.
  function statusLink (record) {
    const mdn = core.mdnStatusUrl(record.status, language)
    const name = fillText(mdn.english ? 'lab.status.link_name_english' : 'lab.status.link_name', { status: statusLine(record) })
    return el('a', { class: 'status-link', href: mdn.url, target: '_blank', rel: 'noopener', 'aria-label': name },
      el('span', { class: 'status-label', text: t('lab.status.label') }),
      ' ',
      el('span', { class: 'chip ' + statusClass(record.status) },
        el('span', { 'aria-hidden': 'true', text: statusGlyph(record.status) }),
        ' ',
        el('span', { class: 'status-text', text: statusLine(record) })),
      el('span', { 'aria-hidden': 'true', text: ' ↗' }))
  }

  // O foco vai para a Resposta sem rolar, e a página só rola quando falta algo: com full (Mostrar a resposta
  // agora, um pedido explícito) até a linha do status e as primeiras linhas do corpo ficarem à vista; sem
  // full (o botão sumiu sozinho no veredito) até a linha do status ficar à vista.
  function keepResponseInView (full) {
    const area = $('res-body-area')
    const head = area.querySelector('.res-line, .net-error')
    if (!head) return
    const body = full ? area.querySelector('.res-body') : null
    const top = head.getBoundingClientRect().top
    const bottom = body ? body.getBoundingClientRect().top + 64 : head.getBoundingClientRect().bottom
    if (top >= 0 && bottom <= window.innerHeight) return
    $('result-tabs').scrollIntoView({ block: 'start', behavior: state.reduced ? 'auto' : 'smooth' })
  }

  // O envio já tem resposta, mas o fluxo ainda está desenhando (câmera lenta). O esqueleto já tem a forma da
  // resposta, no lugar dela: a linha do status e a da descrição, a linha do Corpo com "Mostrar a resposta
  // agora" onde vai ficar Copiar corpo, o bloco do corpo com a frase de que o servidor já respondeu e os
  // headers. Na troca, o corpo e o botão não andam. A mesma marcação em todo envio, sem cor de status e sem
  // altura de corpo (D29). Depois de uma espera real de 5 s ou mais o brilho já nasce parado (um brilho que
  // volta logo depois de o servidor responder pareceria carregar de novo).
  function pendingView (record) {
    const bar = className => el('span', { class: 'skel-bar' + (className ? ' ' + className : '') })
    const node = el('div', { class: 'pv' + (record.ms >= COLD_AFTER * 1000 ? ' is-still' : '') },
      el('div', { class: 'res-line', 'aria-hidden': 'true' },
        el('span', { class: 'status-link' }, el('span', { class: 'status-label', text: t('lab.status.label') }), ' ', el('span', { class: 'chip pv-chip' }, ' ', bar())),
        el('span', { class: 'res-doc pv-doc' }, ' ', bar())),
      el('div', { class: 'sub-row' }, el('h4', { class: 'sub-label', text: t('lab.response.body_label') }),
        el('button', { type: 'button', class: 'btn', id: 'show-now', text: t('lab.pending.show_now'), onclick: showNow })),
      el('div', { class: 'pv-block' }, el('p', { class: 'pv-msg' }, parts('lab.pending.arrived', { time: el('strong', { text: formatMs(record.ms) }) })),
        ['w70', 'w55', 'w15'].map(width => bar(width))),
      el('h4', { class: 'sub-label', text: t('lab.response.headers_plain') }),
      el('div', { class: 'pv-rows', 'aria-hidden': 'true' }, [1, 2, 3].map(() => el('span', { class: 'skel-row' }))))
    try {
      node.style.setProperty('--skel-delay', -(document.timeline.currentTime % 1500) + 'ms')
    } catch (e) {}
    return node
  }

  // O contorno de uma resposta (status, corpo e headers) na espera real, igual em todo envio: um contorno do
  // tamanho do corpo real diria como o envio terminou (D29). Fora da árvore de acessibilidade. O brilho
  // começa na fase do relógio do documento, então uma caixa refeita continua o mesmo movimento.
  function skeleton (still) {
    const node = el('div', { class: 'skel' + (still ? ' is-still' : ''), 'aria-hidden': 'true' },
      el('span', { class: 'skel-status' }, el('span', { class: 'status-label', text: t('lab.status.label') }), el('span', { class: 'skel-bar skel-bar-status' })),
      el('span', { class: 'skel-label', text: t('lab.response.body_label') }),
      el('div', { class: 'skel-block' }, ['w20', 'w70', 'w55', 'w15'].map(width => el('span', { class: width }))),
      el('span', { class: 'skel-label', text: t('lab.response.headers_plain') }),
      el('span', { class: 'skel-row' }),
      el('span', { class: 'skel-row' }),
      el('span', { class: 'skel-row' }))
    try {
      node.style.setProperty('--skel-delay', -(document.timeline.currentTime % 1500) + 'ms')
    } catch (e) {}
    return node
  }

  // A barra do status vem depois de "Status code" (e, na câmera lenta, as do bloco do corpo e dos headers
  // ficam em outras caixas): o brilho de cada uma começa na borda esquerda do esqueleto, no mesmo x do das
  // outras barras, para a onda continuar uma só.
  function alignSkeleton () {
    document.querySelectorAll('#res-body-area .skel-status .skel-bar, #res-body-area .pv .skel-bar, #res-body-area .pv .skel-row').forEach(bar => {
      const skel = bar.closest('.skel, .pv')
      bar.style.setProperty('--skel-x', (skel.getBoundingClientRect().left - bar.getBoundingClientRect().left) + 'px')
    })
  }

  // Os círculos de espera giram juntos: cada um começa na fase do relógio do documento.
  function syncSpin (node) {
    try {
      node.style.animationDelay = -(document.timeline.currentTime % 700) + 'ms'
    } catch (e) {}
    return node
  }

  // "Mostrar a resposta agora": termina esta animação como trocar para o modo normal no meio do fluxo, mas
  // sem mudar o modo. O anúncio do veredito é o de sempre; o foco vai para o painel Resposta.
  function showNow () {
    if (flow.model && flow.active < flow.end) finishFlowNow()
    else revealPending()
    const target = $('response')
    if (document.activeElement !== target) target.focus({ preventScroll: true })
    keepResponseInView(true)
  }

  // O status recebido na documentação da rota do envio.
  function documentedResponse (record) {
    if (record.error || record.status === null) return null
    const route = state.routes.find(item => item.key === core.recordKey(record))
    if (!route) return null
    return { found: route.responses.find(response => response.status === String(record.status)) || null }
  }

  // Só a descrição da documentação, sem "Na documentação:".
  function simpleDocLine (record, doc) {
    if (!doc) return null
    if (!doc.found) return el('span', { class: 'res-doc', text: t('lab.simple.undocumented') })
    return el('span', { class: 'res-doc' }, richInline(doc.found.description))
  }

  // Headers da resposta, sempre à vista; sob o de etapas, de onde vem o desenho do fluxo.
  function responseHeaders (list) {
    const node = el('dl', { class: 'sent res-headers' })
    list.forEach(header => {
      const stages = header[0].toLowerCase() === STAGES_HEADER
      // O nome de um header que o MDN explica vira link para a página dele.
      const link = core.headerLink(header[0], language)
      node.append(el('dt', null, link ? externalLink(link.url, header[0], link.english ? { hreflang: 'en' } : null) : header[0]),
        el('dd', null, header[1], stages ? el('p', { class: 'caption', text: t('lab.response.stages_note') }) : null))
    })
    return node
  }

  // Copiar corpo copia o corpo como chegou, mesmo quando a tela o mostra reindentado ou cortado. Um corpo que
  // o Histórico guardou cortado só tem a parte guardada, e a mensagem diz isso.
  function copyBody () {
    const record = state.history.find(item => item.id === state.shownId)
    if (!record || record.error) return
    const button = $('copy-body')
    copyText(record.bodyText, ok => {
      const message = $('body-copy-msg')
      if (ok) {
        const done = record.bodyCut ? fillText('lab.copy.body_done_cut', { count: record.bodyText.length }) : t('lab.copy.body_done')
        flashCopied(button)
        if (message) {
          message.className = 'copy-msg'
          message.replaceChildren(done)
        }
        announce(done)
        return
      }
      const pre = document.querySelector('#res-body-area .res-body pre')
      if (pre) selectContents(pre)
      if (message) {
        message.className = 'copy-msg fail'
        message.replaceChildren(...parts('lab.copy.body_failed', { ctrl: el('kbd', { text: ctrlName() }) }))
      }
      announce(fillText('lab.copy.body_failed', { ctrl: ctrlName() }))
    })
  }

  /* ---------- Fluxo ---------- */

  // Fluxo fechado: bar é a barra com as partes (items), a da requisição inteira (one, com o tempo timeBar) ou
  // a de "Todas as etapas"; read é a linha de leitura, readAt a parte que ela mostra (null: a frase de como
  // usar a barra), barFocus a parte em que o teclado parou e barHover se o mouse está sobre a barra.
  const flow = { timer: null, run: 0, record: null, model: null, active: 0, end: 0, rows: [], segs: [], live: false, bar: null, items: [], one: null, timeBar: null, read: null, readAt: null, readShown: null, readTimer: null, barFocus: null, barHover: false, morph: false, holdOne: null, barRunning: null, previous: null, columns: '', holdCols: null, holdStages: null, doneKey: '', oneWidened: false }

  function ran (stage) {
    return stage.st === 'ok' || stage.st === 'failed'
  }

  function finalState (stage) {
    if (stage.st === 'ok') return 'ok'
    if (stage.st === 'failed') return 'fail'
    if (stage.st === 'skipped') return 'skip'
    return 'not_run'
  }

  function nextActive (stages, from) {
    let index = from
    while (index < stages.length && !ran(stages[index])) index++
    return index
  }

  // Uma etapa ignorada (como o limite de requisições no ambiente local) não se aplica a este envio, e isso já
  // se sabe antes da câmera lenta começar: ela aparece resolvida desde o início, sem esperar a vez dela. As
  // que não executaram dependem de uma falha anterior e continuam esperando a vez.
  function stateAt (stages, index, active) {
    if (index < stages.length && stages[index].st === 'skipped') return 'skip'
    if (index > active) return 'pending'
    if (index === active) return 'running'
    return index < stages.length ? finalState(stages[index]) : 'done'
  }

  function delayAt (stages, index) {
    return index < stages.length ? core.stepDelay(stages[index]) : RESPONSE_DELAY
  }

  // Código desconhecido (servidor mais novo) aparece cru, em <code>.
  function codeOrLabel (key, raw, className) {
    return key ? el('span', { class: className, text: t(key) }) : el('code', { class: className, text: String(raw === undefined ? '' : raw) })
  }

  function markEl (symbol) {
    return el('span', { class: 'flow-mark', 'aria-hidden': 'true', text: symbol })
  }

  function stageMark (stateName) {
    if (stateName === 'running') return el('span', { class: 'flow-mark flow-spinner', 'aria-hidden': 'true' })
    if (stateName === 'ok') return markEl('✓')
    if (stateName === 'fail') return markEl('✗')
    return markEl('○')
  }

  function srStatus (item) {
    return el('span', { class: 'sr-only' }, codeOrLabel(item.statusKey, item.st))
  }

  function fillEl (stateName, delay) {
    if (stateName === 'running') {
      const fill = el('span', { class: 'flow-fill flow-fill-running' })
      fill.style.animationDuration = delay + 'ms'
      return fill
    }
    if (stateName === 'ok' || stateName === 'fail' || stateName === 'done') return el('span', { class: 'flow-fill flow-fill-full' })
    return null
  }

  function rightColumn (stage, stateName) {
    if (stateName === 'pending') return el('span', { class: 'flow-right', text: t('ui.flow.pending') })
    if (stateName === 'running') return el('span', { class: 'flow-right', text: t('ui.flow.running') })
    // Etapa que não rodou: o status fica nesta coluna, no lugar da duração (visual; o leitor de tela já tem o srStatus).
    // A ignorada mostra a versão curta, numa linha; a frase inteira e o motivo ficam na etapa aberta.
    if (stateName === 'skip' || stateName === 'not_run') {
      const key = stateName === 'skip' ? 'ui.flow.status_short.skipped' : stage.statusKey
      return el('span', { class: 'flow-right', 'aria-hidden': 'true' }, codeOrLabel(key, stage.st))
    }
    if (stage.dur === undefined) return el('span', { class: 'flow-right' })
    return el('span', { class: 'flow-right flow-dur', text: core.formatDuration(stage.dur, language) + ' ms' })
  }

  // {instruction} só existe em lab.flow.how.user_not_found; os outros textos não têm marcador.
  function textBlock (titleKey, bodyKey, className) {
    return el('div', { class: 'flow-block ' + className }, el('strong', { class: 'flow-block-title', text: t(titleKey) }),
      el('p', { text: fillText(bodyKey, { instruction: t('lab.auth.how_to_get') }) }))
  }

  // Por que a etapa foi pulada, quando há um texto para ela (hoje, o limite de requisições fora do ServeRest online).
  function skipBlock (stage) {
    const reasonKey = 'ui.flow.skipped.stage.' + stage.name
    return el('div', { class: 'flow-block flow-skip' }, el('strong', { class: 'flow-block-title', text: t('ui.flow.status.skipped') }),
      Object.prototype.hasOwnProperty.call(texts, reasonKey) ? el('p', { text: t(reasonKey) }) : null)
  }

  function ruleRow (rule) {
    const stateName = rule.st === 'ok' ? 'ok' : rule.st === 'failed' ? 'fail' : 'skip'
    return el('li', { class: 'flow-rule flow-rule-' + stateName }, stageMark(stateName), srStatus(rule),
      el('span', { class: 'flow-rule-body' },
        codeOrLabel(rule.labelKey, rule.code, 'flow-rule-name'),
        rule.item !== undefined
          ? el('span', { class: 'flow-item' }, el('span', { text: t('ui.flow.item_position') }), el('span', { class: 'flow-item-value', text: String(rule.item) }))
          : null))
  }

  function flowContext (record, model) {
    const context = el('div', { class: 'flow-context' },
      methodBadge(record.method),
      el('span', { class: 'path', text: record.path }),
      statusChip(record),
      el('span', { class: 'grow' }),
      originTag(record, flow.live))
    if (!model) return [context]
    const serverTotal = model.stages.reduce((total, stage) => total + (stage.dur || 0), 0)
    if (!record.timing) return [context, timeLine(record.ms, serverTotal), null, null]
    const bar = core.timeBar(record.ms, record.timing, serverTotal)
    return [context, timeFigure(bar), miniTime(bar), bar]
  }

  // Com o Fluxo fechado, a barra de tempo some e o tempo total sobe para a linha do veredito, à direita (numa
  // zona estreita, para a última linha, sob a linha de leitura).
  // Até o veredito o número dá lugar a uma barra do esqueleto, da mesma largura em todo envio (D29); o
  // número ocupa essa largura também depois, para "Tempo total no navegador" não andar na troca.
  function miniTime (bar) {
    return el('p', { class: 'flow-mini-time' }, t('lab.time.part.total') + ' ', el('b', {}, timeNumber(core.timeLabels(bar, language).total)))
  }

  function flowNote (record, content) {
    const body = $('flow-body')
    append(body, flowContext(record, null))
    body.append(el('p', { class: 'flow-note strong' }, content))
  }

  // quiet: ao trocar de rota o envio anterior volta sem ser anunciado como se tivesse acabado de chegar.
  // É aqui que o fluxo diz como terminou: o envio pendente mostra o status em todo lugar (revealPending).
  function flowAnnounce (message) {
    revealPending()
    if (flow.quiet) return
    // O fluxo terminou escondido (a pessoa foi para uma rota sem envios): o veredito sem rota soaria como o
    // da rota que está na tela. Como numa resposta que chega depois da troca de rota, o anúncio diz de
    // qual rota ela é e que está no Histórico.
    const record = flow.record
    if (record && state.shownId !== record.id) announceResult(fillText('lab.announce.other_route', { route: record.method + ' ' + record.path }))
    else announceResult(message)
  }

  function renderFlow (record, live, animate, quiet) {
    // Outro envio toma o lugar do fluxo: o que estava pendente não vai mostrar o veredito, então mostra o
    // status. Ele não é anunciado, e a contagem que ia no anúncio dele sai junto.
    if (state.pendingId !== null && state.pendingId !== record.id) {
      revealPending()
      state.countNote = ''
      state.limitNote = ''
    }
    clearTimeout(flow.timer)
    flow.run++
    flow.record = record
    flow.live = !!live
    // O resultado de um envio pendente nunca foi anunciado: voltar à rota dele mostra o veredito na hora
    // e o anuncia, mesmo numa exibição quieta.
    flow.quiet = !!quiet && state.pendingId !== record.id
    flow.model = null
    // As cores e os números das barras anteriores, para as novas partirem deles (fadeFromPrevious).
    flow.previous = previousPaint()
    unmountTime()
    $('flow-body').textContent = ''
    releaseFlowReserve()
    setReplayReady(false)

    if (record.error) {
      flowNote(record, t('lab.flow.no_response'))
      flowAnnounce(t('lab.response.network_error'))
      return
    }
    if (record.stagesHeader === null) {
      flowNote(record, parts('lab.flow.no_header', { header: el('code', { class: 'nowrap', text: 'X-ServeRest-Stages' }) }))
      flowAnnounce(fillText('lab.announce.no_flow', { status: statusLine(record) }))
      return
    }
    const model = flowModelOf(record)
    if (!model) {
      flowNote(record, parts('lab.flow.empty_header', { header: el('code', { class: 'nowrap', text: 'X-ServeRest-Stages' }) }))
      flowAnnounce(fillText('lab.announce.no_flow', { status: statusLine(record) }))
      return
    }
    drawFlow(record, model, animate)
  }

  function drawFlow (record, model, animate) {
    const body = $('flow-body')
    flow.model = model
    try {
      body.style.setProperty('--skel-delay', -(document.timeline.currentTime % 1500) + 'ms')
    } catch (e) {}
    const stages = model.stages
    flow.end = stages.length + 1
    flow.active = animate ? nextActive(stages, 0) : flow.end
    // Até o veredito as barras ficam com a geometria do envio anterior (nada do novo, D29); no veredito as
    // partes andam até as larguras novas (releaseBars).
    flow.morph = motionOk()
    flow.holdOne = flow.morph ? barMemo.one : null
    flow.holdStages = flow.morph ? heldStageShares(record, stages.length) : null
    time.hold = flow.morph ? barMemo.tl : null
    flow.barRunning = null

    // O veredito vem primeiro; a barra de tempo fica abaixo da cascata.
    const [context, times, mini, timeBar] = flowContext(record, model)
    body.append(context)
    const summary = el('p', { class: 'flow-summary waiting' })
    const outside = el('div', { class: 'flow-outside', hidden: true })
    const list = el('ol', { class: 'flow-stages' })
    flow.rows = []
    // Uma grade só (core.flowColumns): o resumo, cada linha e as linhas das colunas usam as mesmas
    // colunas, uma por etapa e a da resposta.
    const columns = stages.length + 1
    // Até o veredito, as colunas das etapas ficam com as larguras do envio anterior desta rota (ou iguais, no
    // primeiro envio dela): as larguras novas dizem quais etapas rodaram (D29). releaseColumns as solta.
    flow.columns = core.flowColumns(model)
    flow.holdCols = flow.morph ? heldColumns(record, stages.length) : null
    if (!flow.holdCols) barMemo.cols = { key: core.recordKey(record), n: stages.length, columns: flow.columns }
    body.style.setProperty('--wf-cols', flow.holdCols || flow.columns)
    const cellsOf = className => {
      const cells = []
      for (let column = 0; column < columns; column++) {
        cells.push(el('span', { class: 'wf-cell' + (column < stages.length ? ' wf-cell-stage' : ''), 'data-column': String(column) }))
      }
      return el('span', { class: className, 'aria-hidden': 'true' }, cells)
    }
    // O vermelho não entra aqui: paintFlow o põe quando a linha da etapa mostra ✗; enquanto roda, ela enche
    // em roxo.
    const segOf = (cell, response) => {
      const seg = el('span', { class: 'flow-seg' + (response ? ' flow-seg-response' : '') })
      cell.append(seg)
      return seg
    }
    const summaryBar = cellsOf('wf-summary')
    const scale = el('div', { class: 'wf-scale', 'aria-hidden': 'true' }, el('span', { class: 'wf-label', text: t('lab.flow.summary_label') }), summaryBar)
    stages.forEach((stage, index) => {
      const track = cellsOf('wf-track')
      const seg = segOf(track.children[index], false)
      const summarySeg = segOf(summaryBar.children[index], false)

      const isFailed = model.failedStage === stage.name && stage.st === 'failed'
      // O que a linha aberta mostra depende do estado dela (paintStageDetails): antes do fim da etapa, só a
      // descrição geral; as regras, Por que parou aqui e Como seguir entram no estado final.
      const opensEarly = !!stage.descriptionKey
      const opensFinal = opensEarly || stage.rules.length > 0 || stage.st === 'skipped' || (isFailed && (!!model.whyKey || !!model.howKey))
      const details = opensFinal ? el('div', { class: 'flow-details', id: 'flow-details-' + index, hidden: true }) : null
      const li = el('li', { class: 'flow-stage', 'data-stage': stage.name }, el('div', { class: 'flow-row' }), details)
      list.append(li)
      linkSummary(li, summaryBar.children[index], summarySeg)
      // Clicar no segmento do resumo abre a linha da etapa, como clicar na própria linha.
      summaryBar.children[index].addEventListener('click', () => pickSegment(index))
      flow.rows.push({ stage, li, row: li.firstChild, details, isFailed, opensEarly, opensFinal, expandable: false, filled: null, track, seg, summarySeg, state: null })
    })
    const responseTrack = cellsOf('wf-track')
    const responseSeg = segOf(responseTrack.children[stages.length], true)
    const responseSummarySeg = segOf(summaryBar.children[stages.length], true)
    const responseRow = el('div', { class: 'flow-row' })
    const responseLi = el('li', { class: 'flow-stage flow-response' }, responseRow)
    list.append(responseLi)
    linkSummary(responseLi, summaryBar.children[stages.length], responseSummarySeg)
    summaryBar.children[stages.length].addEventListener('click', () => pickSegment(stages.length))
    flow.responseRow = { li: responseLi, row: responseRow, track: responseTrack, seg: responseSeg, summarySeg: responseSummarySeg, state: null }

    // Linhas das colunas: uma camada só, sobre o resumo e a lista inteira.
    const lines = el('div', { class: 'wf-lines', 'aria-hidden': 'true' }, cellsOf('wf-lines-cols'))
    lines.firstChild.querySelectorAll('.wf-cell').forEach(cell => { cell.className = '' })
    // A dica vem antes do desenho de que fala: logo abaixo do veredito, antes das etapas.
    const hint = flowHint()
    // Fechado, a barra é a da requisição inteira quando o envio tem as fases do tempo (oneBar); sem elas, a
    // de "Todas as etapas", com uma parte por etapa e a da Resposta.
    clearTimeout(flow.readTimer)
    flow.timeBar = timeBar
    flow.one = timeBar ? oneBar(timeBar) : null
    flow.items = flow.one
      ? Array.from(flow.one.querySelectorAll('.fc-oi')).map(node => node.hasAttribute('data-tpart') ? { kind: 'time', part: node.getAttribute('data-tpart'), node } : { kind: 'stage', index: Number(node.getAttribute('data-cell')), node })
      : Array.from(summaryBar.children).map((node, index) => ({ kind: 'stage', index, node }))
    flow.bar = flow.one ? flow.one.firstChild : summaryBar
    // A linha de leitura da barra fechada, fora da árvore de acessibilidade: o nome de cada parte já diz o
    // mesmo (paintBar).
    const read = el('p', { class: 'fc-read', 'aria-hidden': 'true' }, el('span', { class: 'fc-read-text' }))
    flow.read = read
    flow.readAt = null
    flow.readShown = null
    flow.barFocus = null
    flow.barHover = false
    readReserve(read, stages)
    // Com a barra da requisição inteira, a linha de leitura divide a fileira com a marca "escala ajustada", numa
    // coluna da largura dela, guardada sempre: a altura reservada da leitura (readReserve) já é a da coluna
    // mais estreita, e nada se move quando a marca aparece no veredito.
    const readRow = flow.one ? el('div', { class: 'fc-read-row' }, read, scaleMark()) : read
    append(body, [summary, outside, hint, el('div', { class: 'wf' }, scale, list, lines), flow.one, readRow, mini, times])
    wireBar(flow.bar)
    if (flow.one) watchOneBar()
    flow.hintEl = hint
    flow.summaryEl = summary
    flow.outsideEl = outside
    // Presa até o veredito, a barra de tempo aberta já nasce neutra: o esqueleto dos rótulos é medido aberto.
    const holding = flow.morph && flow.active < flow.end
    if (times.classList.contains('tl')) {
      if (holding) {
        times.classList.add('tl-hold')
        times.querySelector('.tl-draw').inert = true
      }
      mountTime(times)
    }
    if (holding) fadeFromPrevious()
    // As colunas presas passam a px já no começo: de fr para px a transição não existe.
    const summaryShown = flow.holdCols && visibleSummary()
    if (summaryShown) body.style.setProperty('--wf-cols', measureColumns(summaryShown, flow.holdCols).map(width => width.toFixed(2) + 'px').join(' '))
    flow.doneKey = ''
    paintFlow()
    // A altura da cascata antes do veredito, para a próxima espera real desta rota.
    const drawn = body.offsetHeight
    if (drawn) flowHeights[flowHeightKey(record)] = drawn
    if (flow.active >= flow.end) {
      finishFlow()
    } else {
      summary.textContent = t('lab.flow.running')
      tick(flow.run)
    }
  }

  function tick (run) {
    const stages = flow.model.stages
    flow.timer = setTimeout(() => {
      if (run !== flow.run) return
      flow.active = nextActive(stages, flow.active + 1)
      paintFlow()
      if (flow.active >= flow.end) finishFlow(true)
      else tick(run)
    }, delayAt(stages, flow.active))
  }

  function paintFlow () {
    const stages = flow.model.stages
    flow.rows.forEach((row, index) => {
      const stateName = stateAt(stages, index, flow.active)
      if (row.state === stateName) return
      const wasRunning = row.state === 'running'
      row.state = stateName
      row.li.className = 'flow-stage flow-' + stateName
      const finished = stateName !== 'pending' && stateName !== 'running'
      const skipped = stateName === 'skip' || stateName === 'not_run'
      paintStageDetails(row, index, finished)
      // O status para leitor de tela só entra quando a etapa terminou.
      setRow(row.row, row.track, [
        stageMark(stateName),
        finished ? srStatus(row.stage) : null,
        boldReserved(codeOrLabel(row.stage.labelKey, row.stage.name, 'flow-name'))
      ].filter(Boolean), [endColumn(rightColumn(row.stage, stateName), row.expandable)])
      if (wasRunning) fadeIn(row.row.querySelector('.flow-right'))
      // O segmento enche no resumo e na linha ao mesmo tempo, com a mesma duração.
      fillBoth(row, stateName, delayAt(stages, index))
      // Etapa que não rodou: o mesmo encaixe hachurado no resumo e na linha.
      segsOf(row).forEach(seg => seg.classList.toggle('flow-seg-skip', skipped))
      // Vermelho só quando a linha mostra ✗.
      segsOf(row).forEach(seg => seg.classList.toggle('flow-seg-fail', stateName === 'fail'))
    })
    const responseState = stateAt(stages, stages.length, flow.active)
    const response = flow.responseRow
    if (response.state !== responseState) {
      response.state = responseState
      response.li.className = 'flow-stage flow-response flow-' + responseState
      let right
      if (responseState === 'done') right = el('span', { class: 'flow-right flow-dur', text: flow.model.statusCode !== null ? String(flow.model.statusCode) : '' })
      else right = el('span', { class: 'flow-right', text: responseState === 'running' ? t('ui.flow.running') : t('ui.flow.pending') })
      const mark = responseState === 'running' ? stageMark('running') : markEl(responseState === 'done' ? '→' : '○')
      setRow(response.row, response.track, [mark, boldReserved(el('span', { class: 'flow-name', text: t('ui.response') }))], [endColumn(right, false)])
      if (responseState === 'done' && flow.barRunning === true) fadeIn(right)
      fillBoth(response, responseState, RESPONSE_DELAY)
    }
    if (flow.active < flow.end && (flow.holdCols || flow.holdStages)) stepColumns()
    // A barra fechada e a linha de leitura seguem o estado de cada etapa a cada passo da câmera lenta.
    paintBar()
  }

  // Refaz a linha sem tirar a trilha do lugar: tirada e posta de volta, ela perderia a transição das colunas e
  // sairia do passo do resumo.
  function setRow (row, track, before, after) {
    if (track.parentNode !== row) {
      row.replaceChildren(...before, track, ...after)
      return
    }
    Array.from(row.childNodes).forEach(node => { if (node !== track) node.remove() })
    track.before(...before)
    track.after(...after)
  }

  /* ---------- Fluxo fechado: a barra e a linha de leitura ---------- */

  // A barra da requisição inteira, com o Fluxo fechado: conexão | ida | servidor | volta | download, como a
  // barra de tempo, e o servidor dividido nas etapas (a soma delas). Uma chave sob o servidor diz o tempo
  // dele. Até o veredito as partes da rede ficam vazias e os tempos invisíveis, com o lugar guardado (D29).
  const ONE_PARTS = { before: ['conn', 'outbound'], after: ['inbound', 'down'] }
  // A geometria da última barra mostrada (frações da largura na fechada, pesos na de tempo, colunas das etapas
  // no aberto): até o veredito, a barra do envio novo fica com ela.
  const barMemo = { one: null, tl: null, cols: null, stages: null }

  // Na barra fechada, as etapas dentro do servidor seguem a regra das colunas do aberto: até o veredito, as
  // fatias do envio anterior desta rota, ou iguais; as larguras novas diriam quais etapas rodaram (D29).
  function heldStageShares (record, n) {
    const memo = barMemo.stages
    if (memo && memo.key === core.recordKey(record) && memo.shares.length === n) return memo.shares
    return Array(n).fill(1 / n)
  }

  // As fatias guardadas na largura de agora: nenhuma etapa abaixo do mínimo, e a soma enche o servidor.
  function heldStageWidths (shares, space, min) {
    const low = shares.map(share => share * space < min)
    const pinned = low.filter(Boolean).length * min
    const rest = shares.reduce((total, share, index) => total + (low[index] ? 0 : share), 0) || 1
    return shares.map((share, index) => low[index] ? min : share / rest * (space - pinned))
  }

  // As colunas guardadas valem só para a mesma rota (as etapas são outras em outra rota); sem elas, todas as
  // etapas com a mesma largura, e a da Resposta fixa como sempre.
  function heldColumns (record, n) {
    const memo = barMemo.cols
    if (memo && memo.key === core.recordKey(record) && memo.n === n) return memo.columns
    return Array(n).fill('1fr').concat(core.flowColumns({ stages: [] })).join(' ')
  }

  // As etapas que já terminaram na câmera lenta (✓, ✗ ou ignorada). As que não executaram só se resolvem no
  // veredito: antes dele, a coluna estreita delas diria onde o envio vai parar (D29).
  const STAGE_DONE = ['ok', 'fail', 'skip']

  function stagesDone () {
    return flow.rows.map(row => STAGE_DONE.includes(row.state))
  }

  // As larguras do conjunto quando só parte das etapas terminou. As que faltam ficam com a largura guardada; as
  // que terminaram dividem o resto na proporção das larguras finais delas, nunca abaixo do mínimo. A largura
  // final de cada uma, sozinha, diria quanto as outras vão ocupar (uma etapa que não vai rodar fica estreita):
  // a proporção entre as que já terminaram só usa os tempos delas (D29). A soma é sempre a do todo, e cada uma
  // chega à largura final no veredito.
  function mixWidths (held, final, done, min) {
    const space = held.reduce((total, width, index) => total + (done[index] ? width : 0), 0)
    const ready = final.filter((width, index) => done[index])
    const sum = ready.reduce((total, width) => total + width, 0) || 1
    const shared = heldStageWidths(ready.map(width => width / sum), space, min)
    let next = 0
    return held.map((width, index) => done[index] ? shared[next++] : width)
  }

  // As colunas de uma regra na largura do resumo, medidas numa grade escondida igual a ele: medir no próprio
  // resumo dispararia a transição.
  function measureColumns (summary, rule) {
    const probe = el('div', { class: 'wf-probe', 'aria-hidden': 'true' }, Array.from(summary.children).map(() => el('span')))
    probe.style.width = summary.clientWidth + 'px'
    probe.style.gridTemplateColumns = rule
    summary.parentNode.append(probe)
    const widths = getComputedStyle(probe).gridTemplateColumns.split(' ').map(parseFloat)
    probe.remove()
    return widths
  }

  function visibleSummary () {
    const summary = $('flow-body').querySelector('.wf-summary')
    return summary && summary.getClientRects().length ? summary : null
  }

  // A transição só existe entre listas em px com o mesmo número de colunas. O resumo, as linhas das etapas e as
  // linhas das colunas herdam a mesma variável e andam juntos.
  function moveColumns (widths) {
    const body = $('flow-body')
    body.classList.add('wf-morph')
    body.style.setProperty('--wf-cols', widths.map(width => width.toFixed(2) + 'px').join(' '))
  }

  // Na câmera lenta, cada etapa que termina leva a coluna dela à largura final, e as que faltam dividem o resto
  // com as fatias guardadas; a da Resposta é fixa. Fechado com a barra da requisição inteira, o mesmo vale para
  // as etapas dentro do servidor (sizeOneBar).
  function stepColumns () {
    const done = stagesDone()
    const key = done.join()
    if (key === flow.doneKey) return
    flow.doneKey = key
    const summary = visibleSummary()
    if (flow.holdCols && summary) moveColumns(mixWidths(measureColumns(summary, flow.holdCols), measureColumns(summary, flow.columns), done.concat(false), STAGE_MIN_PX))
    if (flow.holdStages && flow.one && flow.one.getClientRects().length) {
      flow.one.classList.add('bar-morph')
      sizeOneBar()
    }
  }

  // No veredito, as colunas andam de onde estão até as finais; no fim volta a regra em fr, que segue a largura
  // da zona.
  function releaseColumns () {
    if (!flow.holdCols) return
    const body = $('flow-body')
    const final = flow.columns
    const summary = visibleSummary()
    flow.holdCols = null
    barMemo.cols = { key: core.recordKey(flow.record), n: flow.model.stages.length, columns: final }
    if (!summary) {
      body.classList.remove('wf-morph')
      body.style.setProperty('--wf-cols', final)
      return
    }
    const from = getComputedStyle(summary).gridTemplateColumns
    const to = measureColumns(summary, final)
    body.style.setProperty('--wf-cols', from)
    summary.getBoundingClientRect()
    moveColumns(to)
    const run = flow.run
    afterTransitions(body.querySelector('.wf'), () => {
      if (run !== flow.run) return
      body.classList.remove('wf-morph')
      body.style.setProperty('--wf-cols', final)
    })
  }

  // As partes e os números das barras do Fluxo, cada um com uma chave que vale entre dois envios: a mesma
  // parte da barra fechada, da barra de tempo e das etapas dentro do servidor, e o número de cada tempo.
  const PAINT_PARTS = [
    ['#flow-body > .fc-one .fc-onet', node => 'one:' + node.getAttribute('data-tpart'), node => node.firstChild],
    ['#flow-body > .fc-one .fc-ostage', node => 'stage:' + node.getAttribute('data-cell'), node => node.firstChild],
    ['#flow-body > .tl .tl-bar > .tl-seg', node => 'tl:' + node.getAttribute('data-part'), node => node]
  ]
  const PAINT_NUMBERS = [
    ['#flow-body > .tl .tl-call', node => 'num:' + node.getAttribute('data-part')],
    ['#flow-body > .tl .tl-dim-label', node => 'num:' + node.getAttribute('data-part')],
    ['#flow-body > .fc-one .fc-bracket-label', () => 'num:c3'],
    ['#flow-body > .flow-mini-time', () => 'num:mini']
  ]

  // A cor de cada parte à vista (a do preenchimento, numa etapa cheia) e o número de cada tempo.
  function previousPaint () {
    const paint = { colors: {}, numbers: {} }
    PAINT_PARTS.forEach(([selector, key, colored]) => document.querySelectorAll(selector).forEach(node => {
      if (!node.getClientRects().length) return
      const target = colored(node)
      const fill = target.querySelector && target.querySelector('.flow-fill')
      paint.colors[key(node)] = getComputedStyle(fill || target).backgroundColor
    }))
    PAINT_NUMBERS.forEach(([selector, key]) => document.querySelectorAll(selector).forEach(node => {
      const real = node.querySelector('.num-real')
      if (real && node.getClientRects().length) paint.numbers[key(node)] = real.textContent
    }))
    return paint
  }

  // No começo da câmera lenta, as barras novas têm a geometria das anteriores e partem do desenho delas, nos
  // mesmos nós: cada parte vai da cor anterior à neutra, e cada número anterior some enquanto o esqueleto
  // aparece; nunca há uma segunda barra nem um segundo rótulo. O número novo volta ao lugar, escondido, quando
  // o anterior acaba de sumir (D29).
  function fadeFromPrevious () {
    const paint = flow.previous
    flow.previous = null
    if (!paint || !motionOk()) return
    PAINT_PARTS.forEach(([selector, key, colored]) => document.querySelectorAll(selector).forEach(node => {
      const from = paint.colors[key(node)]
      if (from && node.getClientRects().length) colored(node).animate([{ backgroundColor: from }, {}], { duration: 200, easing: 'ease-out' })
    }))
    PAINT_NUMBERS.forEach(([selector, key]) => document.querySelectorAll(selector).forEach(node => {
      const real = node.querySelector('.num-real')
      const old = paint.numbers[key(node)]
      if (!real || old === undefined || !node.getClientRects().length) return
      real.dataset.fresh = real.textContent
      real.textContent = old
      const out = real.animate([{ opacity: 1, visibility: 'visible' }, { opacity: 0, visibility: 'visible' }], { duration: SWAP_FADE_MS, easing: 'ease-out' })
      out.onfinish = out.oncancel = () => restoreNumber(real)
      fadeIn(real.parentNode.querySelector('.num-skel'))
    }))
  }

  function restoreNumber (real) {
    if (real.dataset.fresh === undefined) return
    real.textContent = real.dataset.fresh
    delete real.dataset.fresh
  }

  // Quando as transições do nó acabam (ou são canceladas): tira a classe que as liga, ou chama a função.
  function afterTransitions (node, done) {
    const anims = node.getAnimations ? node.getAnimations({ subtree: true }).filter(anim => anim.transitionProperty) : []
    Promise.allSettled(anims.map(anim => anim.finished)).then(typeof done === 'function' ? done : () => node.classList.remove(done))
  }

  // No veredito: solta as barras presas na geometria anterior e as partes andam até as larguras novas.
  function releaseBars () {
    // Um número anterior que ainda sumia dá lugar ao novo antes de qualquer coisa aparecer.
    $('flow-body').querySelectorAll('.num-real').forEach(real => {
      real.getAnimations().forEach(anim => anim.cancel())
      restoreNumber(real)
    })
    releaseColumns()
    if ((flow.holdOne || flow.holdStages) && flow.one) {
      const box = flow.one
      flow.holdOne = null
      flow.holdStages = null
      // O navegador precisa ver as larguras antigas antes das novas, ou não há de onde a transição partir.
      box.firstChild.getBoundingClientRect()
      box.classList.add('bar-morph')
      sizeOneBar()
      afterTransitions(box, 'bar-morph')
    }
    flow.holdOne = null
    flow.holdStages = null
    const fig = time.fig
    if (fig && (time.hold || fig.classList.contains('tl-hold'))) {
      // Os rótulos saem dos pesos (segmentBoxes), não da medida: o desenho preso é visto uma vez, a transição
      // liga, e o final entra; partes, rótulos, marcas e cotas andam juntos para o mesmo lugar.
      fig.getBoundingClientRect()
      fig.classList.add('tl-morph')
      fig.classList.remove('tl-hold')
      fig.querySelector('.tl-draw').inert = false
      time.hold = null
      layoutTime(fig)
      afterTransitions(fig, 'tl-morph')
    }
    time.hold = null
  }

  const STAGE_MIN_PX = 22

  function oneBar (bar) {
    const part = name => el('span', { class: 'fc-oi fc-onet ' + TIME_KIND[name], 'data-tpart': name }, el('span', { class: 'fc-ns' }))
    // As colunas das etapas dentro do servidor saem em px de sizeOneBar (core.stageWidths).
    const server = el('span', { class: 'fc-srv' })
    flow.rows.forEach((row, index) => {
      row.oneSeg = el('span', { class: 'flow-seg' })
      server.append(el('span', { class: 'fc-oi fc-ostage', 'data-cell': String(index) }, row.oneSeg))
    })
    const line = el('div', { class: 'fc-one-bar' }, ONE_PARTS.before.map(part), server, ONE_PARTS.after.map(part))
    const label = el('span', { class: 'fc-bracket-label' }, timeName('server', bar) + ' ',
      el('b', { class: 'fc-bracket-time' }, timeNumber(core.timeLabels(bar, language).server)))
    const box = el('div', { class: 'fc-one' }, line, el('div', { class: 'fc-bracket', 'aria-hidden': 'true' }, el('span', { class: 'fc-bracket-line' }), label))
    line.querySelectorAll('.fc-oi').forEach((node, index) => node.addEventListener('click', () => pickItem(index)))
    return box
  }

  // A marca do servidor desenhado maior: discreta, no canto direito da linha de leitura. O mouse e o foco do
  // teclado mostram a explicação, que o leitor de tela ouve pela descrição.
  function scaleMark () {
    return el('button', { type: 'button', class: 'fc-scale', id: 'fc-scale', 'aria-describedby': 'fc-scale-desc', 'data-tip': t('lab.flow.read.widened') },
      t('lab.time.adjusted_mark'),
      el('span', { class: 'sr-only', id: 'fc-scale-desc', text: t('lab.flow.read.widened') }))
  }

  function paintScaleMark () {
    const mark = $('fc-scale')
    if (mark) mark.classList.toggle('is-on', flow.active >= flow.end && !!flow.oneWidened)
  }

  // As larguras da barra da requisição seguem a escala da barra de tempo (core.timeWeights, cada parte com
  // pelo menos core.TIME_MIN_SHARE da barra). O servidor precisa de STAGE_MIN_PX por etapa; quando a escala lhe dá menos, ele
  // cresce, as outras partes dividem o resto na proporção delas, e a chave diz que saiu de escala.
  let oneObserver = null
  function watchOneBar () {
    if (window.ResizeObserver) {
      if (!oneObserver) oneObserver = new ResizeObserver(() => sizeOneBar())
      oneObserver.disconnect()
      oneObserver.observe(flow.bar)
    }
    sizeOneBar()
  }

  function sizeOneBar () {
    const box = flow.one
    if (!box || !box.isConnected) return
    const line = box.firstChild
    const width = line.clientWidth
    if (!width) return
    const bar = flow.timeBar
    const n = flow.model.stages.length
    const avail = width - 4 * 2
    const weights = core.timeWeights(bar, core.TIME_MIN_SHARE)
    const w = { conn: weights.conn, outbound: weights.half, server: weights.server, inbound: weights.half, down: weights.down }
    const sum = Object.values(w).reduce((total, value) => total + value, 0) || 1
    const px = {}
    Object.keys(w).forEach(name => { px[name] = w[name] / sum * avail })
    const need = n * STAGE_MIN_PX + (n - 1) * 2
    // Quando o servidor cresce além da escala para as etapas caberem, a marca "escala ajustada" aparece no canto
    // direito da linha de leitura; só no veredito, porque diz algo do tempo novo (D29).
    flow.oneWidened = px.server < need
    if (px.server < need) {
      const rest = (sum - w.server) || 1
      px.server = need
      ONE_PARTS.before.concat(ONE_PARTS.after).forEach(name => { px[name] = w[name] / rest * (avail - need) })
    }
    if (flow.holdOne && flow.holdOne.n === n) Object.keys(px).forEach(name => { px[name] = flow.holdOne[name] * avail })
    else if (!flow.holdOne) {
      barMemo.one = { n }
      Object.keys(px).forEach(name => { barMemo.one[name] = px[name] / avail })
    }
    line.querySelectorAll('.fc-onet').forEach(node => { node.style.flex = '0 0 ' + px[node.getAttribute('data-tpart')].toFixed(2) + 'px' })
    const server = line.querySelector('.fc-srv')
    server.style.flex = '0 0 ' + px.server.toFixed(2) + 'px'
    const space = px.server - (n - 1) * 2
    const finalWidths = core.stageWidths(flow.model.stages, space, STAGE_MIN_PX)
    const stageWidths = flow.holdStages ? mixWidths(heldStageWidths(flow.holdStages, space, STAGE_MIN_PX), finalWidths, stagesDone(), STAGE_MIN_PX) : finalWidths
    if (!flow.holdStages) barMemo.stages = { key: core.recordKey(flow.record), shares: stageWidths.map(width => width / space) }
    server.style.gridTemplateColumns = stageWidths.map(value => value.toFixed(2) + 'px').join(' ')
    const left = px.conn + px.outbound + 4
    const bracket = box.querySelector('.fc-bracket-line')
    bracket.style.left = left + 'px'
    bracket.style.width = px.server + 'px'
    const label = box.querySelector('.fc-bracket-label')
    const labelWidth = label.offsetWidth
    label.style.left = Math.max(0, Math.min(width - labelWidth, left + px.server / 2 - labelWidth / 2)) + 'px'
    paintScaleMark()
  }

  // Fechado, a barra é o caminho até as etapas (e, na da requisição inteira, até os balões do tempo): uma
  // parada do Tab só, as setas andam entre as partes e Enter abre o Fluxo naquela parte. A linha de leitura
  // mostra a parte sob o mouse ou com o foco, e fica nela enquanto o mouse estiver em qualquer ponto da barra,
  // vãos entre as partes incluídos: ela passa de uma parte direto para a outra. Só volta à frase de como usar
  // a barra quando o mouse e o foco saem da barra inteira, depois de 150 ms (sair e voltar logo não pisca).
  const READ_SETTLE_MS = 150

  function wireBar (bar) {
    const indexOf = target => {
      const node = target && target.closest ? target.closest('.wf-cell, .fc-oi') : null
      return node ? flow.items.findIndex(item => item.node === node) : -1
    }
    bar.addEventListener('mouseover', event => {
      flow.barHover = true
      clearTimeout(flow.readTimer)
      const index = indexOf(event.target)
      if (index !== -1) showRead(index)
    })
    bar.addEventListener('mouseleave', () => {
      flow.barHover = false
      settleRead()
    })
    bar.addEventListener('focusin', event => {
      const index = indexOf(event.target)
      if (state.flowOpen || index === -1) return
      clearTimeout(flow.readTimer)
      flow.barFocus = index
      flow.readAt = index
      paintBar()
    })
    bar.addEventListener('focusout', event => { if (!bar.contains(event.relatedTarget)) settleRead() })
    const moves = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    bar.addEventListener('keydown', event => {
      const index = flow.items.findIndex(item => item.node === event.target)
      if (state.flowOpen || index === -1) return
      const last = flow.items.length - 1
      let next = null
      if (Object.prototype.hasOwnProperty.call(moves, event.key)) next = Math.max(0, Math.min(last, index + moves[event.key]))
      else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = last
      if (next !== null) {
        event.preventDefault()
        flow.barFocus = next
        paintBar()
        flow.items[next].node.focus()
        return
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        pickItem(index)
      }
    })
  }

  // O mouse e o foco saíram da barra: passados READ_SETTLE_MS sem voltarem, a linha mostra a parte com o foco
  // do teclado, se houver, ou a frase de como usar a barra.
  function settleRead () {
    clearTimeout(flow.readTimer)
    flow.readTimer = setTimeout(() => {
      if (flow.barHover) return
      const active = document.activeElement
      const index = flow.items.findIndex(item => item.node === active)
      showRead(index !== -1 && active.matches(':focus-visible') ? index : null)
    }, READ_SETTLE_MS)
  }

  // Uma parte da barra fechada escolhida (clique ou Enter): a etapa abre como em pickSegment; uma parte do
  // tempo abre o Fluxo com o balão dela na barra de tempo, só depois do veredito (antes ela não tem tempo).
  function pickItem (index) {
    const item = flow.items[index]
    if (!item) return
    if (item.kind === 'stage') {
      pickSegment(item.index)
      return
    }
    if (state.flowOpen || flow.active < flow.end || !time.fig) return
    const fromBar = flow.bar.contains(document.activeElement)
    setFlowOpen(true)
    layoutTime(time.fig)
    const button = time.fig.querySelector('.tl-seg[data-part="' + item.part + '"]')
    if (!button) return
    if (fromBar) button.focus({ preventScroll: true })
    if (time.current !== button) button.click()
  }

  // Um clique num segmento do resumo, ou uma etapa escolhida na barra fechada. Fechado, abre o Fluxo naquela
  // etapa, já com a linha dela aberta quando ela tem o que mostrar; o foco que estava na barra vai para essa
  // linha (ou para o título). Aberto, abre ou fecha a linha da etapa, e a parte da Resposta não faz nada.
  function pickSegment (index) {
    const item = flow.rows[index]
    if (state.flowOpen) {
      if (item && item.expandable) setExpanded(index, item.details.hidden)
      return
    }
    const fromBar = !!flow.bar && flow.bar.contains(document.activeElement)
    setFlowOpen(true)
    if (item && item.expandable) setExpanded(index, true)
    if (!fromBar) return
    const target = item && item.expandable ? item.row : $('flow-title')
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'nearest', behavior: state.reduced ? 'auto' : 'smooth' })
  }

  // Fechado, a barra deixa de ser só desenho: um toolbar em que cada parte é um botão com o nome acessível
  // do que a linha de leitura mostra. Aberto, a acessibilidade volta a ser a de sempre: a barra de "Todas as
  // etapas" fora da árvore, e as etapas nas linhas da cascata (a da requisição inteira nem aparece).
  function paintBar () {
    const bar = flow.bar
    if (!flow.model || !bar || !bar.isConnected) return
    const open = state.flowOpen
    const running = flow.active < flow.end
    // Até o veredito, os tempos dão lugar às barras do esqueleto e as partes da rede ficam vazias (D29). O
    // brilho segue o relógio do documento, como o da Resposta, e já nasce parado depois de uma espera real
    // de 5 s ou mais.
    if (!running) releaseBars()
    paintScaleMark()
    flow.barRunning = running
    $('flow-body').classList.toggle('is-running', running)
    $('flow-body').classList.toggle('skel-still', flow.record.ms >= COLD_AFTER * 1000)
    if (flow.one) {
      flow.one.classList.toggle('is-wait', running)
      flow.one.querySelectorAll('.fc-onet').forEach(node => node.classList.toggle('is-wait', running))
    } else if (open) {
      bar.parentNode.setAttribute('aria-hidden', 'true')
      bar.setAttribute('aria-hidden', 'true')
      bar.parentNode.firstChild.removeAttribute('aria-hidden')
    } else {
      bar.parentNode.removeAttribute('aria-hidden')
      bar.removeAttribute('aria-hidden')
      bar.parentNode.firstChild.setAttribute('aria-hidden', 'true')
    }
    if (open) {
      bar.removeAttribute('role')
      bar.removeAttribute('aria-label')
    } else {
      bar.setAttribute('role', 'toolbar')
      bar.setAttribute('aria-label', t(flow.one ? 'lab.flow.read.request_bar' : 'lab.flow.read.bar'))
    }
    const stop = barStop()
    flow.items.forEach((item, index) => {
      if (open) {
        ['role', 'tabindex', 'aria-label'].forEach(name => item.node.removeAttribute(name))
        return
      }
      item.node.setAttribute('role', 'button')
      item.node.setAttribute('tabindex', index === stop ? '0' : '-1')
      item.node.setAttribute('aria-label', itemInfo(index).spoken)
    })
    paintRead()
  }

  // A parada do Tab na barra fechada: a parte em que o teclado parou; senão, depois do veredito, a etapa que
  // parou, e antes dele a primeira parte (a parada não adianta onde o envio vai parar, D29).
  function barStop () {
    if (flow.barFocus !== null) return flow.barFocus
    if (flow.active < flow.end || flow.model.summary !== 'stopped') return 0
    const failed = flow.model.stages.findIndex(stage => stage.name === flow.model.failedStage && stage.st === 'failed')
    const index = flow.items.findIndex(item => item.kind === 'stage' && item.index === failed)
    return index === -1 ? 0 : index
  }

  const READ_WORDS = { ok: 'ui.flow.status.ok', fail: 'ui.flow.status.failed', skip: 'ui.flow.status_short.skipped', pending: 'ui.flow.pending', running: 'ui.flow.running' }

  function itemInfo (index) {
    const item = flow.items[index]
    return item.kind === 'time' ? timeInfo(item.part) : segmentInfo(item.index)
  }

  // O que uma parte da barra diz agora: o nome, a situação do momento (na câmera lenta, aguardando ou
  // executando; nada adianta como o envio termina, D29) e a duração, só de uma etapa que já terminou.
  // spoken é a mesma informação numa frase, para o nome acessível da parte.
  function segmentInfo (index) {
    const stages = flow.model.stages
    const stateName = stateAt(stages, index, flow.active)
    if (index >= stages.length) {
      const name = t('ui.response')
      if (stateName === 'done') return { name, state: stateName, word: statusLine(flow.record), spoken: name + ', ' + statusLine(flow.record), dur: '' }
      const word = stateName === 'running' ? capitalized(t('ui.flow.running')) : t('lab.flow.read.response_pending')
      return { name, state: stateName, word, spoken: name + ', ' + word.toLowerCase(), dur: '' }
    }
    const stage = stages[index]
    const name = stageName(stage)
    let word
    if (READ_WORDS[stateName]) word = capitalized(t(READ_WORDS[stateName]))
    else word = stage.statusKey ? t(stage.statusKey) : String(stage.st)
    const dur = (stateName === 'ok' || stateName === 'fail') && stage.dur !== undefined ? core.formatDuration(stage.dur, language) + ' ms' : ''
    const said = stateName === 'skip' ? t('ui.flow.status.skipped') : word
    return { name, state: stateName, word, spoken: name + ', ' + said.toLowerCase() + (dur ? ', ' + dur : ''), dur }
  }

  // Uma parte do tempo na barra da requisição inteira: o nome, o tempo e a fatia do total, só no veredito;
  // antes dele, que o tempo aparece no fim do fluxo.
  function timeInfo (part) {
    const bar = flow.timeBar
    const name = capitalized(timeName(part, bar))
    // A ida e a volta têm um nome curto, para a linha de leitura caber numa linha numa zona estreita.
    const short = SHORT_NAMES[part] ? capitalized(t(SHORT_NAMES[part])) : name
    if (flow.active < flow.end) {
      const later = t('lab.flow.read.time_later')
      return { time: true, part, name, short, wait: true, word: later, spoken: name + ', ' + later.toLowerCase() }
    }
    const value = timeValue(part, core.timeLabels(bar, language))
    const percent = core.formatShare(bar[TIME_AMOUNT[part]], bar.total, language)
    const share = percent ? fillText('lab.flow.read.share', { percent }) : ''
    return { time: true, part, name, short, value, share, spoken: name + ', ' + value + (percent ? ', ' + fillText('lab.time.share', { percent }) : '') }
  }

  const SHORT_NAMES = { outbound: 'lab.time.part.outbound_short', inbound: 'lab.time.part.inbound_short' }

  function showRead (index) {
    flow.readAt = state.flowOpen ? null : index
    paintRead()
  }

  // A linha de leitura sob a barra fechada. Parada, diz como usar a barra (no toque e numa zona estreita, o
  // CSS mostra a frase de tocar); com o mouse ou o foco do teclado numa parte, o que ela diz agora. Na troca
  // de uma parte para outra o texto novo aparece num esmaecer curto, sem movimento com menos movimento.
  function paintRead () {
    const text = flow.read && flow.read.firstChild
    if (!text || !flow.model) return
    const index = flow.readAt
    if (index === null) {
      const stopped = flow.active >= flow.end && flow.model.summary === 'stopped'
      const keys = flow.one ? ['lab.flow.read.time_hint', 'lab.flow.read.time_hint_stopped', 'lab.flow.read.time_hint_touch'] : ['lab.flow.read.hint', 'lab.flow.read.hint_stopped', 'lab.flow.read.hint_touch']
      text.className = 'fc-read-text'
      text.replaceChildren(el('span', { class: 'fc-hint', text: t(stopped ? keys[1] : keys[0]) }), el('span', { class: 'fc-hint-touch', text: t(keys[2]) }))
    } else {
      const info = itemInfo(index)
      if (info.time) {
        text.className = 'fc-read-text is-time'
        text.replaceChildren(...[el('span', { class: 'fc-swatch ' + TIME_KIND[info.part] + (info.wait ? ' is-wait' : '') }), el('span', { class: 'fc-name' }, el('span', { class: 'fc-long', text: info.name }), el('span', { class: 'fc-short', text: info.short })),
          info.wait ? el('span', { class: 'fc-word', text: info.word }) : el('span', { class: 'fc-dur', text: info.value }),
          info.share ? el('span', { class: 'fc-share', text: info.share }) : null].filter(Boolean))
      } else {
        text.className = 'fc-read-text is-stage fc-' + info.state
        text.replaceChildren(...[el('span', { class: 'fc-name', text: info.name }), info.state === 'done' ? markEl('→') : stageMark(info.state),
          el('span', { class: 'fc-word', text: info.word }), info.dur ? el('span', { class: 'fc-dur', text: info.dur }) : null].filter(Boolean))
      }
    }
    if (flow.readShown !== index && text.animate && !prefersReducedMotion()) {
      text.getAnimations().forEach(animation => animation.cancel())
      text.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 110, easing: 'ease-out' })
    }
    flow.readShown = index
  }

  // A linha de leitura guarda desde o começo a altura do texto mais longo que ela pode mostrar, numa cópia
  // invisível (o CSS lê data-reserve, ou data-reserve-touch no toque): nada abaixo dela anda quando o mouse
  // passa pela barra. Cada etapa entra com a situação mais longa de todas, e a Resposta sem o status, para a
  // altura não adiantar como o envio termina (D29); as partes do tempo entram com o tempo e a fatia.
  function readReserve (read, stages) {
    const longest = list => list.reduce((a, b) => b.length > a.length ? b : a, '')
    const word = longest(['ui.flow.status.ok', 'ui.flow.status.failed', 'ui.flow.status_short.skipped', 'ui.flow.status.not_run', 'ui.flow.pending', 'ui.flow.running'].map(t))
    const dur = core.formatDuration(999.99, language) + ' ms'
    let lines = stages.map(stage => stageName(stage) + '  ' + word + '  ' + dur)
    if (flow.one) {
      const bar = flow.timeBar
      const labels = core.timeLabels(bar, language)
      // Na zona estreita (data-reserve-touch) a ida e a volta usam o nome curto, como a linha de leitura.
      const timeLines = short => ONE_PARTS.before.concat(ONE_PARTS.after).map(part => '■ ' + (short && SHORT_NAMES[part] ? t(SHORT_NAMES[part]) : timeName(part, bar)) + '  ' +
        longest([t('lab.flow.read.time_later'), timeValue(part, labels) + '  ' + fillText('lab.flow.read.share', { percent: '100,0%' })]))
      const hints = ['lab.flow.read.time_hint', 'lab.flow.read.time_hint_stopped', 'lab.flow.read.time_hint_touch']
      read.setAttribute('data-reserve', longest(lines.concat(timeLines(false), t(hints[0]), t(hints[1]))))
      read.setAttribute('data-reserve-touch', longest(lines.concat(timeLines(true), t(hints[2]))))
      return
    }
    lines = lines.concat(t('ui.response') + '  ' + longest([t('lab.flow.read.response_pending'), t('ui.flow.running')]))
    read.setAttribute('data-reserve', longest(lines.concat(t('lab.flow.read.hint'), t('lab.flow.read.hint_stopped'))))
    read.setAttribute('data-reserve-touch', longest(lines.concat(t('lab.flow.read.hint_touch'))))
  }

  // A linha da etapa e o que ela abre seguem o estado da etapa. Aguardando ou executando: só a descrição
  // geral, a mesma em todo envio (o servidor só lista as regras quando a etapa delas roda, então a lista já
  // diria que as etapas anteriores passaram). No estado final: as regras com as marcas e, na etapa que parou,
  // Por que parou aqui e Como seguir (a descrição geral sai para caber). Uma linha sem descrição só vira
  // botão no fim, para a seta não adiantar que ali haverá algo a ler.
  function paintStageDetails (row, index, finished) {
    const expandable = finished ? row.opensFinal : row.opensEarly
    if (expandable !== row.expandable) {
      row.expandable = expandable
      const next = expandable
        ? el('button', { type: 'button', class: 'flow-row', 'aria-expanded': 'false', 'aria-controls': row.details.id, onclick: () => setExpanded(index, row.details.hidden) })
        : el('div', { class: 'flow-row' })
      row.row.replaceWith(next)
      row.row = next
    }
    const filled = finished ? 'final' : 'early'
    if (!row.details || row.filled === filled) return
    row.filled = filled
    const stage = row.stage
    const model = flow.model
    const explains = finished && row.isFailed && !!model.whyKey
    row.details.replaceChildren(...[
      stage.descriptionKey && !explains ? el('p', { class: 'flow-description', text: t(stage.descriptionKey) }) : null,
      finished && stage.rules.length ? el('ul', { class: 'flow-rules' }, stage.rules.map(ruleRow)) : null,
      finished && stage.st === 'skipped' ? skipBlock(stage) : null,
      explains ? textBlock('ui.flow.why_title', model.whyKey, 'flow-why') : null,
      finished && row.isFailed && model.howKey ? textBlock('ui.flow.how_title', model.howKey, 'flow-how') : null
    ].filter(Boolean))
  }

  // O nome guarda o lugar da versão em negrito (o CSS lê data-text e põe a cópia invisível na mesma célula),
  // então a linha não muda de altura quando o nome passa a negrito.
  function boldReserved (node) {
    const text = node.textContent
    node.setAttribute('data-text', text)
    node.replaceChildren(el('span', { class: 'flow-name-text', text }))
    return node
  }

  // A dica sob a cascata. No veredito de uma etapa que parou ela diz onde estão "Por que parou aqui" e "Como
  // seguir" (a etapa fica fechada). O lugar da frase mais longa possível (com o nome de etapa mais longo)
  // fica guardado desde o começo numa cópia invisível na mesma célula: a dica não muda de altura no
  // veredito, e a cópia é a mesma em todo envio, então não diz como ele termina (D29).
  function flowHint () {
    const labels = Object.keys(texts).filter(key => key.indexOf('ui.flow.stage_label.') === 0).map(t)
    const longest = labels.reduce((a, b) => b.length > a.length ? b : a, '')
    return el('p', { class: 'flow-hint stages-hint', 'data-reserve': fillText('lab.flow.hint_stopped', { stage: longest }) },
      el('span', { class: 'flow-hint-text', text: t('lab.flow.hint') }))
  }

  // A seta ocupa sempre o mesmo lugar, para o texto da coluna final alinhar em todas as linhas.
  function endColumn (right, expandable) {
    return el('span', { class: 'flow-end' }, right, expandable ? icon('i-seta', 'flow-caret') : el('span', { class: 'flow-caret', 'aria-hidden': 'true' }))
  }

  // Os segmentos de uma etapa: o da linha, o de "Todas as etapas" e, com a barra da requisição inteira, o dela.
  function segsOf (row) {
    return [row.seg, row.summarySeg, row.oneSeg].filter(Boolean)
  }

  function fillBoth (row, stateName, delay) {
    segsOf(row).forEach(seg => {
      const fill = fillEl(stateName, delay)
      seg.replaceChildren(...(fill ? [fill] : []))
    })
  }

  // O bloco inteiro da etapa (a linha e a explicação aberta) liga ao seu segmento no resumo: passar o
  // mouse ou levar o foco do teclado para dentro dele contorna o segmento; passar o mouse no segmento contorna
  // o bloco. O foco de um clique não conta: a linha clicada segue focada, e o contorno ficaria preso depois
  // que o mouse sai.
  function linkSummary (block, cell, summarySeg) {
    const on = () => { block.classList.add('linked'); summarySeg.classList.add('linked') }
    const off = () => { block.classList.remove('linked'); summarySeg.classList.remove('linked') }
    const keyboardFocusInside = () => block.contains(document.activeElement) && document.activeElement.matches(':focus-visible')
    cell.addEventListener('mouseenter', on)
    cell.addEventListener('mouseleave', off)
    block.addEventListener('mouseenter', () => summarySeg.classList.add('linked'))
    block.addEventListener('mouseleave', () => { if (!keyboardFocusInside()) summarySeg.classList.remove('linked') })
    block.addEventListener('focusin', event => { if (event.target.matches(':focus-visible')) summarySeg.classList.add('linked') })
    block.addEventListener('focusout', event => { if (!block.contains(event.relatedTarget)) summarySeg.classList.remove('linked') })
  }

  function setExpanded (index, open) {
    const row = flow.rows[index]
    if (!row || !row.details) return
    row.details.hidden = !open
    row.row.setAttribute('aria-expanded', open ? 'true' : 'false')
  }

  // Na etapa Validação dos dados que parou, quando o corpo da resposta aponta um campo do schema da rota
  // mostrada, "Como seguir" manda comparar com o schema e ganha o botão que leva até a linha do campo. O
  // texto ui.flow.* não muda: a troca é só aqui, no lugar do parágrafo.
  function paintSchemaLink (index) {
    const row = flow.rows[index]
    const record = flow.record
    if (!row || !row.details || !row.isFailed || row.stage.name !== 'schema') return
    if (!record || !state.selected || core.recordKey(record) !== state.selected.key || !bodySchema(state.selected)) return
    if (!schemaTarget(record)) return
    const how = row.details.querySelector('.flow-how')
    if (!how) return
    how.querySelector('p').textContent = t('lab.flow.how.schema')
    how.append(el('button', { type: 'button', class: 'link-btn flow-schema-go', id: 'flow-schema-go', text: t('lab.schema.go'), onclick: () => goToSchema(record) }))
  }

  // animated: o fluxo chegou ao veredito andando em câmera lenta (não por um atalho para o fim).
  function finishFlow (animated) {
    const model = flow.model
    const summary = flow.summaryEl
    const record = flow.record
    summary.textContent = ''
    summary.className = 'flow-summary ' + model.summary
    summary.setAttribute('data-verdict', model.summary)
    let spoken
    if (model.summary === 'stopped') {
      const index = model.stages.findIndex(stage => stage.name === model.failedStage && stage.st === 'failed')
      const stage = model.stages[index]
      summary.setAttribute('data-stage', stage.name)
      summary.append(el('span', { text: t('ui.flow.stopped_at') }), codeOrLabel(stage.labelKey, stage.name, 'flow-summary-stage'))
      spoken = fillText('lab.announce.stopped', { status: statusLine(record), stage: stageName(stage) })
      if (flow.hintEl && index !== -1) flow.hintEl.firstChild.textContent = fillText('lab.flow.hint_stopped', { stage: stageName(stage) })
      // A etapa que parou fica fechada (com o ✗, "Parou aqui" e a seta); a pessoa a abre com um clique ou
      // Enter. Nada se move na Resposta e em Foi enviado no veredito.
      paintSchemaLink(index)
    } else if (model.summary === 'outside') {
      summary.append(el('span', { text: t('ui.flow.outside') }))
      flow.outsideEl.hidden = false
      flow.outsideEl.replaceChildren(el('span', { text: t(model.whyKey) }), el('span', { text: t(model.howKey) }))
      spoken = fillText('lab.announce.outside', { status: statusLine(record) })
    } else {
      summary.append(el('span', { text: t('ui.flow.completed') }))
      spoken = fillText('lab.announce.completed', { status: statusLine(record) })
    }
    setReplayReady(true)
    if (animated) fadeIn(summary)
    flowAnnounce(spoken)
  }

  // "Rever em câmera lenta" é o único controle da faixa do Fluxo: fica disponível a partir do veredito de todo
  // envio e sempre redesenha o fluxo em câmera lenta, qualquer que tenha sido o modo do envio. "Menos
  // movimento" ligado ou desligado com a página aberta vale na hora: ligado no meio da câmera lenta, o fluxo
  // vai direto ao veredito, e o segmento do modo some ou volta junto.
  function setupFlowControls () {
    $('flow-title').replaceChildren(icon('i-seta', 'flow-toggle-ico'), el('span', { class: 'flow-toggle-text', text: t('ui.flow.title') }))
    $('flow-title').addEventListener('click', () => setFlowOpen(!state.flowOpen))
    setFlowOpen(readLocal(FLOW_OPEN_KEY) !== 'false', false)
    $('replay').replaceChildren(icon('i-snail'), t('lab.flow.replay'))
    if (state.reduced) $('flow-controls').hidden = true
    try {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
        state.reduced = event.matches
        $('flow-controls').hidden = state.reduced
        paintRunMode()
        if (state.reduced) finishFlowNow()
      })
    } catch (e) {}
    $('replay').addEventListener('click', () => {
      if ($('replay').getAttribute('aria-disabled') === 'true') return
      if (!state.flowOpen) setFlowOpen(true)
      if (flow.record) renderFlow(flow.record, flow.live, !state.reduced)
    })
  }

  // O Fluxo fechado mostra o veredito com o tempo total, a barra da requisição inteira (ou a de "Todas as
  // etapas", sem as fases do tempo) e a linha de leitura dela; o status sai do cabeçalho do Resultado e fica
  // só na Resposta (CSS). O resto volta ao abrir. A escolha fica guardada neste navegador e nunca muda
  // sozinha: só o título, uma parte da barra e "Rever em câmera lenta" (que abre) a trocam.
  function setFlowOpen (open, save = true) {
    // O que aparece só no estado novo (as etapas, a barra de tempo, as dicas) surge e fica cortado pela altura
    // que anda; o que existe nos dois estados (o veredito, o tempo total) não pisca nem se move.
    const animate = save && open !== state.flowOpen
    const shownParts = () => flowParts().filter(node => node.getClientRects().length)
    const before = animate ? new Set(shownParts()) : null
    if (animate) smoothSwap($('flow'), false)
    state.flowOpen = open
    $('flow').classList.toggle('is-collapsed', !open)
    $('flow-title').setAttribute('aria-expanded', open ? 'true' : 'false')
    if (!open) closeTimePop(false)
    if (save) writeLocal(FLOW_OPEN_KEY, open ? 'true' : 'false')
    clearTimeout(flow.readTimer)
    flow.readAt = null
    flow.barFocus = null
    paintBar()
    if (animate) shownParts().filter(node => !before.has(node)).forEach(node => fadeIn(node))
  }

  // As partes do Fluxo que só um dos estados mostra. O veredito, o tempo total e as barras ficam de fora: eles
  // existem aberto e fechado, e um fade neles faria o texto piscar.
  const FLOW_PARTS = '#flow-body > .flow-hint, #flow-body > .wf > .flow-stages, #flow-body > .wf > .wf-lines, #flow-body > .tl, #flow-body > .fc-read, #flow-body > .fc-read-row'

  function flowParts () {
    return Array.from(document.querySelectorAll(FLOW_PARTS))
  }

  // O botão de rever a animação nunca fica desabilitado de verdade: com aria-disabled ele mantém o foco, o
  // leitor de tela diz que está indisponível e o clique é ignorado até o fluxo chegar ao veredito.
  function setReplayReady (ready) {
    if (ready) $('replay').removeAttribute('aria-disabled')
    else $('replay').setAttribute('aria-disabled', 'true')
  }

  /* ---------- Tempo da requisição ---------- */

  // A barra sob o fluxo, em escala, com as partes da aba Timing do DevTools: conexão, ida até o servidor,
  // servidor (a soma das etapas, no verde de "Todas as etapas"), volta ao navegador e download, com o TTFB e
  // o total marcados embaixo. Cada parte e cada marca abre um balão que diz o que ela mede.

  const time = { fig: null, pop: null, current: null, observer: null, onServerPop: null, front: new Map(), hold: null }

  // Partes da barra de tempo em primeiro plano. Cada motivo (balão aberto, mouse ou foco do teclado na cota do
  // TTFB) liga um conjunto de partes; enquanto algum estiver ligado, as outras partes
  // vão para o segundo plano. O TTFB liga ida, servidor e volta juntas, porque é a soma das três.
  const TIME_FRONT_PARTS = { conn: ['conn'], outbound: ['outbound'], server: ['server'], inbound: ['inbound'], down: ['down'], ttfb: ['outbound', 'server', 'inbound'] }

  function setTimeFront (reason, parts) {
    if (!time.fig) return
    if (parts && parts.length) time.front.set(reason, parts)
    else time.front.delete(reason)
    const lit = new Set([].concat(...time.front.values()))
    time.fig.classList.toggle('tl-focus', lit.size > 0)
    time.fig.querySelectorAll('.tl-seg').forEach(seg => seg.classList.toggle('tl-front', lit.has(seg.getAttribute('data-part'))))
  }

  const TIME_NAMES = {
    outbound: 'lab.time.part.outbound',
    server: 'lab.time.part.server',
    inbound: 'lab.time.part.inbound',
    down: 'lab.time.part.down',
    ttfb: 'lab.time.part.ttfb',
    total: 'lab.time.part.total'
  }

  // O que cada balão diz: o que a parte é, o que a faz crescer, a nota da ida e da volta (o navegador só
  // mede a soma das duas), o que fazer com ela num teste e o link de referência.

  const TIME_POPS = {
    conn: { note: 'lab.time.conn.how', tip: 'lab.time.conn.tip', links: [{ key: 'connection', text: 'lab.time.conn.link_mdn' }, { key: 'overview', text: 'lab.time.conn.link_http' }, { key: 'conn', text: 'lab.time.conn.link' }] },
    outbound: { body: ['lab.time.outbound.body'], note: 'lab.time.outbound.note', tip: 'lab.time.outbound.tip', link: 'lab.time.link_mdn', linkName: 'Round Trip Time (RTT)' },
    server: { body: ['lab.time.server.body', 'lab.time.server.grows'], tip: 'lab.time.server.tip', link: 'lab.time.server.link' },
    inbound: { body: ['lab.time.inbound.body'], tip: 'lab.time.inbound.tip', link: 'lab.time.inbound.link' },
    down: { body: ['lab.time.down.body', 'lab.time.down.grows'], tip: 'lab.time.down.tip', links: [{ key: 'encoding', text: 'lab.time.down.link' }] },
    ttfb: { body: ['lab.time.ttfb.body', 'lab.time.ttfb.reference'], note: 'lab.time.ttfb.note', tip: 'lab.time.ttfb.tip', links: [{ key: 'ttfb', text: 'lab.time.link_mdn', name: 'Time to First Byte (TTFB)' }, { key: 'webdev_ttfb', text: 'lab.time.ttfb.link_webdev' }] },
    total: { body: ['lab.time.total.body', 'lab.time.total.curl'], note: 'lab.time.caption', tip: 'lab.time.total.tip', links: [{ key: 'total', text: 'lab.time.link_mdn', name: 'Resource Timing' }, { key: 'curl', text: 'lab.time.total.curl_link' }] }
  }

  function capitalized (text) {
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  function num (text) {
    return el('span', { class: 'num', text })
  }

  // O nome de cada parte como aparece sobre e sob a barra; o balão usa o mesmo, com maiúscula.
  function timeName (part, bar) {
    if (part === 'conn') return t(bar.connNew ? 'lab.time.part.conn_new' : 'lab.time.part.conn')
    return t(TIME_NAMES[part])
  }

  // A fatia de uma parte no tempo total, só no balão da parte: o número ("47,9% do tempo total") e uma
  // barrinha na cor da parte, cheia até essa fatia. O total é a conta inteira e não leva fatia.
  const TIME_AMOUNT = { conn: 'conn', outbound: 'half', server: 'server', inbound: 'half', down: 'down', ttfb: 'ttfb' }
  const TIME_KIND = { conn: 'conn', outbound: 'net', server: 'server', inbound: 'net', down: 'down', ttfb: 'ttfb' }

  function timeShareNodes (part, bar) {
    const amount = bar[TIME_AMOUNT[part]]
    const share = TIME_AMOUNT[part] ? core.formatShare(amount, bar.total, language) : null
    if (!share) return []
    const fill = el('span', { class: 'fill ' + TIME_KIND[part] })
    fill.style.width = Math.min(100, amount / bar.total * 100).toFixed(2) + '%'
    return [
      el('span', { class: 'tl-pop-pct' }, parts('lab.time.share', { percent: el('b', { text: share }) })),
      el('span', { class: 'tl-pop-meter', 'aria-hidden': 'true' }, fill)
    ]
  }

  // A ida e a volta são metades estimadas da rede: o número delas vem com "cerca de".
  // Um tempo com o número trocável: até o veredito, só o número dá lugar a uma barra do esqueleto de largura
  // fixa, e o nome e "ms" continuam escritos (D29). Os dois ficam na mesma célula, de largura fixa, e se cruzam
  // no veredito (CSS); a largura do rótulo não muda na troca.
  function timeNumber (text) {
    const number = text.replace(/ ms$/, '')
    return [el('span', { class: 'num-slot' }, el('span', { class: 'num-real', text: number }), el('span', { class: 'skel-bar num-skel', 'aria-hidden': 'true' })),
      number === text ? '' : ' ms']
  }

  function timeValue (part, labels) {
    const value = { conn: labels.conn, outbound: labels.half, server: labels.server, inbound: labels.half, down: labels.down, ttfb: labels.ttfb, total: labels.total }[part]
    return part === 'outbound' || part === 'inbound' ? fillText('lab.time.about', { time: value }) : value
  }

  // Sem as fases da Resource Timing, uma linha no lugar da barra: o total é o servidor mais a rede.
  function timeLine (total, server) {
    const labels = core.timeLabels(core.timeFallback(total, server), language)
    return el('p', { class: 'flow-times' }, parts('lab.time.fallback', {
      total: el('b', { class: 'total', text: labels.total }),
      server: el('b', { text: labels.server }),
      net: el('b', { text: labels.net })
    }))
  }

  function timeFigure (bar) {
    const labels = core.timeLabels(bar, language)
    const trigger = { 'aria-expanded': 'false', 'aria-controls': 'tl-pop' }
    // A largura começa na escala real; layoutTime a ajusta quando já sabe a largura da barra.
    const segs = [['conn', 'conn', bar.conn], ['outbound', 'net', bar.half], ['server', 'server', bar.server], ['inbound', 'net', bar.half], ['down', 'down', bar.down]].map(([part, kind, ms]) => {
      const button = el('button', { type: 'button', class: 'tl-seg ' + kind, 'data-part': part, 'data-ms': String(ms), 'aria-label': capitalized(timeName(part, bar)) + ', ' + timeValue(part, labels), ...trigger })
      button.style.setProperty('--g', ms.toFixed(3))
      return button
    })
    segs[1].setAttribute('data-long', t('lab.time.part.outbound'))
    segs[1].setAttribute('data-short', t('lab.time.part.outbound_short'))
    segs[3].setAttribute('data-long', t('lab.time.part.inbound'))
    segs[3].setAttribute('data-short', t('lab.time.part.inbound_short'))
    const label = part => [el('span', { class: 'tl-term', text: timeName(part, bar) }), ' ', el('b', {}, timeNumber(timeValue(part, labels)))]
    const call = (index, part, extra) => [
      el('span', { class: 'tl-tick', 'data-for': String(index) }),
      el('span', { class: 'tl-call' + extra, 'data-for': String(index), 'data-part': part }, label(part))
    ]
    const dim = (part, from, to, top, extra) => [
      el('span', { class: 'tl-dim', 'data-from': from, 'data-to': to, 'data-top': top, 'aria-hidden': 'true' }),
      el('button', { type: 'button', class: 'tl-dim-label' + extra, 'data-part': part, 'data-from': from, 'data-to': to, 'data-top': top, ...trigger }, label(part))
    ]
    const summary = fillText('lab.time.sr', {
      total: labels.total,
      conn: fillText(bar.connNew ? 'lab.time.sr_conn_new' : 'lab.time.sr_conn', { time: labels.conn }),
      net: labels.net,
      server: labels.server,
      down: labels.down,
      ttfb: labels.ttfb
    })
    const fig = el('figure', { class: 'tl' },
      // A marca discreta da escala ajustada fica ao lado da dica; o mouse vê a explicação no title, e o leitor
      // de tela a ouve inteira, logo depois da marca.
      el('p', { class: 'flow-hint tl-hint' }, t('lab.time.hint'), ' ',
        el('span', { class: 'tl-scale', title: t('lab.time.adjusted') }, t('lab.time.adjusted_mark'), el('span', { class: 'sr-only', text: ': ' + t('lab.time.adjusted') }))),
      el('p', { class: 'sr-only', text: summary }),
      el('div', { class: 'tl-draw' },
        el('div', { class: 'tl-calls', 'aria-hidden': 'true' }, call(0, 'conn', ''), call(2, 'server', ' server'), call(4, 'down', '')),
        el('div', { class: 'tl-bar' }, segs),
        el('div', { class: 'tl-dims' }, dim('ttfb', '1', '3', '0', ''), dim('total', '0', '4', '1', ' total'))),
      el('div', { class: 'tl-pop', id: 'tl-pop', role: 'region', 'aria-labelledby': 'tl-pop-title', hidden: true }))

    const toggle = button => time.current === button ? closeTimePop(false) : openTimePop(button, timePopContent(button.getAttribute('data-part'), bar, labels))
    fig.querySelectorAll('button[data-part]').forEach(button => button.addEventListener('click', () => toggle(button)))
    // Os rótulos acima da barra são alvos maiores para as partes finas: agem como o botão da parte.
    fig.querySelectorAll('.tl-call').forEach(call => call.addEventListener('click', () => {
      const button = fig.querySelector('button[data-part="' + call.getAttribute('data-part') + '"]')
      button.focus({ preventScroll: true })
      toggle(button)
    }))
    // O balão não prende o foco: o foco saindo da parte e do balão o fecha (o clique fora fica em setupTime).
    fig.addEventListener('focusout', event => {
      const next = event.relatedTarget
      if (time.current && next && !time.pop.contains(next) && next !== time.current) closeTimePop(false)
    })
    return fig
  }

  // Um texto do balão com os marcadores trocados por elementos; cada uso ganha uma cópia do elemento.
  function popText (key, values) {
    return parts(key, values).map(piece => typeof piece === 'string' ? piece : piece.cloneNode(true))
  }

  function timePopContent (part, bar, labels) {
    const pop = TIME_POPS[part]
    const values = {
      time: num(labels.net),
      command: el('code', { text: 'npx serverest' }),
      route: el('code', { text: 'GET /produtos' }),
      stage: t('ui.flow.stage_label.read'),
      preset: el('i', { lang: 'en', text: '3G' }),
      content_download: el('i', { lang: 'en', text: 'Content Download' }),
      waiting: el('i', { lang: 'en', text: 'Waiting for server response' }),
      expansion: el('i', { lang: 'en', text: 'Time To First Byte' }),
      queueing: el('i', { lang: 'en', text: 'Queueing' }),
      option: el('b', { text: t('lab.sent_out.times') }),
      tab: el('b', { text: t('lab.sent_out.title') }),
      variable: el('code', { text: 'time_starttransfer' })
    }
    const body = part === 'conn' ? ['lab.time.conn.body', bar.connNew ? 'lab.time.conn.new' : 'lab.time.conn.reused'] : pop.body
    const value = part === 'outbound' || part === 'inbound' ? parts('lab.time.about', { time: num(labels.half) }) : num(timeValue(part, labels))
    const links = (pop.links || (pop.link ? [{ key: part, text: pop.link, name: pop.linkName }] : []))
      .map(spec => ({ spec, link: core.timeLink(spec.key, language) }))
      .filter(item => item.link)
    return [
      el('p', { class: 'rel-title', id: 'tl-pop-title', text: capitalized(timeName(part, bar)) }),
      el('p', { class: 'tl-pop-stats' }, el('span', { class: 'tl-pop-ms' }, value), timeShareNodes(part, bar)),
      timeFacts(part, bar),
      body.map(key => el('p', null, popText(key, values))),
      part === 'conn' && core.protocolName(bar.details && bar.details.protocol) ? el('p', null, popText('lab.time.conn.protocol_note', values)) : null,
      pop.note ? el('p', { class: 'note' }, popText(pop.note, values)) : null,
      part === 'total' ? el('p', null, el('button', { type: 'button', class: 'btn btn-quiet', text: fillText('lab.time.total.go_sent', { tab: t('lab.sent_out.title') }), onclick: goToCurlTimes })) : null,
      el('p', { class: 'tip' }, el('b', { text: t('lab.time.tip_label') }), ' ', popText(pop.tip, values)),
      links.map(({ spec, link }) => el('p', { class: 'pop-link' },
        externalLink(link.url, popText(spec.text, { name: el('span', { lang: 'en', text: spec.name || '' }) }), link.english ? { hreflang: 'en' } : null),
        link.english ? ' ' + t('lab.time.in_english') : null)),
      el('div', { class: 'rel-actions' }, el('button', { type: 'button', class: 'btn', text: t('lab.time.close'), onclick: () => closeTimePop(true) }))
    ]
  }

  // Os números a mais do balão, numa linha sob a fatia: na conexão, o protocolo e, se ela foi aberta agora, o
  // tempo de DNS, TCP e TLS; no download, o tamanho do corpo e se ele veio comprimido.
  function timeFacts (part, bar) {
    const details = bar.details || {}
    // Uma casa sempre, como o topo do balão (timeLabels): as linhas somam o tempo mostrado lá.
    const ms = value => Number.isFinite(value) ? core.formatMsFixed(value, 1, language) : null
    const facts = []
    if (part === 'conn') {
      // Uma tabela pequena: o protocolo e, numa conexão aberta agora, cada etapa com o tempo e o que ela faz.
      const rows = []
      const protocol = core.protocolName(details.protocol)
      if (protocol) rows.push([t('lab.time.conn.protocol_label'), protocol, ''])
      if (Number.isFinite(details.dns)) {
        // A espera vem primeiro, como no DevTools; com ela, as linhas somam o tempo do topo do balão. Numa
        // conexão reaproveitada o trecho inteiro é espera: DNS, TCP e TLS não acontecem e ficam de fora.
        const split = core.connParts(bar.conn, bar.connNew ? details : {})
        rows.push([t('lab.time.conn.wait_label'), ms(split.wait), t('lab.time.conn.wait')])
        if (bar.connNew) {
          rows.push(['DNS', ms(split.dns), t('lab.time.conn.dns')], ['TCP', ms(split.tcp), t('lab.time.conn.tcp')])
          rows.push(details.secure ? ['TLS', ms(split.tls), t('lab.time.conn.tls')] : ['TLS', '—', t('lab.time.conn.no_tls')])
        }
      }
      return rows.length
        ? el('dl', { class: 'tl-pop-grid' }, rows.map(([name, value, what]) => [el('dt', { text: name }), el('dd', { class: 'v', text: value }), el('dd', { class: 'd', text: what })]))
        : null
    }
    if (part === 'down') {
      const size = core.formatBytes(details.size, language)
      const encoded = core.formatBytes(details.encoded, language)
      if (size) facts.push(details.encoded > 0 && details.encoded < details.size ? fillText('lab.time.down.size_compressed', { size, encoded }) : fillText('lab.time.down.size', { size }))
    }
    return facts.length ? el('p', { class: 'tl-pop-facts', text: facts.filter(Boolean).join(' · ') }) : null
  }

  // Um balão só, levado para logo depois da parte que o abriu: o Tab vai da parte para o balão e depois
  // para a próxima parte.
  function openTimePop (button, content) {
    closeTimePop(false)
    const pop = time.pop
    pop.textContent = ''
    append(pop, content)
    button.after(pop)
    pop.hidden = false
    button.setAttribute('aria-expanded', 'true')
    const call = time.fig.querySelector('.tl-call[data-part="' + button.getAttribute('data-part') + '"]')
    if (call) call.classList.add('is-open')
    time.current = button
    if (time.onServerPop) time.onServerPop(button.getAttribute('data-part') === 'server')
    setTimeFront('pop', TIME_FRONT_PARTS[button.getAttribute('data-part')])
    placeTimePop()
    // Um balão que abre abaixo da dobra pareceria um clique sem efeito.
    const over = pop.getBoundingClientRect().bottom + 12 - window.innerHeight
    if (over > 0) window.scrollBy({ top: over, behavior: state.reduced ? 'auto' : 'smooth' })
  }

  function closeTimePop (refocus) {
    const button = time.current
    if (!button) return
    time.current = null
    time.pop.hidden = true
    if (time.onServerPop) time.onServerPop(false)
    setTimeFront('pop', null)
    button.setAttribute('aria-expanded', 'false')
    time.fig.querySelectorAll('.tl-call.is-open').forEach(call => call.classList.remove('is-open'))
    if (refocus) button.focus()
  }

  // O balão fica sob a parte, com a ponta apontando para ela, sem passar das bordas da barra.
  function placeTimePop () {
    const button = time.current
    if (!button) return
    const pop = time.pop
    const figBox = time.fig.getBoundingClientRect()
    const anchor = button.getBoundingClientRect()
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const width = Math.min(24 * rem, figBox.width)
    pop.style.width = width + 'px'
    const center = anchor.left + anchor.width / 2
    const left = Math.max(figBox.left, Math.min(figBox.right - width, center - width / 2))
    const origin = pop.offsetParent.getBoundingClientRect()
    pop.style.left = (left - origin.left) + 'px'
    pop.style.top = (anchor.bottom + 10 - origin.top) + 'px'
    pop.style.setProperty('--notch', Math.max(14, Math.min(width - 14, center - left)) + 'px')
  }

  // Os rótulos e as cotas seguem a posição real das partes (cada parte tem uma largura mínima).
  function layoutTime (fig) {
    const bar = fig.querySelector('.tl-bar')
    const width = bar.clientWidth
    if (!width) return
    const segs = Array.from(bar.children).filter(node => node.classList.contains('tl-seg'))
    // Toda parte com tempo fica com pelo menos core.TIME_MIN_SHARE da barra; a escala só sai da real se faltar.
    // Quando sai, a marca "escala ajustada" aparece ao lado da dica (CSS).
    const ms = segs.map(node => Number(node.getAttribute('data-ms')))
    const weights = core.timeWeights({ conn: ms[0], half: ms[1], server: ms[2], down: ms[4] }, core.TIME_MIN_SHARE)
    const g = [weights.conn, weights.half, weights.server, weights.half, weights.down].map(weight => weight.toFixed(4))
    if (!time.hold) barMemo.tl = g
    fig.classList.toggle('tl-adjusted', weights.adjusted)
    // Os rótulos ficam sobre as partes como estão desenhadas: presas na geometria anterior até o veredito
    // (D29). A fileira de rótulos guarda a altura que as duas geometrias pedem, para nada abaixo dela pular no
    // veredito; o piso fica no desenho até o próximo envio.
    const rows = placeTimeLabels(fig, segs, width, g)
    if (time.hold) {
      fig.rowsFloor = Math.max(fig.rowsFloor || 0, rows)
      fig.rowsFloor = Math.max(fig.rowsFloor, placeTimeLabels(fig, segs, width, time.hold))
    }
    // As partes recebem a largura em px da mesma conta dos rótulos: na transição, partes e rótulos andam em px
    // com a mesma curva e ficam juntos (entre dois pesos de flex-grow, o caminho em px seria outro).
    const drawn = time.hold || g
    segmentBoxes(segs, drawn, width).forEach((box, index) => {
      segs[index].style.setProperty('--g', drawn[index])
      segs[index].style.flex = '0 0 ' + box.width.toFixed(2) + 'px'
    })
    fig.querySelector('.tl-calls').style.setProperty('--calls-h', (26 + Math.max(rows, fig.rowsFloor || 0) * 20) + 'px')
  }

  // Onde cada parte fica quando a barra chega aos pesos dados: a conta do flex (base 0, os pesos dividem a
  // largura menos os vãos, e nenhuma parte fica abaixo da largura mínima dela). Os rótulos saem dessa conta, e
  // não da medida: no meio da transição das larguras, ou antes de ela começar, a medida daria o desenho de
  // partida, e os rótulos ficariam lá.
  function segmentBoxes (segs, weights, width) {
    const gap = parseFloat(getComputedStyle(segs[0].parentNode).columnGap) || 0
    const mins = segs.map(seg => parseFloat(getComputedStyle(seg).minWidth) || 0)
    const grow = weights.map(Number)
    const space = width - gap * (segs.length - 1)
    const frozen = grow.map(() => false)
    let sizes
    for (;;) {
      const free = space - mins.reduce((total, min, index) => total + (frozen[index] ? min : 0), 0)
      const sum = grow.reduce((total, value, index) => total + (frozen[index] ? 0 : value), 0) || 1
      sizes = grow.map((value, index) => frozen[index] ? mins[index] : value / sum * free)
      const small = sizes.findIndex((size, index) => !frozen[index] && size < mins[index])
      if (small === -1) break
      frozen[small] = true
    }
    let x = 0
    return sizes.map(size => {
      const box = { left: x, right: x + size, width: size }
      x += size + gap
      return box
    })
  }

  // Põe os rótulos acima e as cotas abaixo das partes como elas ficam com os pesos dados e diz quantas
  // fileiras extras os rótulos de cima pediram.
  function placeTimeLabels (fig, segs, width, weights) {
    const boxes = segmentBoxes(segs, weights, width)
    const seg = index => boxes[index]
    // O nome longo onde cabe ("ida até o servidor"), o curto onde não cabe, nada numa fatia fina. A ida e a
    // volta usam o mesmo tamanho, para "ida" nunca ficar ao lado de "volta ao navegador".
    const nets = segs.filter(node => node.classList.contains('net'))
    const choices = node => [node.getAttribute('data-long'), node.getAttribute('data-short'), '']
    const level = Math.max(...nets.map(node => {
      const term = el('span', { class: 'tl-term' })
      node.replaceChildren(term)
      return choices(node).findIndex(text => {
        term.textContent = text
        return term.offsetWidth <= boxes[segs.indexOf(node)].width - 8
      })
    }))
    nets.forEach(node => { node.firstChild.textContent = choices(node)[level] })
    // Os rótulos acima da barra sobem uma fileira quando encostariam no vizinho.
    const rows = []
    let maxRow = 0
    fig.querySelectorAll('.tl-call').forEach(call => {
      const index = call.getAttribute('data-for')
      const s = seg(Number(index))
      const center = (s.left + s.right) / 2
      const w = call.offsetWidth
      const left = Math.max(0, Math.min(width - w, center - w / 2))
      let row = 0
      while ((rows[row] || []).some(range => left < range[1] + 8 && left + w > range[0] - 8)) row++
      rows[row] = (rows[row] || []).concat([[left, left + w]])
      maxRow = Math.max(maxRow, row)
      call.style.left = left + 'px'
      call.style.bottom = (row * 20) + 'px'
      const tick = fig.querySelector('.tl-tick[data-for="' + index + '"]')
      tick.style.left = Math.round(center) + 'px'
      tick.style.height = (6 + row * 20) + 'px'
    })
    fig.querySelectorAll('.tl-dim, .tl-dim-label').forEach(node => {
      const from = seg(Number(node.getAttribute('data-from'))).left
      const to = seg(Number(node.getAttribute('data-to'))).right
      const top = Number(node.getAttribute('data-top')) * 26
      if (node.classList.contains('tl-dim')) {
        node.style.left = from + 'px'
        node.style.width = (to - from) + 'px'
        node.style.top = (top + 3) + 'px'
      } else {
        const w = node.offsetWidth
        node.style.left = Math.max(w / 2, Math.min(width - w / 2, (from + to) / 2)) + 'px'
        node.style.top = (top + 4) + 'px'
      }
    })
    return maxRow
  }

  // Depois de a barra entrar na página: o desenho segue a largura da barra e o tamanho do texto (a cota do
  // total muda de tamanho com ele). Nenhum dos dois muda com o próprio desenho.
  function mountTime (fig) {
    time.fig = fig
    time.pop = fig.querySelector('.tl-pop')
    time.front.clear()
    const ttfb = fig.querySelector('.tl-dim-label[data-part="ttfb"]')
    if (ttfb) {
      // Mouse e foco do teclado são motivos separados: o foco de um clique não apaga o destaque do mouse.
      ttfb.addEventListener('mouseenter', () => setTimeFront('ttfb-hover', TIME_FRONT_PARTS.ttfb))
      ttfb.addEventListener('mouseleave', () => setTimeFront('ttfb-hover', null))
      ttfb.addEventListener('focus', () => setTimeFront('ttfb-focus', ttfb.matches(':focus-visible') ? TIME_FRONT_PARTS.ttfb : null))
      ttfb.addEventListener('blur', () => setTimeFront('ttfb-focus', null))
    }
    linkServerToFlow(fig)
    layoutTime(fig)
    if (time.observer) {
      time.observer.observe(fig.querySelector('.tl-bar'))
      time.observer.observe(fig.querySelector('.tl-dim-label.total'))
    }
    try {
      document.fonts.ready.then(() => { if (time.fig === fig) layoutTime(fig) })
    } catch (e) {}
  }

  // A fatia do servidor é a soma das etapas. Passar o mouse nela, levar o foco do teclado ou abrir o balão dela
  // traz as barras de "Todas as etapas" para o primeiro plano (crescem e ganham sombra) e leva o resto do fluxo
  // para o segundo plano; o destaque fica enquanto o balão do servidor estiver aberto.
  function linkServerToFlow (fig) {
    const scale = $('flow-body').querySelector('.wf-scale')
    const server = [fig.querySelector('.tl-seg.server'), fig.querySelector('.tl-call.server')].filter(Boolean)
    if (!scale || !server.length) return
    const wf = scale.closest('.wf') || scale
    // Três motivos ligam o destaque (mouse, foco do teclado, balão aberto); ele só apaga quando nenhum resta.
    const reasons = new Set()
    const reason = (name, on) => {
      if (on) reasons.add(name)
      else reasons.delete(name)
      wf.classList.toggle('wf-forward', reasons.size > 0)
    }
    time.onServerPop = on => reason('pop', on)
    server.forEach(node => {
      node.addEventListener('mouseenter', () => reason('hover', true))
      node.addEventListener('mouseleave', () => reason('hover', false))
    })
    // O foco de um clique não conta (como em linkSummary): quem clica fica com o balão, que já liga o destaque.
    server[0].addEventListener('focus', () => reason('focus', server[0].matches(':focus-visible')))
    server[0].addEventListener('blur', () => reason('focus', false))
  }

  function unmountTime () {
    closeTimePop(false)
    time.onServerPop = null
    time.front.clear()
    if (time.observer) time.observer.disconnect()
    time.fig = null
    time.pop = null
  }

  // Um clique fora fecha o balão; Esc fecha e devolve o foco à parte.
  function setupTime () {
    document.addEventListener('pointerdown', event => {
      const button = time.current
      if (!button) return
      const call = time.fig.querySelector('.tl-call[data-part="' + button.getAttribute('data-part') + '"]')
      if (time.pop.contains(event.target) || button.contains(event.target) || (call && call.contains(event.target))) return
      closeTimePop(false)
    })
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && time.current) {
        event.preventDefault()
        closeTimePop(true)
      }
    })
    if (window.ResizeObserver) {
      time.observer = new ResizeObserver(() => {
        if (!time.fig) return
        layoutTime(time.fig)
        placeTimePop()
      })
    }
  }

  /* ---------- Início ---------- */

  function init () {
    // O negrito 700 do Titillium só aparece no veredito ("Parou em", "Passou por todas as etapas"); carregado
    // só ali, o texto nascia na fonte de reserva e pulava quando a fonte chegava.
    try {
      document.fonts.load('700 1em "Titillium Web"')
    } catch (e) {}
    // O Histórico da sessão volta antes de qualquer pintura: as marcas das Rotas, o Histórico e a contagem
    // leem dele.
    restoreSession()
    setupTopbar()
    paintNotice()
    paintFeedbackPill()
    countUsageDay()
    renderAbout(null)
    setupFlowControls()
    setupTime()
    setupResultTabs()
    setupView()
    setupSide()
    // O CSS precisa da altura do Resultado para grudá-lo pela base quando ele, vazio, é mais alto que a janela.
    if (window.ResizeObserver) {
      new ResizeObserver(() => document.documentElement.style.setProperty('--res-h', $('result').offsetHeight + 'px')).observe($('result'))
    }
    renderHistory()
    renderResultEmpty(null)
    const filter = $('filter')
    Object.keys(core.FIELD_ASSISTS_OFF).forEach(name => filter.setAttribute(name, core.FIELD_ASSISTS_OFF[name]))
    filter.addEventListener('input', renderRoutes)
    $('routes-toggle').addEventListener('click', () => setRoutesCollapsed(!$('routes').classList.contains('collapsed')))
    $('hist-clear').addEventListener('click', clearHistory)
    $('hist-undo').addEventListener('click', undoClear)
    $('result-edit').addEventListener('click', editRequest)
    if (examplesQuery) {
      try {
        examplesQuery.addEventListener('change', paintDocResponses)
      } catch (e) {}
    }
    // Um clique fora do botão dividido fecha o menu do modo.
    document.addEventListener('pointerdown', event => {
      const split = $('run-split')
      if (split && !split.contains(event.target)) closeRunMenu(false)
    })
    // Ctrl + Enter (Cmd + Enter no Mac) envia no modo em uso; um envio em andamento não é repetido.
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && $('request').contains(document.activeElement)) {
        event.preventDefault()
        if (state.busy) return
        execute()
      }
    })
    window.addEventListener('hashchange', () => {
      updateLanguageLinks()
      const key = routeKeyFromHash()
      const route = state.routes.find(item => item.key === key)
      if (route && route !== state.selected) selectRoute(route, false)
    })
    // A linha de ajuda passa a dizer que o token expirou sem esperar outra ação.
    setInterval(() => {
      if (state.token) refreshPreview()
    }, 15000)
    loadSpec()
    removeRootServiceWorker()
  }

  // O service worker do Swagger já foi registrado com o escopo da raiz e controlava esta página, entrando no
  // meio de cada chamada à API. Agora ele fica em /swagger; quem não abrir mais o Swagger perde aqui o
  // registro antigo. Esta carga ainda passa por ele, a próxima não. Sem suporte ou com erro, nada muda.
  function removeRootServiceWorker () {
    try {
      const rootScope = window.location.origin + '/'
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.filter(reg => reg.scope === rootScope).forEach(reg => reg.unregister()))
        .catch(() => {})
    } catch (e) {}
  }

  init()
})()
