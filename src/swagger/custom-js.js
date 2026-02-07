/* global __RELEASE_INFO__, __CURRENT_VERSION__, __FORCE_BANNER__, NodeFilter, MutationObserver, caches */
(function () {
  const releaseInfo = __RELEASE_INFO__
  const currentVersion = __CURRENT_VERSION__
  const forceBanner = __FORCE_BANNER__

  function normalizeVersion (version) {
    if (!version) return ''
    return version.toString().trim().replace(/^v/i, '')
  }

  const toastTranslations = {
    'pt-BR': {
      title: 'Nova release disponível',
      link: 'Ver release',
      closeLabel: 'Fechar aviso de release',
      meta: (latest, current) => 'v' + latest + ' (v' + current + ' instalada)'
    },
    en: {
      title: 'New release available',
      link: 'View release',
      closeLabel: 'Close release notice',
      meta: (latest, current) => 'v' + latest + ' (v' + current + ' installed)'
    },
    es: {
      title: 'Nueva versión disponible',
      link: 'Ver versión',
      closeLabel: 'Cerrar aviso de versión',
      meta: (latest, current) => 'v' + latest + ' (v' + current + ' instalada)'
    }
  }

  function getToastTranslation (language) {
    return toastTranslations[language] || toastTranslations['pt-BR']
  }

  function renderReleaseToast (releaseDataOverride) {
    const info = releaseDataOverride !== undefined ? releaseDataOverride : releaseInfo
    const current = normalizeVersion(currentVersion)
    let latestVersion = normalizeVersion(info && (info.version || info.tag))
    if (forceBanner) {
      latestVersion = normalizeVersion('999.999.999')
    }
    if (!latestVersion || (!current && !forceBanner)) return
    if (latestVersion === current && !forceBanner) return
    if (document.querySelector('.release-toast')) return
    const root = document.querySelector('.swagger-ui') || document.body

    const toast = document.createElement('div')
    toast.className = 'release-toast'
    toast.setAttribute('aria-live', 'polite')
    toast.dataset.latestVersion = latestVersion
    toast.dataset.currentVersion = current

    const content = document.createElement('div')
    content.className = 'release-toast__content'

    const title = document.createElement('div')
    title.className = 'release-toast__title'
    const titleIcon = document.createElement('span')
    titleIcon.className = 'release-toast__title-icon'
    titleIcon.textContent = '⚡'
    const translation = getToastTranslation(getPreferredLanguage())
    const titleText = document.createElement('span')
    titleText.textContent = translation.title
    title.appendChild(titleIcon)
    title.appendChild(titleText)

    const meta = document.createElement('div')
    meta.className = 'release-toast__meta'
    meta.textContent = translation.meta(latestVersion, current)

    const link = document.createElement('a')
    link.className = 'release-toast__link'
    link.href = (info && info.url) ? info.url : 'https://github.com/ServeRest/ServeRest/releases'
    link.textContent = translation.link
    link.target = '_blank'
    link.rel = 'noopener noreferrer'

    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'release-toast__close'
    close.setAttribute('aria-label', translation.closeLabel)
    close.textContent = '×'
    close.addEventListener('click', function () {
      toast.remove()
    })

    content.appendChild(title)
    content.appendChild(meta)
    content.appendChild(link)
    toast.appendChild(content)
    toast.appendChild(close)
    root.appendChild(toast)
  }

  function updateReleaseToastLanguage (language) {
    const toast = document.querySelector('.release-toast')
    if (!toast) return
    const translation = getToastTranslation(language)
    const latestVersion = toast.dataset.latestVersion || ''
    const current = toast.dataset.currentVersion || ''
    const title = toast.querySelector('.release-toast__title span:last-child')
    const meta = toast.querySelector('.release-toast__meta')
    const link = toast.querySelector('.release-toast__link')
    const close = toast.querySelector('.release-toast__close')
    if (title) title.textContent = translation.title
    if (meta) meta.textContent = translation.meta(latestVersion, current)
    if (link) link.textContent = translation.link
    if (close) close.setAttribute('aria-label', translation.closeLabel)
  }

  const uiLabelTranslations = [
    { 'pt-BR': 'Parâmetros', en: 'Parameters', es: 'Parámetros' },
    { 'pt-BR': 'Parâmetro', en: 'Parameter', es: 'Parámetro' },
    { 'pt-BR': 'Respostas', en: 'Responses', es: 'Respuestas' },
    { 'pt-BR': 'Resposta', en: 'Response', es: 'Respuesta' },
    { 'pt-BR': 'Corpo da requisição', en: 'Request body', es: 'Cuerpo de la solicitud' },
    { 'pt-BR': 'Corpo da resposta', en: 'Response body', es: 'Cuerpo de la respuesta' },
    { 'pt-BR': 'Exemplo', en: 'Example Value', es: 'Ejemplo' },
    { 'pt-BR': 'Modelo', en: 'Model', es: 'Modelo' },
    { 'pt-BR': 'Valor', en: 'Value', es: 'Valor' },
    { 'pt-BR': 'Descrição', en: 'Description', es: 'Descripción' },
    { 'pt-BR': 'Obrigatório', en: 'Required', es: 'Obligatorio' },
    { 'pt-BR': 'Testar', en: 'Try it out', es: 'Probar' },
    { 'pt-BR': 'Executar', en: 'Execute', es: 'Ejecutar' },
    { 'pt-BR': 'Cancelar', en: 'Cancel', es: 'Cancelar' },
    { 'pt-BR': 'Limpar', en: 'Clear', es: 'Limpiar' },
    { 'pt-BR': 'Autorizar', en: 'Authorize', es: 'Autorizar' },
    { 'pt-BR': 'Servidores', en: 'Servers', es: 'Servidores' },
    { 'pt-BR': 'Sem parâmetros', en: 'No parameters', es: 'Sin parámetros' },
    { 'pt-BR': 'Sem respostas', en: 'No responses', es: 'Sin respuestas' },
    { 'pt-BR': 'Carregando', en: 'LOADING', es: 'Cargando' },
    { 'pt-BR': 'Baixar', en: 'Download', es: 'Descargar' },
    { 'pt-BR': 'Autenticações disponíveis', en: 'Available authorizations', es: 'Autenticaciones disponibles' },
    { 'pt-BR': 'exemplo', en: 'example', es: 'ejemplo' }
  ]

  const buildExactMap = (targetLang) => {
    const map = new Map()
    uiLabelTranslations.forEach(labels => {
      const target = labels[targetLang]
      if (!target) return
      Object.keys(labels).forEach(sourceLang => {
        if (sourceLang === targetLang) return
        const source = labels[sourceLang]
        if (!source || source === target) return
        map.set(source, target)
      })
    })
    return map
  }

  const translations = {
    'pt-BR': {
      exact: buildExactMap('pt-BR'),
      replace: [
        { regex: /\binteger\b/g, value: 'inteiro' }
      ]
    },
    en: {
      exact: buildExactMap('en'),
      replace: []
    },
    es: {
      exact: buildExactMap('es'),
      replace: [
        { regex: /\binteger\b/g, value: 'entero' }
      ]
    }
  }

  const flagUrls = {
    'pt-BR': '/flags/flag_brazil.svg',
    en: '/flags/flag_uk.svg',
    es: '/flags/flag_spain.svg'
  }

  function preloadFlags () {
    if (typeof document === 'undefined' || !document.head) return
    Object.values(flagUrls).forEach(href => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = href
      document.head.appendChild(link)
    })
  }

  const swaggerJsonUrls = ['/swagger.json?lang=pt-BR', '/swagger.json?lang=en', '/swagger.json?lang=es']

  function preloadSwaggerJson () {
    if (typeof document === 'undefined' || !document.head) return
    swaggerJsonUrls.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'fetch'
      link.href = href
      link.crossOrigin = ''
      document.head.appendChild(link)
    })
  }

  const supportedLanguages = [
    { code: 'pt-BR', label: 'Português (Brasil)' },
    { code: 'en', label: 'English (UK)' },
    { code: 'es', label: 'Español' }
  ]

  let originalTextNodes = new WeakMap()

  function getPreferredLanguage () {
    return window.localStorage.getItem('swaggerLanguage') || 'pt-BR'
  }

  function setPreferredLanguage (code) {
    window.localStorage.setItem('swaggerLanguage', code)
  }

  let endpointBlockOpen = false

  function getLanguageFromQuery () {
    const url = new URL(window.location.href)
    return url.searchParams.get('lang') || ''
  }

  function resetTranslationCache () {
    originalTextNodes = new WeakMap()
  }

  const swaggerSpecCache = {}

  function prefetchSwaggerSpecs () {
    const queryLang = getLanguageFromQuery()
    const preferred = getPreferredLanguage()
    const code = supportedLanguages.some(l => l.code === queryLang)
      ? queryLang
      : (supportedLanguages.some(l => l.code === preferred) ? preferred : 'pt-BR')
    const url = '/swagger.json?lang=' + encodeURIComponent(code)
    fetch(url)
      .then(r => r.json())
      .then(spec => { swaggerSpecCache[code] = spec })
      .catch(() => {})
  }

  function updateSwaggerSpec (language, shouldRefreshOpenOps = false) {
    const specUrl = new URL('/swagger.json', window.location.origin)
    specUrl.searchParams.set('lang', language)
    const applySpec = (spec) => {
      if (!window.ui || !window.ui.specActions) return
      resetTranslationCache()
      window.ui.specActions.updateSpec(JSON.stringify(spec))
      if (window.ui.specActions.updateUrl) {
        window.ui.specActions.updateUrl(specUrl.toString())
      }
      if (window.ui.specActions.updateJsonSpec) {
        window.ui.specActions.updateJsonSpec(spec)
      }
      let parsedSpec = null
      if (window.ui.specActions.parseToJson) {
        parsedSpec = window.ui.specActions.parseToJson(JSON.stringify(spec))
      }
      if (parsedSpec && window.ui.specActions.updateJsonSpec) {
        window.ui.specActions.updateJsonSpec(parsedSpec)
      }
      if (window.ui.specActions.updateResolved) {
        window.ui.specActions.updateResolved(parsedSpec || spec)
      }
      if (window.ui.specActions.invalidateResolvedSubtreeCache) {
        window.ui.specActions.invalidateResolvedSubtreeCache()
      }
      if (window.ui.specActions.resolveSpec) {
        const resolveResult = window.ui.specActions.resolveSpec(specUrl.toString())
        if (resolveResult && typeof resolveResult.catch === 'function') {
          resolveResult.catch(() => {})
        }
      }
      if (shouldRefreshOpenOps) {
        refreshOpenOperations()
      }
    }
    const cached = swaggerSpecCache[language]
    if (cached) {
      applySpec(cached)
      return
    }
    fetch(specUrl.toString())
      .then(response => response.json())
      .then(spec => {
        swaggerSpecCache[language] = spec
        applySpec(spec)
      })
      .catch(() => {})
  }

  function refreshOpenOperations () {
    const openOperations = document.querySelectorAll('.opblock.is-open .opblock-summary')
    if (!openOperations.length) return
    const requestResolvedSubtree = window.ui?.specActions?.requestResolvedSubtree
    if (requestResolvedSubtree) {
      openOperations.forEach(summary => {
        const opblock = summary.closest('.opblock')
        if (!opblock) return
        const methodText = opblock.querySelector('.opblock-summary-method')?.textContent?.trim() || ''
        const pathText = opblock.querySelector('.opblock-summary-path')?.textContent?.trim() || ''
        if (!methodText || !pathText) return
        requestResolvedSubtree(['paths', pathText, methodText.toLowerCase()])
      })
    }
    openOperations.forEach(summary => summary.click())
    setTimeout(() => {
      openOperations.forEach(summary => summary.click())
    }, 0)
  }

  function shouldTranslateNode (node) {
    if (!node || !node.nodeValue || !node.nodeValue.trim()) return false
    const parent = node.parentElement
    if (!parent) return false
    if (parent.closest('.lang-switcher')) return false
    return !parent.closest('code, pre, textarea, input')
  }

  function translateNodeText (node, language) {
    const config = translations[language] || translations['pt-BR']
    if (!originalTextNodes.has(node)) {
      originalTextNodes.set(node, node.nodeValue)
    }
    const original = originalTextNodes.get(node)
    const trimmed = original.trim()
    if (config.exact.has(trimmed)) {
      const updated = original.replace(trimmed, config.exact.get(trimmed))
      if (updated !== node.nodeValue) {
        node.nodeValue = updated
      }
      return
    }
    let updated = original
    config.replace.forEach(({ regex, value }) => {
      updated = updated.replace(regex, value)
    })
    if (updated !== original) {
      node.nodeValue = updated
      return
    }
    if (node.nodeValue !== original) {
      node.nodeValue = original
    }
  }

  function applyTranslations (language) {
    const root = document.querySelector('.swagger-ui')
    if (!root || !window.NodeFilter || !document.createTreeWalker) return
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: node => (shouldTranslateNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    })
    const nodes = []
    while (walker.nextNode()) {
      nodes.push(walker.currentNode)
    }
    nodes.forEach(node => translateNodeText(node, language))
  }

  function renderLanguageSwitcher (parent) {
    if (document.querySelector('.lang-switcher')) return
    const root = parent || document.querySelector('.swagger-ui')
    if (!root) return
    const wrapper = document.createElement('div')
    wrapper.className = 'lang-switcher'
    wrapper.setAttribute('aria-label', 'Seleção de idioma')
    const currentLang = getPreferredLanguage()
    supportedLanguages.forEach(language => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'lang-switcher__button'
      button.setAttribute('data-lang', language.code)
      button.setAttribute('aria-label', language.label)
      const flagUrl = flagUrls[language.code]
      if (flagUrl) {
        const img = document.createElement('img')
        img.className = 'lang-switcher__flag'
        img.src = flagUrl
        img.alt = ''
        img.width = 20
        img.height = 14
        button.appendChild(img)
      } else {
        button.textContent = language.code
      }
      if (language.code === currentLang) {
        button.classList.add('is-active')
      }
      button.addEventListener('click', () => {
        if (language.code === getPreferredLanguage()) return
        const previousLanguage = getPreferredLanguage()
        window.sessionStorage.setItem(lastLanguageKey, previousLanguage)
        setPreferredLanguage(language.code)
        const url = new URL(window.location.href)
        url.searchParams.set('lang', language.code)
        window.history.replaceState({}, '', url.toString())
        wrapper.querySelectorAll('.lang-switcher__button').forEach(el => {
          el.classList.toggle('is-active', el.getAttribute('data-lang') === language.code)
        })
        resetTranslationCache()
        const shouldRefresh = setRefreshFlagFromState(language.code)
        updateSwaggerSpec(language.code, shouldRefresh)
        applyTranslations(language.code)
        updateReleaseToastLanguage(language.code)
      })
      wrapper.appendChild(button)
    })
    root.appendChild(wrapper)
  }

  const lastLanguageKey = 'swaggerLastLanguage'

  function hasOpenOperationHash () {
    return typeof window.location.hash === 'string' && window.location.hash.includes('/')
  }

  function isEndpointBlockOpen () {
    return endpointBlockOpen
  }

  function setEndpointBlockOpen (open) {
    endpointBlockOpen = !!open
  }

  function shouldRefreshEndpointBlockNow (currentLanguage) {
    if (!isEndpointBlockOpen()) return false
    const lastLang = window.sessionStorage.getItem(lastLanguageKey)
    return !lastLang || lastLang !== currentLanguage
  }

  function setRefreshFlagFromState (currentLanguage) {
    return shouldRefreshEndpointBlockNow(currentLanguage)
  }

  const docsVersionKey = 'serverest-docs-version'

  function clearCachesAndReloadForNewVersion (newVersion) {
    const unregister = typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.getRegistrations
      ? navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(r => r.unregister())))
      : Promise.resolve()
    const clearCaches = typeof caches !== 'undefined' && caches.keys
      ? caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      : Promise.resolve()
    Promise.all([unregister, clearCaches]).then(() => {
      window.sessionStorage.setItem(docsVersionKey, newVersion)
      window.location.reload()
    })
  }

  function checkVersionThenObserve () {
    const root = document.querySelector('.swagger-ui')
    if (root) {
      runVersionCheckAndObserve()
      return
    }
    const mo = new MutationObserver(function () {
      if (document.querySelector('.swagger-ui')) {
        mo.disconnect()
        runVersionCheckAndObserve()
      }
    })
    mo.observe(document.documentElement, { childList: true, subtree: true })
  }

  function runVersionCheckAndObserve () {
    const normalizedCurrent = normalizeVersion(currentVersion)
    const storedVersion = window.sessionStorage.getItem(docsVersionKey)
    if (storedVersion && storedVersion !== normalizedCurrent) {
      clearCachesAndReloadForNewVersion(normalizedCurrent)
      return
    }
    if (!storedVersion) {
      window.sessionStorage.setItem(docsVersionKey, normalizedCurrent)
    }
    observe()
  }

  function registerServiceWorker () {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/swagger-sw.js').catch(() => {})
    }
  }

  function observe () {
    const root = document.querySelector('.swagger-ui')
    if (!root) {
      setTimeout(observe, 500)
      return
    }
    registerServiceWorker()
    let shouldRefreshEndpointBlock = false
    if (window.performance && window.performance.getEntriesByType) {
      const navEntries = window.performance.getEntriesByType('navigation')
      if (navEntries && navEntries[0] && navEntries[0].type === 'reload') {
        window.sessionStorage.removeItem(lastLanguageKey)
      }
    }
    const queryLanguage = getLanguageFromQuery()
    const preferred = getPreferredLanguage()
    const language = queryLanguage || preferred
    if (language !== preferred) {
      window.sessionStorage.setItem(lastLanguageKey, preferred)
      setPreferredLanguage(language)
    }
    if (!queryLanguage) {
      const url = new URL(window.location.href)
      url.searchParams.set('lang', language)
      window.history.replaceState({}, '', url.toString())
    }
    let translationScheduled = false
    const scheduleTranslations = () => {
      if (translationScheduled) return
      translationScheduled = true
      setTimeout(() => {
        translationScheduled = false
        applyTranslations(getPreferredLanguage())
      }, 0)
    }
    const observer = new MutationObserver(scheduleTranslations)
    observer.observe(root, { childList: true, subtree: true })
    root.addEventListener('click', event => {
      if (!event.isTrusted) return
      const summary = event.target.closest ? event.target.closest('.opblock-summary') : null
      if (!summary) return
      const opblock = summary.closest('.opblock')
      if (!opblock) return
      setTimeout(() => {
        if (opblock.classList.contains('is-open')) {
          setEndpointBlockOpen(true)
          window.sessionStorage.setItem(lastLanguageKey, getPreferredLanguage())
        } else {
          setEndpointBlockOpen(false)
        }
      }, 0)
    })
    renderLanguageSwitcher(root)
    scheduleTranslations()
    if (hasOpenOperationHash()) {
      setEndpointBlockOpen(true)
    }
    shouldRefreshEndpointBlock = setRefreshFlagFromState(language)
    updateSwaggerSpec(language, shouldRefreshEndpointBlock)
    renderReleaseToast()
    fetch('https://api.github.com/repos/ServeRest/ServeRest/releases/latest', {
      headers: { Accept: 'application/json' }
    })
      .then(r => r.json())
      .then(data => {
        if (data.tag_name && data.html_url) {
          renderReleaseToast({
            tag: data.tag_name,
            version: normalizeVersion(data.tag_name),
            url: data.html_url
          })
        }
      })
      .catch(() => {})
  }

  function init () {
    preloadFlags()
    preloadSwaggerJson()
    prefetchSwaggerSpecs()
    if (document.body) renderReleaseToast()
    checkVersionThenObserve()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
