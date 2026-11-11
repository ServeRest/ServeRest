/* eslint-env browser */
// Funções puras da página do lab: sem DOM e sem estado global, para que os testes de unidade as
// carreguem com require e o navegador as receba em window.serverestLabCore.
(function () {
  'use strict'

  const METHODS = ['get', 'post', 'put', 'patch', 'delete']

  // Com HTTP/2 o navegador entrega statusText vazio; o texto vem desta tabela, sem tradução, porque
  // são nomes do protocolo.
  const STATUS_TEXT = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    413: 'Payload Too Large',
    415: 'Unsupported Media Type',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  }

  function statusText (status) {
    return STATUS_TEXT[status] || ''
  }

  /* Fluxo: cópia de src/swagger/scripts/08-flow-panel.js, com os textos recebidos como argumento.
     Um teste de unidade compara os dois modelos para que as cópias não divirjam. */

  function segmentGrow (stage) {
    return Math.sqrt(typeof stage.dur === 'number' && stage.dur > 0 ? stage.dur : 0.2)
  }

  function formatDuration (dur, language) {
    const text = dur.toFixed(2)
    return language === 'en' ? text : text.replace('.', ',')
  }

  function knownKey (texts, key) {
    return Object.prototype.hasOwnProperty.call(texts, key) ? key : null
  }

  function parseEntry (piece) {
    const [name, ...params] = piece.split(';').map(part => part.trim())
    const entry = {}
    params.filter(Boolean).forEach(param => {
      const separator = param.indexOf('=')
      const key = separator === -1 ? param : param.slice(0, separator)
      entry[key] = separator === -1 ? '' : param.slice(separator + 1)
    })
    entry.name = name
    if (entry.dur !== undefined) {
      const dur = Number(entry.dur)
      entry.dur = entry.dur === '' || Number.isNaN(dur) ? undefined : dur
    }
    return entry
  }

  function parseStages (headerValue) {
    if (typeof headerValue !== 'string') return []
    return headerValue.split(',')
      .map(piece => piece.trim())
      .filter(Boolean)
      .map(parseEntry)
      .filter(entry => entry.name)
  }

  function extraParams (entry) {
    return Object.keys(entry)
      .filter(key => !['name', 'st', 'dur'].includes(key))
      .reduce((params, key) => Object.assign(params, { [key]: entry[key] }), {})
  }

  function buildStage (entry, texts) {
    return {
      name: entry.name,
      st: entry.st,
      dur: entry.dur,
      params: extraParams(entry),
      labelKey: knownKey(texts, 'ui.flow.stage_label.' + entry.name),
      descriptionKey: knownKey(texts, 'ui.flow.stage_description.' + entry.name),
      statusKey: knownKey(texts, 'ui.flow.status.' + entry.st),
      width: 0,
      rules: []
    }
  }

  function buildRule (entry, code, texts) {
    return {
      name: entry.name,
      code,
      st: entry.st,
      item: entry.item,
      params: extraParams(entry),
      labelKey: knownKey(texts, 'ui.flow.rule_label.' + code),
      statusKey: knownKey(texts, 'ui.flow.status.' + entry.st)
    }
  }

  function failureKeys (stage, rule, status, texts) {
    // 408 marca como failed a etapa em execução no timeout, e 500 ou mais é erro inesperado: a etapa não explica a falha.
    if (status === 408) return { whyKey: 'ui.flow.why.status.timeout', howKey: 'ui.flow.how.status.timeout' }
    if (status >= 500) return { whyKey: 'ui.flow.why.status.unexpected_error', howKey: 'ui.flow.how.status.unexpected_error' }
    if (rule) {
      const why = knownKey(texts, 'ui.flow.why.rule.' + rule.code)
      const how = knownKey(texts, 'ui.flow.how.rule.' + rule.code)
      if (why && how) return { whyKey: why, howKey: how }
    }
    if (stage.name === 'auth' && stage.params.reason) {
      const why = knownKey(texts, 'ui.flow.why.auth.' + stage.params.reason)
      const how = knownKey(texts, 'ui.flow.how.auth.' + stage.params.reason)
      if (why && how) return { whyKey: why, howKey: how }
    }
    return {
      whyKey: knownKey(texts, 'ui.flow.why.stage.' + stage.name),
      howKey: knownKey(texts, 'ui.flow.how.stage.' + stage.name)
    }
  }

  function buildFlowModel (entries, statusCode, texts) {
    if (!Array.isArray(entries) || entries.length === 0) return null
    const stages = []
    entries.forEach(entry => {
      const separator = entry.name.indexOf('.')
      const owner = separator > 0 ? entry.name.slice(0, separator) : null
      const parent = owner ? stages.filter(stage => stage.name === owner).pop() : null
      if (parent) {
        parent.rules.push(buildRule(entry, entry.name.slice(separator + 1), texts))
      } else {
        stages.push(buildStage(entry, texts))
      }
    })
    const totalDur = stages.reduce((total, stage) => total + (stage.dur || 0), 0)
    stages.forEach(stage => {
      stage.width = totalDur > 0 ? (stage.dur || 0) / totalDur : 0
    })
    const status = Number(statusCode)
    const failedStage = stages.find(stage => stage.st === 'failed') || null
    const failedRule = failedStage ? failedStage.rules.find(rule => rule.st === 'failed') || null : null
    let summary = 'completed'
    let keys = { whyKey: null, howKey: null }
    if (failedStage) {
      summary = 'stopped'
      keys = failureKeys(failedStage, failedRule, status, texts)
    } else if (status >= 400) {
      summary = 'outside'
      keys = { whyKey: 'ui.flow.why.outside', howKey: 'ui.flow.how.outside' }
    }
    return {
      statusCode: Number.isNaN(status) ? null : status,
      summary,
      failedStage: failedStage ? failedStage.name : null,
      failedRule: failedRule ? failedRule.code : null,
      whyKey: keys.whyKey,
      howKey: keys.howKey,
      stages
    }
  }

  function stepDelay (stage) {
    if (stage.dur === undefined) return 420
    return Math.min(1700, Math.max(420, stage.dur * 480))
  }

  /* OpenAPI */

  function refLookup (spec, ref) {
    if (typeof ref !== 'string' || ref.slice(0, 2) !== '#/') return null
    return ref.slice(2).split('/').reduce((node, part) => {
      return node ? node[part.replace(/~1/g, '/').replace(/~0/g, '~')] : null
    }, spec)
  }

  // O limite de saltos protege contra $ref circular.
  function resolve (spec, node) {
    let current = node
    let hops = 0
    while (current && current.$ref && hops++ < 10) current = refLookup(spec, current.$ref)
    return current || null
  }

  function exampleOf (spec, content) {
    if (!content) return undefined
    if (content.example !== undefined) return content.example
    if (content.examples) {
      const first = Object.keys(content.examples)[0]
      const example = first ? resolve(spec, content.examples[first]) : null
      if (example && example.value !== undefined) return example.value
    }
    const schema = resolve(spec, content.schema)
    if (schema && schema.example !== undefined) return schema.example
    if (schema && schema.properties) {
      return Object.keys(schema.properties).reduce((out, name) => {
        const property = resolve(spec, schema.properties[name]) || {}
        out[name] = property.example !== undefined ? property.example : property.default !== undefined ? property.default : ''
        return out
      }, {})
    }
    return undefined
  }

  function headerSchemes (spec) {
    const schemes = (spec.components && spec.components.securitySchemes) || {}
    return Object.keys(schemes)
      .map(name => ({ id: name, scheme: resolve(spec, schemes[name]) || {} }))
      .filter(item => item.scheme.in === 'header' && item.scheme.name)
  }

  function authHeaderOf (spec) {
    const schemes = headerSchemes(spec)
    return schemes.length ? schemes[0].scheme.name : 'Authorization'
  }

  function paramsOf (spec, shared, own) {
    const ownParams = own.map(param => resolve(spec, param)).filter(Boolean)
    const sharedParams = shared.map(param => resolve(spec, param)).filter(Boolean)
      .filter(param => !ownParams.some(item => item.name === param.name && item.in === param.in))
    return sharedParams.concat(ownParams)
      .filter(param => param.in === 'path' || param.in === 'query')
      .map(param => {
        const schema = resolve(spec, param.schema) || {}
        return {
          name: param.name,
          in: param.in,
          required: !!param.required || param.in === 'path',
          description: param.description || '',
          example: param.example !== undefined ? param.example : schema.example,
          def: schema.default,
          enumValues: Array.isArray(schema.enum) ? schema.enum : null
        }
      })
  }

  function buildRoutes (spec) {
    const schemeIds = headerSchemes(spec).map(item => item.id)
    const routes = []
    Object.keys(spec.paths || {}).forEach(path => {
      const item = spec.paths[path] || {}
      Object.keys(item).filter(method => METHODS.includes(method)).forEach(method => {
        const operation = item[method]
        const requestBody = resolve(spec, operation.requestBody)
        const content = requestBody && requestBody.content ? requestBody.content['application/json'] : null
        const example = exampleOf(spec, content)
        const security = operation.security !== undefined ? operation.security : (spec.security || [])
        routes.push({
          key: method + ' ' + path,
          method,
          path,
          tag: (operation.tags && operation.tags[0]) || '',
          summary: operation.summary || '',
          description: operation.description || '',
          params: paramsOf(spec, item.parameters || [], operation.parameters || []),
          body: content ? { example: example === undefined ? {} : example } : null,
          needsToken: security.some(requirement => Object.keys(requirement).some(name => schemeIds.includes(name)))
        })
      })
    })
    return routes
  }

  function tagOrder (spec, routes) {
    const order = (spec.tags || []).map(tag => tag.name)
    routes.forEach(route => {
      if (!order.includes(route.tag)) order.push(route.tag)
    })
    return order
  }

  /* Requisição */

  // draft.auth existe só quando o aluno editou o header da rota; sem ele, a rota segue a sessão.
  function authValueFor (draft, sessionToken) {
    if (draft && typeof draft.auth === 'string') return draft.auth
    return sessionToken || ''
  }

  // Valor de header HTTP aceita tab, os caracteres de 0x20 a 0x7E e os de 0x80 a 0xFF.
  function isSendableHeaderValue (value) {
    return /^[\t\x20-\x7e\x80-\xff]*$/.test(String(value))
  }

  // O fetch do navegador tira espaços e tabs das pontas do valor; a página tira antes, para que
  // a prévia, o curl e o que vai pela rede sejam iguais.
  function trimHeaderValue (value) {
    return typeof value === 'string' ? value.replace(/^[ \t]+|[ \t]+$/g, '') : value
  }

  // options: { baseUrl, authValue, authHeader }. Parâmetro de caminho vazio fica como {nome}: quem
  // executa confere antes e não envia.
  function buildRequest (route, draft, options) {
    const path = route.path.replace(/\{([^}]+)\}/g, (placeholder, name) => {
      const value = draft.params['path:' + name]
      return value ? encodeURIComponent(value) : placeholder
    })
    const query = route.params
      .filter(param => param.in === 'query' && (draft.params['query:' + param.name] || '') !== '')
      .map(param => encodeURIComponent(param.name) + '=' + encodeURIComponent(draft.params['query:' + param.name]))
      .join('&')
    const hasBody = !!route.body && typeof draft.body === 'string' && draft.body.trim() !== ''
    const headers = []
    if (hasBody) headers.push(['Content-Type', 'application/json'])
    const authValue = trimHeaderValue(options.authValue)
    if (route.needsToken && authValue) headers.push([options.authHeader, authValue])
    return {
      method: route.method.toUpperCase(),
      url: options.baseUrl + path + (query ? '?' + query : ''),
      headers,
      body: hasBody ? draft.body : undefined
    }
  }

  function shellQuote (value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'"
  }

  function curlOf (request) {
    const parts = ['curl -X ' + request.method + ' ' + shellQuote(request.url)]
    request.headers.forEach(header => parts.push('-H ' + shellQuote(header[0] + ': ' + header[1])))
    if (request.body !== undefined) parts.push('-d ' + shellQuote(request.body))
    return parts.join(' \\\n  ')
  }

  function decodeJwtExp (token) {
    try {
      const part = String(token).replace(/^Bearer\s+/i, '').split('.')[1]
      const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
      return typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null
    } catch (e) {
      return null
    }
  }

  function escapeHtml (value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  // Única marcação montada como texto na página: cada token é escapado antes de ser envolvido.
  function highlightJson (json) {
    const token = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g
    let html = ''
    let last = 0
    let match = token.exec(json)
    while (match) {
      const value = match[0]
      let className = 'j-num'
      if (value.charAt(0) === '"') className = /:$/.test(value) ? 'j-key' : 'j-str'
      else if (/^(true|false|null)$/.test(value)) className = 'j-lit'
      html += escapeHtml(json.slice(last, match.index)) + '<span class="' + className + '">' + escapeHtml(value) + '</span>'
      last = match.index + value.length
      match = token.exec(json)
    }
    return html + escapeHtml(json.slice(last))
  }

  const core = {
    statusText,
    segmentGrow,
    formatDuration,
    parseStages,
    buildFlowModel,
    stepDelay,
    resolve,
    exampleOf,
    authHeaderOf,
    buildRoutes,
    tagOrder,
    authValueFor,
    isSendableHeaderValue,
    buildRequest,
    shellQuote,
    curlOf,
    decodeJwtExp,
    highlightJson
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = core
  if (typeof window !== 'undefined') window.serverestLabCore = core
})()
