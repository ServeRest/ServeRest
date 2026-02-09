  let endpointBlockOpen = false

  function hasOpenOperationHash () {
    return typeof window.location.hash === 'string' && window.location.hash.includes('/')
  }

  function setEndpointBlockOpen (open) {
    endpointBlockOpen = !!open
  }

  function shouldRefreshEndpointBlockNow (currentLanguage) {
    if (!endpointBlockOpen) return false
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
    setupTopbarLogo(root)
    scheduleTranslations()
    if (hasOpenOperationHash()) {
      setEndpointBlockOpen(true)
    }
    const shouldRefreshEndpointBlock = setRefreshFlagFromState(language)
    updateSwaggerSpec(language, shouldRefreshEndpointBlock)
    runReleaseCheck()
  }

  function setupTopbarLogo (root) {
    function run () {
      const wrapper = root.querySelector('.topbar-wrapper')
      const link = wrapper && wrapper.querySelector('.link')
      if (!wrapper || !link) return
      if (document.getElementById('serverest-logo')) return
      const logo = document.createElement('div')
      logo.id = 'serverest-logo'
      logo.className = 'topbar-logo'
      wrapper.insertBefore(logo, link)
      link.style.display = 'none'
      link.removeAttribute('href')
      link.setAttribute('aria-hidden', 'true')
    }
    run()
    setTimeout(run, 300)
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
