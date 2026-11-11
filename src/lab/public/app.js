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
  const NARROW = '(max-width: 1099px)'
  const TOKEN_PILL = { none: 'lab.token.none', active: 'lab.token.active', expired: 'lab.token.expired' }
  const AUTH_CAPTION = { session: 'lab.auth.from_session', empty: 'lab.auth.empty', edited: 'lab.auth.edited' }
  const AUTH_PREVIEW_CHARS = 22

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

  function statusChip (record) {
    if (record.error) {
      return el('span', { class: 'chip fail' }, el('span', { 'aria-hidden': 'true', text: '✗' }), t('lab.history.failed'))
    }
    return el('span', { class: 'chip ' + statusClass(record.status) }, el('span', { 'aria-hidden': 'true', text: statusGlyph(record.status) }), statusLine(record))
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

  function isNarrow () {
    try {
      return window.matchMedia(NARROW).matches
    } catch (e) {
      return false
    }
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

  /* ---------- Estado ---------- */

  const state = {
    spec: null,
    specError: null,
    authHeader: 'Authorization',
    routes: [],
    selected: null,
    drafts: {},
    token: null,
    tokenAt: null,
    tokenExp: null,
    tokenEmail: null,
    history: [],
    shownId: null,
    seq: 0,
    loadSeq: 0,
    busy: false,
    loginBusy: false,
    slow: readSlowMotion(),
    reduced: prefersReducedMotion()
  }

  /* ---------- Topo e idioma ---------- */

  function routeHash (route) {
    return '#' + route.method + route.path
  }

  // Cada bandeira é um link comum para a mesma página no outro idioma, mantendo a rota escolhida.
  function updateLanguageLinks () {
    document.querySelectorAll('.flag').forEach(link => {
      const code = link.getAttribute('data-lang')
      link.setAttribute('href', '?lang=' + encodeURIComponent(code) + window.location.hash)
      if (code === language) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
    })
  }

  function setupTopbar () {
    $('version').textContent = version ? fillText('lab.topbar.version', { version }) : ''
    updateLanguageLinks()
    document.querySelectorAll('.flag').forEach(link => {
      link.addEventListener('click', () => {
        try {
          window.localStorage.setItem(LANGUAGE_KEY, link.getAttribute('data-lang'))
        } catch (e) {}
      })
    })
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
      prefillLogin()
      renderRoutes()
      renderRequest()
      renderSession()
    }).catch(error => {
      if (seq !== state.loadSeq) return
      state.specError = (error && error.message) || String(error)
      state.routes = []
      renderRoutes()
      renderRequest()
      announce(t('lab.routes.error'))
    })
  }

  function loginRoute () {
    return state.routes.find(route => route.method === 'post' && route.path === LOGIN_PATH) || null
  }

  function prefillLogin () {
    const route = loginRoute()
    const example = route && route.body ? route.body.example : null
    if (!example || typeof example !== 'object') return
    const email = $('login-email')
    const password = $('login-password')
    if (!email.value && typeof example.email === 'string') email.value = example.email
    if (!password.value && typeof example.password === 'string') password.value = example.password
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
        el('span', { class: 'sum', text: route.summary }))))
      })
      list.append(el('div', { class: 'group' }, el('h3', null, tag || t('lab.routes.untagged'), el('span', { text: String(items.length) })), ul))
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
    if (fromClick && isNarrow()) {
      setRoutesCollapsed(true)
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
        params[param.in + ':' + param.name] = param.in === 'path' && param.def !== undefined ? String(param.def) : ''
      })
      state.drafts[route.key] = { params, body: route.body ? JSON.stringify(route.body.example, null, 2) : '' }
    }
    return state.drafts[route.key]
  }

  function authValue (route) {
    return core.authValueFor(draftFor(route), state.token)
  }

  function currentRequest (route) {
    return core.buildRequest(route, draftFor(route), { baseUrl, authValue: authValue(route), authHeader: state.authHeader })
  }

  function authCaptionState (draft) {
    if (typeof draft.auth === 'string') return 'edited'
    return state.token ? 'session' : 'empty'
  }

  function renderRequest () {
    const box = $('request')
    box.textContent = ''
    if (state.specError || !state.spec || !state.selected) {
      let message = t('lab.request.loading')
      if (state.specError) message = t('lab.request.no_spec')
      else if (state.spec) message = t('lab.request.choose')
      box.append(el('h2', { class: 'card-title', id: 'req-title', text: t('lab.request.title') }), el('p', { class: 'muted small', text: message }))
      return
    }
    const route = state.selected
    const draft = draftFor(route)

    append(box, [
      el('div', { class: 'eyebrow' },
        el('span', { class: 'card-title', text: t('lab.request.title') }),
        el('span', { 'aria-hidden': 'true', text: '·' }),
        el('span', { text: route.tag || t('lab.routes.untagged') })),
      el('div', { class: 'req-line' }, methodBadge(route.method), el('code', { class: 'req-path', text: route.path })),
      el('h1', { class: 'req-title', id: 'req-title', text: route.summary || route.method.toUpperCase() + ' ' + route.path }),
      route.description ? el('div', { class: 'req-desc' }, richText(route.description)) : null,
      authNote(route, draft)
    ])

    const groups = [
      { kind: 'path', legend: t('lab.params.path'), items: route.params.filter(param => param.in === 'path') },
      { kind: 'query', legend: t('lab.params.query'), items: route.params.filter(param => param.in === 'query') }
    ]
    groups.forEach(group => {
      if (!group.items.length) return
      const grid = el('div', { class: 'params' })
      group.items.forEach(param => grid.append(paramField(param, draft)))
      box.append(el('fieldset', null, el('legend', { text: group.legend }), grid))
    })

    if (route.body) box.append(bodyEditor(route, draft))

    box.append(
      el('div', null,
        el('h3', { class: 'card-title sent-title', text: t('lab.sent.title') }),
        el('dl', { class: 'sent', id: 'sent' })),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn btn-primary', id: 'run', onclick: execute }),
        el('button', { type: 'button', class: 'btn', id: 'copy-curl', onclick: copyCurl, text: t('lab.actions.copy_curl') }),
        el('span', { class: 'kbd-hint' }, parts('lab.actions.shortcut', { ctrl: el('kbd', { text: 'Ctrl' }), enter: el('kbd', { text: 'Enter' }) })),
        el('span', { class: 'copy-msg', id: 'copy-msg' })),
      el('details', { class: 'curl', id: 'curl-details' },
        el('summary', { text: t('lab.curl.show') }),
        el('div', { class: 'code' }, el('pre', { id: 'curl-pre' })))
    )
    refreshPreview()
    setBusy(state.busy)
  }

  // O campo é montado uma vez por rota: refreshPreview roda a cada tecla e só ajusta textos e
  // classes, para que digitar não tire o foco nem mova o cursor.
  function authNote (route, draft) {
    if (!route.needsToken) {
      return el('div', { class: 'auth-note', id: 'auth-note' }, lockIcon(16),
        el('span', null, el('strong', { text: t('lab.auth.public_title') }), ' ', t('lab.auth.public')))
    }
    const input = el('input', {
      class: 'input mono',
      id: 'auth-input',
      type: 'text',
      autocomplete: 'off',
      spellcheck: 'false',
      autocapitalize: 'off',
      'aria-describedby': 'auth-caption auth-error'
    })
    input.value = authValue(route)
    const error = el('p', { class: 'auth-error', id: 'auth-error' })
    const clearError = () => {
      input.removeAttribute('aria-invalid')
      error.textContent = ''
    }
    input.addEventListener('input', () => {
      draft.auth = input.value
      clearError()
      refreshPreview()
    })
    const useSession = el('button', {
      type: 'button',
      class: 'btn btn-quiet',
      id: 'auth-use-session',
      text: t('lab.auth.use_session'),
      onclick: () => {
        delete draft.auth
        clearError()
        refreshPreview()
        input.focus()
        announce(fillText('lab.auth.follows_session', { header: state.authHeader }))
      }
    })
    return el('div', { class: 'auth-note', id: 'auth-note' }, lockIcon(16),
      el('div', { class: 'auth-body' },
        el('strong', { text: t('lab.auth.needed_title') }),
        el('label', { class: 'param-label', for: 'auth-input' }, el('code', { text: state.authHeader })),
        input,
        el('p', { class: 'auth-caption', id: 'auth-caption' }),
        error,
        useSession))
  }

  function paramField (param, draft) {
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
        placeholder: param.example !== undefined ? fillText('lab.params.example', { example: param.example }) : null
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
    const helpId = param.description ? id + '-help' : null
    if (helpId) input.setAttribute('aria-describedby', helpId)
    return el('div', { class: 'field' },
      el('label', { class: 'param-label', for: id },
        el('code', { text: param.name }),
        param.required ? el('span', { class: 'req-mark', text: t('lab.params.required') }) : null),
      input,
      helpId ? el('span', { class: 'param-help', id: helpId, text: param.description }) : null)
  }

  function bodyEditor (route, draft) {
    const editor = el('textarea', { class: 'editor', id: 'body-editor', spellcheck: 'false', autocomplete: 'off', wrap: 'off', 'aria-describedby': 'json-note' })
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
    editor.addEventListener('input', () => {
      draft.body = editor.value
      checkJson(true)
      refreshPreview()
    })
    checkJson(false)
    return el('div', { class: 'field' },
      el('div', { class: 'body-head' },
        el('label', { for: 'body-editor', text: t('lab.body.label') }),
        el('span', { class: 'grow' }),
        el('button', {
          type: 'button',
          class: 'btn btn-quiet',
          text: t('lab.body.restore'),
          onclick: () => {
            draft.body = JSON.stringify(route.body.example, null, 2)
            editor.value = draft.body
            checkJson(false)
            refreshPreview()
          }
        })),
      editor,
      note)
  }

  function refreshPreview () {
    const route = state.selected
    if (!route || !$('sent')) return
    const request = currentRequest(route)
    const sendsAuth = request.headers.some(header => header[0] === state.authHeader)
    if (route.needsToken) {
      const draft = draftFor(route)
      const captionState = authCaptionState(draft)
      $('auth-note').className = 'auth-note' + (sendsAuth ? ' ok' : ' need')
      $('auth-caption').textContent = t(AUTH_CAPTION[captionState])
      $('auth-use-session').hidden = captionState !== 'edited'
      const input = $('auth-input')
      if (captionState !== 'edited' && input.value !== authValue(route)) input.value = authValue(route)
    }
    const list = $('sent')
    list.textContent = ''
    list.append(el('dt', { text: t('lab.sent.url') }), el('dd', { text: request.method + ' ' + request.url }))
    request.headers.forEach(header => {
      const long = header[0] === state.authHeader && header[1].length > AUTH_PREVIEW_CHARS
      list.append(el('dt', { text: header[0] }), el('dd', { text: long ? header[1].slice(0, AUTH_PREVIEW_CHARS) + '…' : header[1] }))
    })
    if (route.needsToken && !sendsAuth) {
      list.append(el('dt', { text: state.authHeader }), el('dd', { class: 'absent', text: t('lab.sent.not_sent') }))
    }
    $('curl-pre').textContent = core.curlOf(request)
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

  function copyCurl () {
    const command = core.curlOf(currentRequest(state.selected))
    const done = ok => {
      const message = $('copy-msg')
      const text = ok ? t('lab.actions.copied') : t('lab.actions.copy_failed')
      message.textContent = text
      message.className = 'copy-msg' + (ok ? '' : ' fail')
      announce(text)
      if (!ok) $('curl-details').open = true
      setTimeout(() => {
        if ($('copy-msg') === message) message.textContent = ''
      }, 2500)
    }
    const fallback = () => {
      const area = el('textarea', { class: 'copy-buffer', 'aria-hidden': 'true', tabindex: '-1' })
      area.value = command
      document.body.append(area)
      area.select()
      let ok = false
      try {
        ok = document.execCommand('copy')
      } catch (e) {}
      area.remove()
      done(ok)
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(command).then(() => done(true), fallback)
    else fallback()
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
      requestHeaders: request.headers.map(header => [header[0], header[1]]),
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
    state.busy = true
    setBusy(true)
    send(route, currentRequest(route), 'route').then(record => {
      state.busy = false
      setBusy(false)
      addHistory(record)
      show(record, true)
    })
  }

  /* ---------- Sessão ---------- */

  function setSessionMessage (message, isError) {
    const node = $('session-msg')
    node.textContent = message || ''
    node.className = 'session-msg' + (isError ? ' fail' : '')
  }

  function clearToken () {
    state.token = null
    state.tokenAt = null
    state.tokenExp = null
    state.tokenEmail = null
    renderSession()
    refreshPreview()
  }

  function tokenState () {
    if (!state.token) return 'none'
    return state.tokenExp && state.tokenExp.getTime() <= Date.now() ? 'expired' : 'active'
  }

  function renderSession () {
    const pill = $('token-pill')
    const description = $('token-state')
    const current = tokenState()
    pill.className = 'pill' + (current === 'active' ? ' on' : current === 'expired' ? ' expired' : '')
    pill.textContent = t(TOKEN_PILL[current])
    const values = {
      header: state.authHeader,
      time: state.tokenAt ? clock(state.tokenAt) : '',
      email: state.tokenEmail || '',
      expires: state.tokenExp ? clock(state.tokenExp) : ''
    }
    if (current === 'none') description.textContent = fillText('lab.token.state_none', values)
    else if (current === 'expired') description.textContent = fillText('lab.token.state_expired', values)
    else if (state.tokenExp) description.textContent = fillText('lab.token.state_active', values)
    else description.textContent = fillText('lab.token.state_active_no_exp', values)
    $('logout-btn').disabled = !state.token
    $('login-btn').textContent = state.token ? t('lab.session.login_again') : t('lab.session.login')
  }

  function login (event) {
    event.preventDefault()
    if (state.loginBusy) return
    const email = $('login-email').value.trim()
    const password = $('login-password').value
    const route = loginRoute() || { method: 'post', path: LOGIN_PATH }
    const request = {
      method: 'POST',
      url: baseUrl + LOGIN_PATH,
      headers: [['Content-Type', 'application/json']],
      body: JSON.stringify({ email, password })
    }
    const button = $('login-btn')
    state.loginBusy = true
    button.disabled = true
    setSessionMessage(t('lab.session.logging_in'))
    send(route, request, 'login').then(record => {
      state.loginBusy = false
      button.disabled = false
      addHistory(record)
      let body = null
      try {
        body = JSON.parse(record.bodyText)
      } catch (e) {}
      let message
      let failed = true
      if (record.error) {
        message = fillText('lab.session.network_error', { error: record.error })
      } else if (record.status === 200 && body && typeof body.authorization === 'string' && body.authorization) {
        state.token = body.authorization
        state.tokenAt = new Date()
        state.tokenExp = core.decodeJwtExp(body.authorization)
        state.tokenEmail = email
        message = t('lab.session.logged_in')
        failed = false
      } else if (body && typeof body.message === 'string') {
        message = fillText('lab.session.refused', { status: statusLine(record), message: body.message })
      } else {
        message = fillText('lab.session.refused_no_message', { status: statusLine(record) })
      }
      setSessionMessage(message, failed)
      announce(message)
      renderSession()
      refreshPreview()
    })
  }

  /* ---------- Histórico ---------- */

  function flowModelOf (record) {
    return core.buildFlowModel(core.parseStages(record.stagesHeader), record.status, texts)
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
    renderHistory()
  }

  function renderHistory () {
    const box = $('history-body')
    box.textContent = ''
    $('hist-count').textContent = state.history.length ? String(state.history.length) : ''
    $('hist-clear').hidden = !state.history.length
    if (!state.history.length) {
      box.append(el('p', { class: 'muted small', text: t('lab.history.empty') }))
      return
    }
    const list = el('ol', { class: 'history-list' })
    state.history.forEach(record => {
      const where = flowWhere(record)
      const text = record.kind === 'login' ? fillText('lab.history.session_entry', { flow: where.text }) : where.text
      list.append(el('li', null, el('button', {
        type: 'button',
        class: 'entry',
        'data-id': String(record.id),
        'aria-current': record.id === state.shownId ? 'true' : null,
        onclick: () => show(record, false)
      },
      el('time', { datetime: record.at.toISOString(), text: clock(record.at) }),
      methodBadge(record.method),
      el('span', { class: 'path', text: record.path }),
      statusChip(record),
      el('span', { class: 'where ' + where.className, text }))))
    })
    box.append(list)
  }

  /* ---------- Exibição de um registro ---------- */

  function show (record, live) {
    state.shownId = record.id
    document.querySelectorAll('.entry').forEach(button => {
      if (button.getAttribute('data-id') === String(record.id)) button.setAttribute('aria-current', 'true')
      else button.removeAttribute('aria-current')
    })
    renderResponse(record, live)
    renderFlow(record, live, live && state.slow && !state.reduced)
  }

  function originTag (record, live) {
    if (live) return el('span', { class: 'tag', text: fillText('lab.origin.now', { time: clock(record.at) }) })
    return el('span', { class: 'tag history-tag', text: fillText('lab.origin.history', { time: clock(record.at) }) })
  }

  function renderResponse (record, live) {
    const area = $('res-body-area')
    area.textContent = ''
    const origin = $('res-origin')
    origin.textContent = ''
    origin.append(originTag(record, live))
    const sessionTag = record.kind === 'login' ? el('span', { class: 'tag', text: t('lab.response.session_request') }) : null
    if (record.error) {
      area.append(el('div', { class: 'net-error' },
        el('strong', { text: t('lab.response.network_error') }),
        el('span', { class: 'small', text: fillText('lab.response.network_detail', { error: record.error }) }),
        el('span', { class: 'res-url', text: record.method + ' ' + record.url }),
        sessionTag))
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
      el('p', { class: 'res-url' }, record.method + ' ' + record.url, sessionTag ? ' ' : null, sessionTag),
      el('div', { class: 'code res-body' }, pre),
      truncated ? el('p', { class: 'muted small', text: fillText('lab.response.truncated', { count: body.length }) }) : null,
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
    if (stateName === 'skip' || stateName === 'not_run') {
      return el('span', { class: 'flow-right', 'aria-hidden': 'true' }, codeOrLabel(stage.statusKey, stage.st))
    }
    if (stage.dur === undefined) return el('span', { class: 'flow-right' })
    return el('span', { class: 'flow-right flow-dur', text: core.formatDuration(stage.dur, language) + ' ms' })
  }

  function textBlock (titleKey, bodyKey, className) {
    return el('div', { class: 'flow-block ' + className }, el('strong', { class: 'flow-block-title', text: t(titleKey) }), el('p', { text: t(bodyKey) }))
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

  function renderFlow (record, live, animate) {
    clearTimeout(flow.timer)
    flow.run++
    flow.record = record
    flow.live = !!live
    flow.model = null
    $('flow-body').textContent = ''
    $('replay').disabled = true

    if (record.error) {
      flowNote(record, t('lab.flow.no_response'))
      announce(t('lab.response.network_error'))
      return
    }
    if (record.stagesHeader === null) {
      flowNote(record, parts('lab.flow.no_header', { header: el('code', { class: 'nowrap', text: 'X-ServeRest-Stages' }) }))
      announce(fillText('lab.announce.no_flow', { status: statusLine(record) }))
      return
    }
    const model = flowModelOf(record)
    if (!model) {
      flowNote(record, parts('lab.flow.empty_header', { header: el('code', { class: 'nowrap', text: 'X-ServeRest-Stages' }) }))
      announce(fillText('lab.announce.no_flow', { status: statusLine(record) }))
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

    append(body, flowContext(record, model))
    const summary = el('p', { class: 'flow-summary waiting' })
    const bar = el('div', { class: 'flow-bar', 'aria-hidden': 'true' })
    const outside = el('div', { class: 'flow-outside', hidden: true })
    const list = el('ol', { class: 'flow-stages' })
    flow.segs = []
    flow.rows = []
    stages.forEach((stage, index) => {
      const seg = el('span', { class: 'flow-seg' + (stage.st === 'failed' ? ' flow-seg-fail' : '') })
      seg.style.flexGrow = String(core.segmentGrow(stage))
      bar.append(seg)
      flow.segs.push(seg)

      const isFailed = model.failedStage === stage.name && stage.st === 'failed'
      const expandable = !!stage.descriptionKey || stage.rules.length > 0 || (isFailed && !!model.whyKey)
      const detailsId = 'flow-details-' + index
      const row = expandable
        ? el('button', { type: 'button', class: 'flow-row', 'aria-expanded': 'false', 'aria-controls': detailsId })
        : el('div', { class: 'flow-row' })
      let details = null
      if (expandable) {
        details = el('div', { class: 'flow-details', id: detailsId, hidden: true },
          stage.descriptionKey ? el('p', { class: 'flow-description', text: t(stage.descriptionKey) }) : null,
          stage.rules.length ? el('ul', { class: 'flow-rules' }, stage.rules.map(ruleRow)) : null,
          isFailed && model.whyKey ? textBlock('ui.flow.why_title', model.whyKey, 'flow-why') : null,
          isFailed && model.howKey ? textBlock('ui.flow.how_title', model.howKey, 'flow-how') : null)
        row.addEventListener('click', () => setExpanded(index, details.hidden))
      }
      const li = el('li', { class: 'flow-stage' }, row, details)
      list.append(li)
      flow.rows.push({ stage, li, row, details, expandable, state: null })
    })
    const responseSeg = el('span', { class: 'flow-seg flow-seg-response' })
    bar.append(responseSeg)
    flow.segs.push(responseSeg)
    const responseRow = el('div', { class: 'flow-row' })
    const responseLi = el('li', { class: 'flow-stage flow-response' }, responseRow)
    list.append(responseLi)
    flow.responseRow = { li: responseLi, row: responseRow, state: null }

    body.append(summary, bar, outside, list, el('p', { class: 'flow-hint', text: t('lab.flow.hint') }))
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
      // O status para leitor de tela só entra quando a etapa terminou.
      row.row.replaceChildren(...[
        stageMark(stateName),
        finished ? srStatus(row.stage) : null,
        codeOrLabel(row.stage.labelKey, row.stage.name, 'flow-name'),
        rightColumn(row.stage, stateName),
        row.expandable ? el('span', { class: 'flow-caret', 'aria-hidden': 'true', text: '▶' }) : null
      ].filter(Boolean))
      const seg = flow.segs[index]
      seg.classList.toggle('flow-seg-skip', stateName === 'skip' || stateName === 'not_run')
      seg.replaceChildren()
      const fill = fillEl(stateName, delayAt(stages, index))
      if (fill) seg.append(fill)
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
    response.row.replaceChildren(mark, el('span', { class: 'flow-name', text: t('ui.response') }), right)
    const responseSeg = flow.segs[flow.segs.length - 1]
    responseSeg.replaceChildren()
    const fill = fillEl(responseState, RESPONSE_DELAY)
    if (fill) responseSeg.append(fill)
  }

  function setExpanded (index, open) {
    const row = flow.rows[index]
    if (!row || !row.details) return
    row.details.hidden = !open
    row.row.setAttribute('aria-expanded', open ? 'true' : 'false')
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
    announce(spoken)
  }

  function renderFlowEmpty () {
    const body = $('flow-body')
    body.textContent = ''
    const bar = el('div', { class: 'flow-bar', 'aria-hidden': 'true' })
    ;[3, 2, 4, 3, 2].forEach(grow => {
      const seg = el('span', { class: 'flow-seg' })
      seg.style.flexGrow = String(grow)
      bar.append(seg)
    })
    bar.append(el('span', { class: 'flow-seg flow-seg-response' }))
    body.append(el('div', { class: 'flow-empty' }, bar, el('p', { class: 'flow-note', text: t('lab.flow.empty') })))
  }

  function setupFlowControls () {
    $('flow-title').textContent = t('ui.flow.title')
    $('slow-label').textContent = t('ui.flow.slow_motion')
    $('replay').textContent = t('ui.flow.replay')
    const slow = $('slow')
    slow.checked = state.slow
    if (state.reduced) $('flow-controls').hidden = true
    slow.addEventListener('change', () => {
      state.slow = !!slow.checked
      saveSlowMotion(state.slow)
      // Desligar no meio da animação leva direto ao estado final, como no painel do Swagger.
      if (!state.slow && flow.model && flow.active < flow.end) {
        clearTimeout(flow.timer)
        flow.run++
        flow.active = flow.end
        paintFlow()
        finishFlow()
      }
    })
    $('replay').addEventListener('click', () => {
      if (flow.record) renderFlow(flow.record, flow.live, state.slow && !state.reduced)
    })
  }

  /* ---------- Início ---------- */

  function init () {
    setupTopbar()
    setupFlowControls()
    renderFlowEmpty()
    renderHistory()
    renderSession()
    $('login-form').addEventListener('submit', login)
    $('logout-btn').addEventListener('click', () => {
      clearToken()
      setSessionMessage(t('lab.session.logged_out'))
      announce(t('lab.session.logged_out'))
    })
    $('filter').addEventListener('input', renderRoutes)
    $('routes-toggle').addEventListener('click', () => setRoutesCollapsed(!$('routes').classList.contains('collapsed')))
    $('hist-clear').addEventListener('click', () => {
      state.history = []
      state.shownId = null
      renderHistory()
    })
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
    setInterval(() => {
      if (state.token) renderSession()
    }, 15000)
    if (isNarrow()) setRoutesCollapsed(true)
    loadSpec()
  }

  init()
})()
