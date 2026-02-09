const swaggerSpecCache = {}

function updateSpecUrlInDom (specUrlString) {
  const root = document.querySelector('.swagger-ui')
  if (!root) return
  root.querySelectorAll('input').forEach(input => {
    if (input.value && input.value.includes('swagger.json')) {
      input.value = specUrlString
    }
  })
  root.querySelectorAll('a[href*="swagger.json"]').forEach(a => {
    if (a.getAttribute('href') && a.getAttribute('href').includes('swagger.json')) {
      a.setAttribute('href', specUrlString)
    }
  })
  if (root.querySelectorAll) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false)
    const textNodes = []
    while (walker.nextNode()) textNodes.push(walker.currentNode)
    textNodes.forEach(node => {
      if (node.nodeValue && node.nodeValue.includes('swagger.json?lang=')) {
        node.nodeValue = node.nodeValue.replace(
          /https?:\/\/[^"\s]+\/swagger\.json\?lang=[^"\s&]+/g,
          specUrlString
        )
      }
    })
  }
}

function prefetchSwaggerSpecs () {
  const code = getCurrentLanguageCode()
  const url = '/swagger.json?lang=' + encodeURIComponent(code)
  fetch(url)
    .then(r => r.json())
    .then(spec => { swaggerSpecCache[code] = spec })
    .catch(() => {})
}

function updateSwaggerSpec (language, shouldRefreshOpenOps = false) {
  const specUrl = new URL('/swagger.json', window.location.origin)
  specUrl.searchParams.set('lang', language)
  updateSpecUrlInDom(specUrl.toString())
  const applySpec = (spec) => {
    if (!window.ui || !window.ui.specActions) return
    resetTranslationCache()
    window.ui.specActions.updateSpec(JSON.stringify(spec))
    if (window.ui.specActions.updateUrl) {
      window.ui.specActions.updateUrl(specUrl.toString())
    }
    setTimeout(() => updateSpecUrlInDom(specUrl.toString()), 0)
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
