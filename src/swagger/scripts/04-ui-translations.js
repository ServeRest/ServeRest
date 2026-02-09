/* uiLabelTranslations injetado no build a partir de src/swagger/translations/*.js */
const uiLabelTranslations = [
  __UI_LABEL_TRANSLATIONS__
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

const uiTranslations = {
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

let originalTextNodes = new WeakMap()

function resetTranslationCache () {
  originalTextNodes = new WeakMap()
}

function shouldTranslateNode (node) {
  if (!node || !node.nodeValue || !node.nodeValue.trim()) return false
  const parent = node.parentElement
  if (!parent) return false
  if (parent.closest('.lang-switcher')) return false
  return !parent.closest('code, pre, textarea, input')
}

function translateNodeText (node, language) {
  const config = uiTranslations[language] || uiTranslations['pt-BR']
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
