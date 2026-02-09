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
