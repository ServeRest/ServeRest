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
  const LANGUAGE_KEY = 'swaggerLanguage'
  const STAGES_HEADER = 'x-serverest-stages'
  const LOGIN_PATH = '/login'
  const MAX_BODY_CHARS = 300000
  const MAX_HISTORY = 50
  const RESPONSE_DELAY = 300
  const THEME_KEY = 'serverestTheme'
  const TEXT_KEY = 'serverestTextSize'
  // Pedido da página anterior para a página nova brilhar na cor do idioma escolhido (só nesta aba).
  const GLOW_KEY = 'serverestLangGlow'
  const TEXT_SIZES = ['normal', 'grande', 'maior']
  const TEXT_SIZE_NAMES = { normal: 'lab.topbar.size_normal', grande: 'lab.topbar.size_grande', maior: 'lab.topbar.size_maior' }
  // Só GET recebe o valor documentado no parâmetro de caminho; em DELETE e PUT ele é apenas exemplo.
  const PREFILL_METHODS = ['get']
  // Abaixo desta largura cada exemplo de Respostas possíveis fica fechado num details.
  const NARROW_EXAMPLES = '(width < 37.5rem)'
  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || '') || /Mac|iPhone|iPad/.test(navigator.userAgent || '')
  // Os textos "Como seguir" do fluxo são do painel do Swagger, que tem outro jeito de obter o token.
  // Nesta página, os que dizem como conseguir um token viram a instrução única do campo Authorization,
  // a mesma palavra por palavra em todo lugar.
  const HOW_KEYS = {
    'ui.flow.how.auth.token_missing': 'lab.auth.how_to_get',
    'ui.flow.how.auth.token_expired': 'lab.auth.how_to_get',
    'ui.flow.how.auth.token_invalid': 'lab.auth.how_to_get',
    'ui.flow.how.stage.auth': 'lab.auth.how_to_get',
    'ui.flow.how.auth.user_not_found': 'lab.flow.how.user_not_found'
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
    if (ms >= 100) return String(Math.round(ms)) + ' ms'
    const value = ms.toFixed(1)
    return (language === 'en' ? value : value.replace('.', ',')) + ' ms'
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
    const note = state.countNote
    state.countNote = ''
    announce(note ? message + ' ' + note : message)
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

  // Link para fora da página: sempre em outra aba, e o leitor de tela fica sabendo.
  function externalLink (href, label) {
    return el('a', { href, target: '_blank', rel: 'noopener' }, label, el('span', { class: 'sr-only', text: ' ' + t('lab.link.new_tab') }))
  }

  // Markdown da introdução do documento (core.parseInlineMarkdown): pedaços em negrito seguidos viram
  // um <strong> só, e cada link um <a> de verdade. Tudo entra como texto; nada passa por innerHTML.
  function markdownNodes (block) {
    const out = []
    let bold = null
    core.parseInlineMarkdown(block).forEach(piece => {
      const node = piece.href ? externalLink(piece.href, piece.text) : piece.text
      if (!piece.bold) {
        bold = null
        out.push(node)
        return
      }
      if (!bold) {
        bold = el('strong')
        out.push(bold)
      }
      append(bold, node)
    })
    return out
  }

  function markdownParagraphs (source) {
    return String(source || '').split(/\n\s*\n/).map(block => block.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
  }

  function plainMarkdown (block) {
    return core.parseInlineMarkdown(block).map(piece => piece.text).join('')
  }

  /* ---------- Estado ---------- */

  const state = {
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
    // A aba de Corpo (JSON), JSON ou Schema: vale para a página inteira e não é guardada.
    bodyTab: 'json',
    // O comando que "Copiar comando" de Será enviado copiou; a mensagem da cópia some quando ele muda.
    copiedDraft: null,
    // Coluna da esquerda: a aba escolhida (a página sempre abre em Rotas, a escolha não é guardada) e a
    // contagem do Histórico que vai junto do próximo anúncio quando a aba Histórico está fechada.
    sideTab: 'rotas',
    countNote: '',
    // Quantos envios chegaram com a aba Histórico fechada (a contagem fica roxa enquanto houver algum).
    unseen: 0,
    // O envio cujo fluxo ainda anda: até o veredito, nenhum lugar da página mostra o status dele.
    pendingId: null,
    // O envio mostrado em Resultado acabou de chegar (live) ou é um envio anterior.
    shownLive: false,
    slow: readSlowMotion(),
    reduced: prefersReducedMotion()
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
  // aviso; a versão vazia é o aviso sem número). O link só existe na marcação sem href: ele vem daqui.
  function paintNotice () {
    const root = document.documentElement
    const href = core.safeHref(root.getAttribute('data-notice-url') || '')
    const latest = root.getAttribute('data-notice-version') || ''
    const notice = $('version-notice')
    if (!href) return
    notice.href = href
    notice.textContent = latest ? fillText('lab.version.notice', { version: latest }) : t('lab.version.notice_plain')
    notice.append(el('span', { class: 'sr-only', text: ' ' + t('lab.link.new_tab') }))
    notice.hidden = false
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

  // Câmera lenta: a caixa da faixa do Fluxo é o único controle do ajuste.
  function setSlow (enabled) {
    state.slow = enabled
    saveSlowMotion(enabled)
    $('slow').checked = state.slow
    // Desligar no meio da animação leva direto ao estado final, como no painel do Swagger.
    if (!state.slow && flow.model && flow.active < flow.end) {
      clearTimeout(flow.timer)
      flow.run++
      flow.active = flow.end
      paintFlow()
      finishFlow()
    }
  }

  /* ---------- Sobre o ServeRest ---------- */

  function renderAbout (spec) {
    const info = (spec && spec.info) || {}
    const blocks = markdownParagraphs(info.description)
    const box = $('about-text')
    box.textContent = ''
    if (!blocks.length) return
    blocks.forEach((block, index) => {
      const paragraph = el('p', null, markdownNodes(block))
      // A introdução termina em "contate o mantenedor do projeto:"; o contato vem de info.contact.
      const contactUrl = info.contact && core.safeHref(info.contact.url)
      if (index === blocks.length - 1 && contactUrl && info.contact.name) paragraph.append(' ', externalLink(contactUrl, info.contact.name))
      box.append(paragraph)
    })
    $('about').hidden = false
  }

  function introSentence () {
    const info = (state.spec && state.spec.info) || {}
    const first = markdownParagraphs(info.description)[0]
    return first ? plainMarkdown(first) : ''
  }

  // O seletor de idioma do Swagger. A bandeira do idioma da página não recarrega; as outras guardam o
  // idioma escolhido e pedem à página nova que brilhe 1 s na cor da bandeira (sem brilho com menos
  // movimento pedido pelo sistema).
  function setupTopbar () {
    $('version').textContent = version ? fillText('lab.topbar.version', { version }) : ''
    updateLanguageLinks()
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
    // A versão na URL impede que o service worker da documentação devolva a lista de outra versão.
    const url = '/swagger.json?lang=' + encodeURIComponent(language) + '&v=' + encodeURIComponent(version)
    fetch(url, { cache: 'no-store' }).then(res => {
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
      showForSelected()
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
      state.unseen = 0
      state.countNote = ''
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
    }
    paintHistBadge(false)
    if (id === 'historico') keepEntryInView()
    if (focus) $('side-tab-' + id).focus()
  }

  // Abas com o teclado, como as da Requisição: setas, Home e End, com ativação automática. A escolha não
  // é guardada: o Histórico some ao recarregar, e uma aba Histórico lembrada abriria um painel vazio no
  // lugar das rotas.
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

  // A Requisição sem abas: o título, a descrição, a barra de endereço com a URL já resolvida, a linha do
  // atalho e as seções com faixa: Parâmetros, Corpo (JSON) (só com corpo; com as abas JSON e Schema quando
  // o documento traz o schema), Será enviado (o comando curl, refeito a cada edição) e Respostas possíveis,
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
      paintDocLink(null)
      return
    }
    const route = state.selected
    const draft = draftFor(route)
    paintDocLink(route)

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
          el('button', { type: 'button', class: 'btn btn-primary', id: 'run', onclick: execute }))),
      el('p', { class: 'kbd-hint req-hint' }, parts('lab.actions.shortcut', { ctrl: el('kbd', { text: ctrlName() }), enter: el('kbd', { text: 'Enter' }) })),
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

  // Será enviado: o comando curl do rascunho, sempre com o corpo inteiro, e sob ele a mensagem da cópia.
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
        el('span', { class: 'doc-code', text: response.status }),
        el('span', { class: 'doc-desc' }, richInline(response.description)),
        response.example !== undefined
          ? docExample(response.example, narrow)
          : el('p', { class: 'doc-none', text: t('lab.responses.no_example') }))))
    ]
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
      autocomplete: 'off',
      spellcheck: 'false',
      autocapitalize: 'off',
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
        autocomplete: 'off',
        spellcheck: 'false',
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
    const editor = el('textarea', { class: 'editor', id: 'body-editor', spellcheck: 'false', autocomplete: 'off', wrap: 'off', 'aria-describedby': 'body-state json-note' })
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

  // A cada mudança no rascunho: a URL da barra, o comando de Será enviado, o campo Authorization e a caixa
  // de Preencher.
  function refreshPreview () {
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

  function setBusy (busy) {
    const run = $('run')
    if (!run) return
    run.disabled = busy || !state.selected
    run.setAttribute('aria-busy', busy ? 'true' : 'false')
    run.textContent = ''
    if (busy) run.append(el('span', { class: 'spin', 'aria-hidden': 'true' }), ' ', t('lab.actions.executing'))
    else run.append(t('lab.actions.execute'))
  }

  /* ---------- Comando curl e cópia ---------- */

  // Uma linha por parte do comando (span em bloco): todas menos a primeira começam com dois espaços, todas
  // menos a última terminam em " \". O innerText do bloco é exatamente core.curlOf, também numa seleção
  // feita à mão; o botão copia sempre a string de core.curlOf, nunca o texto da tela.
  function renderCurl (pre, request) {
    const list = core.curlParts(request)
    pre.replaceChildren(...list.map((part, index) => {
      const line = el('span', { class: 'curl-part', 'data-kind': part.kind })
      if (index > 0) line.append('  ')
      curlPartContent(line, part)
      if (index < list.length - 1) keepTailTogether(line)
      return line
    }))
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
  function copyCommand (button, command, pre, message, onShown) {
    copyText(command, ok => {
      if (ok) {
        const done = t('lab.copy.command_done')
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
      // O rascunho como estava no envio, para "Preencher a requisição com este envio".
      sent: null,
      headers: [],
      stagesHeader: null,
      bodyText: '',
      error: null
    }
    const headers = {}
    request.headers.forEach(header => { headers[header[0]] = header[1] })
    const start = performance.now()
    return fetch(request.url, { method: request.method, headers, body: request.body, cache: 'no-store' }).then(res => {
      record.status = res.status
      record.statusText = core.statusText(res.status) || res.statusText
      res.headers.forEach((value, name) => record.headers.push([name, value]))
      record.stagesHeader = res.headers.get(STAGES_HEADER)
      return res.text()
    }).then(body => {
      record.ms = performance.now() - start
      record.bodyText = body
      return record
    }).catch(error => {
      record.ms = performance.now() - start
      record.error = (error && error.message) || String(error)
      return record
    })
  }

  function execute () {
    if (state.busy || !state.selected) return
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
    // Executar fica desabilitado durante o envio e perde o foco; ele volta, sem rolar a página.
    const hadFocus = document.activeElement === $('run')
    state.busy = true
    setBusy(true)
    const sent = { params: Object.assign({}, draft.params), body: draft.body, auth: route.needsToken ? authValue(route) : '' }
    send(route, currentRequest(route), 'route').then(record => {
      record.sent = sent
      state.busy = false
      setBusy(false)
      // Um envio anterior que ainda esperava o veredito mostra o status agora; o novo, se aparece em
      // Resultado, fica pendente até o fluxo dele chegar ao veredito (na hora, sem a câmera lenta).
      revealPending()
      const showsHere = !!state.selected && state.selected.key === core.recordKey(record)
      if (showsHere) state.pendingId = record.id
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

  // O único jeito de a página ter um token é a resposta real de POST /login: um botão logo abaixo do
  // corpo o passa para o campo Authorization de todas as rotas com cadeado que não foram editadas.

  function tokenOf (record) {
    if (record.error || record.status !== 200 || record.method !== 'POST' || record.path !== LOGIN_PATH) return null
    try {
      const body = JSON.parse(record.bodyText)
      return body && typeof body.authorization === 'string' && body.authorization ? body.authorization : null
    } catch (e) {
      return null
    }
  }

  function editedRoutes () {
    return state.routes.filter(route => route.needsToken && state.drafts[route.key] && typeof state.drafts[route.key].auth === 'string').length
  }

  function tokenOffer (record) {
    const token = tokenOf(record)
    if (!token) return null
    state.offer = { box: el('div', { class: 'token-offer', id: 'token-offer' }), token, record }
    paintOffer(false)
    return state.offer.box
  }

  // Devolve a frase de confirmação quando este é o token da página; senão mostra o botão.
  function paintOffer (justUsed) {
    const offer = state.offer
    if (!offer) return null
    if (state.token === offer.token) {
      const text = [t(justUsed ? 'lab.token.used' : 'lab.token.in_use'), editedRoutes() ? t('lab.token.edited_kept') : ''].filter(Boolean).join(' ')
      const done = el('p', { class: 'token-done', id: 'token-done', tabindex: '-1' }, el('span', { 'aria-hidden': 'true', text: '✓ ' }), text)
      offer.box.replaceChildren(done)
      return { node: done, text }
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

  /* ---------- Histórico ---------- */

  // O modelo é o mesmo do painel do Swagger; só os textos de como conseguir um token mudam (HOW_KEYS).
  function flowModelOf (record) {
    const model = core.buildFlowModel(core.parseStages(record.stagesHeader), record.status, texts)
    if (model && HOW_KEYS[model.howKey]) model.howKey = HOW_KEYS[model.howKey]
    return model
  }

  function stageName (stage) {
    return stage.labelKey ? t(stage.labelKey) : stage.name
  }

  function flowWhere (record) {
    if (record.error) return { className: 'stopped', text: t('lab.history.no_response') }
    if (record.stagesHeader === null) return { className: '', text: t('lab.history.no_header') }
    const model = flowModelOf(record)
    if (!model) return { className: '', text: t('lab.history.empty_header') }
    if (model.summary === 'stopped') {
      const stage = model.stages.find(item => item.name === model.failedStage)
      return { className: 'stopped', text: fillText('lab.history.stopped_at', { stage: stageName(stage) }) }
    }
    if (model.summary === 'outside') return { className: '', text: t('lab.history.outside') }
    return { className: '', text: t('lab.history.completed') }
  }

  function addHistory (record) {
    state.history.unshift(record)
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY
    const closed = currentLayout() === 'abas' && state.sideTab !== 'historico'
    // Os novos nunca passam do total: a lista guarda só os últimos MAX_HISTORY envios.
    if (closed) state.unseen = Math.min(state.unseen + 1, state.history.length)
    renderHistory()
    paintRouteMarks()
    // Com a aba fechada, a contagem sobe na hora em que o envio entra na lista: ela só diz que houve um
    // envio, não como ele terminou, então não estraga o fluxo. Fica roxa até a aba ser aberta.
    if (closed) paintHistBadge(true)
    // Com a aba Histórico fechada, a página não troca de aba sozinha: a contagem muda na aba e vai junto
    // do próximo anúncio (o do resultado), para um anúncio não apagar o outro.
    const count = state.history.length
    state.countNote = closed
      ? fillText(count === 1 ? 'lab.history.count_note_one' : 'lab.history.count_note', { count })
      : ''
  }

  // A contagem na aba Histórico: o total de envios, numa caixa que fica roxa cheia enquanto houver envios
  // que chegaram com a aba fechada.
  function paintHistBadge (roll) {
    const badge = $('side-count-historico')
    const num = $('hist-badge-num')
    const count = state.history.length
    badge.hidden = !count
    num.textContent = count ? String(count) : ''
    const fresh = state.unseen > 0
    badge.classList.toggle('is-new', fresh)
    $('hist-badge-new').textContent = fresh ? ' ' + fillText(state.unseen === 1 ? 'lab.history.new_one' : 'lab.history.new', { count: state.unseen }) : ''
    if (roll) playOnce(num, COUNT_ROLL, { duration: 450, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' })
  }

  // A contagem sobe de baixo, e a entrada nova ganha um contorno roxo que se apaga. Só cor e posição.
  const COUNT_ROLL = [{ transform: 'translateY(90%)', opacity: 0 }, { transform: 'none', opacity: 1 }]
  const ENTRY_ARRIVE = [{ boxShadow: 'inset 0 0 0 2px var(--accent)' }, { boxShadow: 'inset 0 0 0 2px transparent' }]

  // Os dois sinais são animações de script (Web Animations), que tocam uma vez só. Uma animação de CSS
  // recomeça do início sempre que o elemento volta a aparecer depois de um display: none (o painel da aba
  // fechada, a lista de abas fora do layout com abas) e repetiria o sinal sem envio novo. Esta segue o
  // relógio mesmo escondida e, se já acabou, não toca de novo. Tocar outra vez cancela a anterior.
  const playing = new WeakMap()
  function playOnce (node, keyframes, options) {
    if (!node.animate || prefersReducedMotion()) return
    const previous = playing.get(node)
    if (previous) previous.cancel()
    playing.set(node, node.animate(keyframes, options))
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
    if (entry) entry.replaceChildren(...entryParts(record))
    paintRouteMarks()
    if (state.shownId === id) {
      renderShown(record, state.shownLive)
      renderResponse(record, state.shownLive)
    }
    const layout = currentLayout()
    if (layout === 'quatro' || (layout === 'abas' && state.sideTab === 'historico')) flashEntry(entry)
  }

  function flashEntry (entry) {
    if (entry) playOnce(entry, ENTRY_ARRIVE, { duration: 2000, easing: 'ease-out' })
  }

  // Se o header Authorization foi junto: é a diferença mais comum entre duas tentativas.
  function authSentText (record) {
    return parts(record.authSent ? 'lab.history.auth_with' : 'lab.history.auth_without', { header: el('span', { class: 'auth-word', text: state.authHeader }) })
  }

  // O Histórico é um painel próprio: uma lista vertical de envios, o mais recente primeiro. Escolher um
  // mostra o fluxo e a resposta dele sem enviar de novo (e seleciona a rota dele). A ordem dos filhos é
  // a das colunas da tabela; nas entradas estreitas o CSS só reposiciona a hora.
  function renderHistory () {
    const list = $('history-body')
    const count = state.history.length
    list.textContent = ''
    $('hist-count').textContent = count ? fillText(count === 1 ? 'lab.history.count_one' : 'lab.history.count', { count }) : ''
    paintHistBadge(false)
    $('hist-clear').hidden = !count
    $('hist-scroll').hidden = !count
    $('hist-empty').hidden = !!count
    $('hist-empty').textContent = t('lab.history.empty')
    state.history.forEach(record => {
      list.append(el('li', null, el('button', {
        type: 'button',
        class: 'entry',
        'data-id': String(record.id),
        'aria-current': record.id === state.shownId ? 'true' : null,
        onclick: () => pickHistory(record)
      }, entryParts(record))))
    })
  }

  // Os filhos de uma entrada. Enquanto o fluxo do envio não chega ao veredito, status e onde parou dão
  // lugar a uma frase só: a entrada diz que o envio existe, não como terminou.
  function entryParts (record) {
    const head = [
      el('time', { datetime: record.at.toISOString(), text: clock(record.at) }),
      methodBadge(record.method),
      el('span', { class: 'path', text: record.path }),
      el('span', { class: 'auth-sent' }, authSentText(record))
    ]
    if (record.id === state.pendingId) return head.concat(el('span', { class: 'pending-note', text: t('lab.pending.short') }))
    const where = flowWhere(record)
    return head.concat(statusChip(record), el('span', { class: 'where ' + where.className, text: where.text }))
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

  function pickHistory (record) {
    const route = state.routes.find(item => item.key === core.recordKey(record))
    if (route && route !== state.selected) {
      state.selected = route
      writeHash(route)
      document.querySelectorAll('.route').forEach(button => {
        if (button.getAttribute('data-key') === route.key) button.setAttribute('aria-current', 'true')
        else button.removeAttribute('aria-current')
      })
      renderRequest()
    }
    state.pickedId = record.id
    show(record, 'history')
  }

  function clearHistory () {
    state.history = []
    state.shownId = null
    state.unseen = 0
    state.countNote = ''
    state.pendingId = null
    renderHistory()
    paintRouteMarks()
    showForSelected()
    announce(t('lab.history.clear_done'))
    // O botão Limpar some com o histórico: o foco vai para a frase do painel vazio que o substitui.
    $('hist-empty').focus({ preventScroll: true })
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
    $('result-empty').hidden = hasRecord
    $('shown').hidden = !hasRecord
    $('flow').hidden = !hasRecord
    $('response').hidden = !hasRecord
    if (!hasRecord) {
      $('shown-fill').hidden = true
      $('shown-fill').removeAttribute('data-state')
    }
  }

  function markCurrentEntry () {
    document.querySelectorAll('.entry').forEach(button => {
      if (button.getAttribute('data-id') === String(state.shownId)) button.setAttribute('aria-current', 'true')
      else button.removeAttribute('aria-current')
    })
  }

  // mode: 'live' (acabou de chegar) ou 'history' (envio anterior, sem animação).
  function show (record, mode, quiet) {
    const live = mode === 'live'
    state.shownId = record.id
    state.shownLive = live
    markCurrentEntry()
    setResultMode(true)
    renderShown(record, live)
    renderResponse(record, live)
    renderFlow(record, live, live && state.slow && !state.reduced, quiet)
    if (!quiet) revealFlow()
    keepEntryInView()
  }

  function renderShown (record, live) {
    const box = $('shown')
    box.textContent = ''
    append(box, [
      el('span', { class: 'sr-only', text: t('lab.result.shown_label') }),
      methodBadge(record.method),
      el('code', { class: 'shown-path', text: record.path }),
      // Até o veredito, o cabeçalho não mostra status: só método, caminho e hora. O lugar do status fica
      // guardado por uma cópia invisível (fora da árvore de acessibilidade), para o cabeçalho ter a mesma
      // altura antes e depois e o fluxo não pular no veredito, em qualquer largura.
      record.id === state.pendingId ? el('span', { class: 'chip-slot', 'aria-hidden': 'true' }, statusChip(record)) : statusChip(record),
      originTag(record, live)
    ])
    if (state.filledId !== record.id) state.filledId = null
    paintFill()
  }

  /* ---------- Preencher a requisição com um envio ---------- */

  // Escolher um envio antigo não mexe no rascunho. Quando o que está na requisição é diferente do que
  // este envio mandou (o comando curl dos dois não bate), uma ação logo abaixo do cabeçalho traz de
  // volta o envio. Só redesenha quando o estado muda, para não tirar o foco do botão.
  function paintFill () {
    const box = $('shown-fill')
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
    if (box.getAttribute('data-state') === key) return
    box.setAttribute('data-state', key)
    box.textContent = ''
    box.hidden = mode === 'none'
    if (mode === 'differs') {
      box.append(el('span', { class: 'fill-note', text: t('lab.fill.differs') }),
        el('button', { type: 'button', class: 'btn', id: 'fill-btn', text: t('lab.fill.action'), onclick: () => fillFromRecord(record) }))
    } else if (mode === 'done') {
      box.append(el('p', { class: 'fill-done', id: 'fill-done', tabindex: '-1' }, el('span', { 'aria-hidden': 'true', text: '✓ ' }), fillText('lab.fill.done', { time: clock(record.at) }), state.fillAuthChanged ? ' ' + t('lab.fill.auth_changed') : ''))
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
    state.shownId = null
    markCurrentEntry()
    setResultMode(false)
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
    const first = !state.history.length
    const intro = first ? introSentence() : ''
    append(box, [
      intro ? el('p', { class: 'result-lead', text: intro }) : null,
      route ? el('p', { class: 'result-route' }, parts('lab.result.not_sent', { route: el('code', { text: route.method.toUpperCase() + ' ' + route.path }) })) : null,
      el('p', { text: t('lab.result.not_sent_how') }),
      el('p', { class: 'muted small', text: t(first ? 'lab.result.history_note' : 'lab.result.others') })
    ])
  }

  // Numa coluna só, o resultado fica abaixo da requisição: quando ele aparece, o cabeçalho do
  // resultado é rolado até a vista. O foco não sai do lugar; a região ao vivo já anuncia.
  function revealFlow () {
    if (!isNarrow()) return
    const top = $('shown').getBoundingClientRect().top
    if (top >= 0 && top <= window.innerHeight * 0.4) return
    $('shown').scrollIntoView({ block: 'start', behavior: state.reduced ? 'auto' : 'smooth' })
  }

  function originTag (record, live) {
    if (live) return el('span', { class: 'tag', text: fillText('lab.origin.now', { time: clock(record.at) }) })
    return el('span', { class: 'tag history-tag', text: fillText('lab.origin.history', { time: clock(record.at) }) })
  }

  function renderResponse (record, live) {
    const area = $('res-body-area')
    area.textContent = ''
    state.offer = null
    // Até o veredito do fluxo, nem status nem corpo: a resposta chega junto com ele.
    if (record.id === state.pendingId) {
      area.append(el('p', { class: 'pending-note', text: t('lab.pending.response') }))
      return
    }
    if (record.error) {
      area.append(el('div', { class: 'net-error' },
        el('strong', { text: t('lab.response.network_error') }),
        el('span', { class: 'small', text: fillText('lab.response.network_detail', { error: record.error }) }),
        el('span', { class: 'res-url', text: record.method + ' ' + record.url })))
      return
    }
    const body = record.bodyText
    const truncated = body.length > MAX_BODY_CHARS
    let pretty = null
    try {
      pretty = JSON.stringify(JSON.parse(body), null, 2)
    } catch (e) {}
    const pre = el('pre')
    let shownText = pretty !== null ? pretty : body
    if (truncated) shownText = shownText.slice(0, MAX_BODY_CHARS)
    if (pretty !== null && !truncated) pre.innerHTML = core.highlightJson(shownText)
    else pre.textContent = shownText || t('lab.response.empty_body')

    const headerList = list => {
      const node = el('dl', { class: 'sent' })
      list.forEach(header => node.append(el('dt', { text: header[0] }), el('dd', { text: header[1] })))
      return node
    }

    append(area, [
      el('div', { class: 'res-line' },
        statusChip(record),
        el('span', { class: 'res-meta' }, parts('lab.time.browser', { time: el('strong', { text: formatMs(record.ms) }) }))),
      el('p', { class: 'res-url', text: record.method + ' ' + record.url }),
      el('div', { class: 'code res-body' }, pre),
      truncated ? el('p', { class: 'muted small', text: fillText('lab.response.truncated', { count: body.length }) }) : null,
      tokenOffer(record),
      el('details', { class: 'headers' },
        el('summary', { text: fillText('lab.response.request_headers', { count: record.requestHeaders.length }) }),
        headerList(record.requestHeaders)),
      el('details', { class: 'headers' },
        el('summary', { text: fillText('lab.response.headers', { count: record.headers.length }) }),
        headerList(record.headers))
    ])
  }

  /* ---------- Fluxo ---------- */

  const flow = { timer: null, run: 0, record: null, model: null, active: 0, end: 0, rows: [], segs: [], live: false }

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

  function stateAt (stages, index, active) {
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
    if (stateName === 'skip' || stateName === 'not_run') {
      return el('span', { class: 'flow-right', 'aria-hidden': 'true' }, codeOrLabel(stage.statusKey, stage.st))
    }
    if (stage.dur === undefined) return el('span', { class: 'flow-right' })
    return el('span', { class: 'flow-right flow-dur', text: core.formatDuration(stage.dur, language) + ' ms' })
  }

  // {instruction} só existe em lab.flow.how.user_not_found; os outros textos não têm marcador.
  function textBlock (titleKey, bodyKey, className) {
    return el('div', { class: 'flow-block ' + className }, el('strong', { class: 'flow-block-title', text: t(titleKey) }),
      el('p', { text: fillText(bodyKey, { instruction: t('lab.auth.how_to_get') }) }))
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
    return [context, el('div', { class: 'flow-times' },
      el('span', null, parts('lab.flow.server_time', { time: el('b', { text: core.formatDuration(serverTotal, language) + ' ms' }) })),
      el('span', null, parts('lab.time.browser', { time: el('b', { text: formatMs(record.ms) }) })))]
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
    }
    clearTimeout(flow.timer)
    flow.run++
    flow.record = record
    flow.live = !!live
    // O resultado de um envio pendente nunca foi anunciado: voltar à rota dele mostra o veredito na hora
    // e o anuncia, mesmo numa exibição quieta.
    flow.quiet = !!quiet && state.pendingId !== record.id
    flow.model = null
    $('flow-body').textContent = ''
    $('replay').disabled = true

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
    const stages = model.stages
    flow.end = stages.length + 1
    flow.active = animate ? nextActive(stages, 0) : flow.end

    // O veredito vem primeiro; os tempos viram legenda, abaixo da cascata.
    const [context, times] = flowContext(record, model)
    body.append(context)
    const summary = el('p', { class: 'flow-summary waiting' })
    const outside = el('div', { class: 'flow-outside', hidden: true })
    const list = el('ol', { class: 'flow-stages' })
    flow.rows = []
    // Uma grade só (core.flowColumns): o resumo, cada linha e as linhas das colunas usam as mesmas
    // colunas, uma por etapa e a da resposta.
    const columns = stages.length + 1
    body.style.setProperty('--wf-cols', core.flowColumns(model))
    const cellsOf = className => {
      const cells = []
      for (let column = 0; column < columns; column++) {
        cells.push(el('span', { class: 'wf-cell' + (column < stages.length ? ' wf-cell-stage' : ''), 'data-column': String(column) }))
      }
      return el('span', { class: className, 'aria-hidden': 'true' }, cells)
    }
    const segOf = (cell, failed, response) => {
      const seg = el('span', { class: 'flow-seg' + (failed ? ' flow-seg-fail' : '') + (response ? ' flow-seg-response' : '') })
      cell.append(seg)
      return seg
    }
    const summaryBar = cellsOf('wf-summary')
    const scale = el('div', { class: 'wf-scale', 'aria-hidden': 'true' }, el('span', { class: 'wf-label', text: t('lab.flow.summary_label') }), summaryBar)
    stages.forEach((stage, index) => {
      const track = cellsOf('wf-track')
      const seg = segOf(track.children[index], stage.st === 'failed')
      const summarySeg = segOf(summaryBar.children[index], stage.st === 'failed')

      const isFailed = model.failedStage === stage.name && stage.st === 'failed'
      const expandable = !!stage.descriptionKey || stage.rules.length > 0 || (isFailed && !!model.whyKey)
      const detailsId = 'flow-details-' + index
      const row = expandable
        ? el('button', { type: 'button', class: 'flow-row', 'aria-expanded': 'false', 'aria-controls': detailsId })
        : el('div', { class: 'flow-row' })
      let details = null
      if (expandable) {
        // Na etapa que parou, Por que parou aqui e Como seguir bastam; a descrição geral sai para caber.
        const explains = isFailed && !!model.whyKey
        details = el('div', { class: 'flow-details', id: detailsId, hidden: true },
          stage.descriptionKey && !explains ? el('p', { class: 'flow-description', text: t(stage.descriptionKey) }) : null,
          stage.rules.length ? el('ul', { class: 'flow-rules' }, stage.rules.map(ruleRow)) : null,
          isFailed && model.whyKey ? textBlock('ui.flow.why_title', model.whyKey, 'flow-why') : null,
          isFailed && model.howKey ? textBlock('ui.flow.how_title', model.howKey, 'flow-how') : null)
        row.addEventListener('click', () => setExpanded(index, details.hidden))
      }
      const li = el('li', { class: 'flow-stage' }, row, details)
      list.append(li)
      linkSummary(li, summaryBar.children[index], summarySeg)
      // Clicar no segmento do resumo abre a linha da etapa, como clicar na própria linha.
      if (expandable) summaryBar.children[index].addEventListener('click', () => setExpanded(index, details.hidden))
      flow.rows.push({ stage, li, row, details, expandable, track, seg, summarySeg, state: null })
    })
    const responseTrack = cellsOf('wf-track')
    const responseSeg = segOf(responseTrack.children[stages.length], false, true)
    const responseSummarySeg = segOf(summaryBar.children[stages.length], false, true)
    const responseRow = el('div', { class: 'flow-row' })
    const responseLi = el('li', { class: 'flow-stage flow-response' }, responseRow)
    list.append(responseLi)
    linkSummary(responseLi, summaryBar.children[stages.length], responseSummarySeg)
    flow.responseRow = { li: responseLi, row: responseRow, track: responseTrack, seg: responseSeg, summarySeg: responseSummarySeg, state: null }

    // Linhas das colunas: uma camada só, sobre o resumo e a lista inteira.
    const lines = el('div', { class: 'wf-lines', 'aria-hidden': 'true' }, cellsOf('wf-lines-cols'))
    lines.firstChild.querySelectorAll('.wf-cell').forEach(cell => { cell.className = '' })
    body.append(summary, outside, el('div', { class: 'wf' }, scale, list, lines), times, el('p', { class: 'flow-hint', text: t('lab.flow.hint') }))
    flow.summaryEl = summary
    flow.outsideEl = outside
    paintFlow()
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
      if (flow.active >= flow.end) finishFlow()
      else tick(run)
    }, delayAt(stages, flow.active))
  }

  function paintFlow () {
    const stages = flow.model.stages
    flow.rows.forEach((row, index) => {
      const stateName = stateAt(stages, index, flow.active)
      if (row.state === stateName) return
      row.state = stateName
      row.li.className = 'flow-stage flow-' + stateName
      const finished = stateName !== 'pending' && stateName !== 'running'
      const skipped = stateName === 'skip' || stateName === 'not_run'
      // O status para leitor de tela só entra quando a etapa terminou.
      row.row.replaceChildren(...[
        stageMark(stateName),
        finished ? srStatus(row.stage) : null,
        codeOrLabel(row.stage.labelKey, row.stage.name, 'flow-name'),
        row.track,
        endColumn(rightColumn(row.stage, stateName), row.expandable)
      ].filter(Boolean))
      // O segmento enche no resumo e na linha ao mesmo tempo, com a mesma duração.
      fillBoth(row, stateName, delayAt(stages, index))
      // Etapa que não rodou: o mesmo encaixe hachurado no resumo e na linha.
      row.seg.classList.toggle('flow-seg-skip', skipped)
      row.summarySeg.classList.toggle('flow-seg-skip', skipped)
    })
    const responseState = stateAt(stages, stages.length, flow.active)
    const response = flow.responseRow
    if (response.state === responseState) return
    response.state = responseState
    response.li.className = 'flow-stage flow-response flow-' + responseState
    let right
    if (responseState === 'done') right = el('span', { class: 'flow-right flow-dur', text: flow.model.statusCode !== null ? String(flow.model.statusCode) : '' })
    else right = el('span', { class: 'flow-right', text: responseState === 'running' ? t('ui.flow.running') : t('ui.flow.pending') })
    const mark = responseState === 'running' ? stageMark('running') : markEl(responseState === 'done' ? '→' : '○')
    response.row.replaceChildren(mark, el('span', { class: 'flow-name', text: t('ui.response') }), response.track, endColumn(right, false))
    fillBoth(response, responseState, RESPONSE_DELAY)
  }

  // A seta ocupa sempre o mesmo lugar, para o texto da coluna final alinhar em todas as linhas.
  function endColumn (right, expandable) {
    return el('span', { class: 'flow-end' }, right, el('span', { class: 'flow-caret', 'aria-hidden': 'true', text: expandable ? '▶' : '' }))
  }

  function fillBoth (row, stateName, delay) {
    [row.seg, row.summarySeg].forEach(seg => {
      const fill = fillEl(stateName, delay)
      seg.replaceChildren(...(fill ? [fill] : []))
    })
  }

  // O bloco inteiro da etapa (a linha e a explicação aberta) liga ao seu segmento no resumo: passar o
  // mouse ou levar o foco para dentro dele contorna o segmento; passar o mouse no segmento contorna o bloco.
  function linkSummary (block, cell, summarySeg) {
    const on = () => { block.classList.add('linked'); summarySeg.classList.add('linked') }
    const off = () => { block.classList.remove('linked'); summarySeg.classList.remove('linked') }
    cell.addEventListener('mouseenter', on)
    cell.addEventListener('mouseleave', off)
    block.addEventListener('mouseenter', () => summarySeg.classList.add('linked'))
    block.addEventListener('mouseleave', () => { if (!block.contains(document.activeElement)) summarySeg.classList.remove('linked') })
    block.addEventListener('focusin', () => summarySeg.classList.add('linked'))
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
  // texto do painel do Swagger (ui.*) não muda: a troca é só aqui, no lugar do parágrafo.
  function paintSchemaLink (index) {
    const row = flow.rows[index]
    const record = flow.record
    if (!row || !row.details || row.stage.name !== 'schema') return
    if (!record || !state.selected || core.recordKey(record) !== state.selected.key || !bodySchema(state.selected)) return
    if (!schemaTarget(record)) return
    const how = row.details.querySelector('.flow-how')
    if (!how) return
    how.querySelector('p').textContent = t('lab.flow.how.schema')
    how.append(el('button', { type: 'button', class: 'link-btn flow-schema-go', id: 'flow-schema-go', text: t('lab.schema.go'), onclick: () => goToSchema(record) }))
  }

  function finishFlow () {
    const model = flow.model
    const summary = flow.summaryEl
    const record = flow.record
    summary.textContent = ''
    summary.className = 'flow-summary ' + model.summary
    let spoken
    if (model.summary === 'stopped') {
      const index = model.stages.findIndex(stage => stage.name === model.failedStage && stage.st === 'failed')
      const stage = model.stages[index]
      summary.append(el('span', { text: t('ui.flow.stopped_at') }), codeOrLabel(stage.labelKey, stage.name, 'flow-summary-stage'))
      spoken = fillText('lab.announce.stopped', { status: statusLine(record), stage: stageName(stage) })
      paintSchemaLink(index)
      setExpanded(index, true)
    } else if (model.summary === 'outside') {
      summary.append(el('span', { text: t('ui.flow.outside') }))
      flow.outsideEl.hidden = false
      flow.outsideEl.replaceChildren(el('span', { text: t(model.whyKey) }), el('span', { text: t(model.howKey) }))
      spoken = fillText('lab.announce.outside', { status: statusLine(record) })
    } else {
      summary.append(el('span', { text: t('ui.flow.completed') }))
      spoken = fillText('lab.announce.completed', { status: statusLine(record) })
    }
    $('replay').disabled = false
    flowAnnounce(spoken)
  }

  function setupFlowControls () {
    $('flow-title').textContent = t('ui.flow.title')
    $('slow-label').textContent = t('ui.flow.slow_motion')
    $('replay').textContent = t('ui.flow.replay')
    const slow = $('slow')
    slow.checked = state.slow
    if (state.reduced) $('flow-controls').hidden = true
    slow.addEventListener('change', () => setSlow(!!slow.checked))
    $('replay').addEventListener('click', () => {
      if (flow.record) renderFlow(flow.record, flow.live, state.slow && !state.reduced)
    })
  }

  /* ---------- Início ---------- */

  function init () {
    setupTopbar()
    paintNotice()
    setupFlowControls()
    setupView()
    setupSide()
    // O CSS precisa da altura do Resultado para grudá-lo pela base quando ele, vazio, é mais alto que a janela.
    if (window.ResizeObserver) {
      new ResizeObserver(() => document.documentElement.style.setProperty('--res-h', $('result').offsetHeight + 'px')).observe($('result'))
    }
    renderHistory()
    renderResultEmpty(null)
    $('filter').addEventListener('input', renderRoutes)
    $('routes-toggle').addEventListener('click', () => setRoutesCollapsed(!$('routes').classList.contains('collapsed')))
    $('hist-clear').addEventListener('click', clearHistory)
    if (examplesQuery) {
      try {
        examplesQuery.addEventListener('change', paintDocResponses)
      } catch (e) {}
    }
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && $('request').contains(document.activeElement)) {
        event.preventDefault()
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
  }

  init()
})()
