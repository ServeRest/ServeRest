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

  // A página do status code na MDN, no idioma da página quando a MDN tem a tradução: KNOWN são os códigos
  // conferidos nas três línguas, MISSING os que faltam numa delas. Sem tradução, a página em inglês, e
  // english diz isso (para o nome do link avisar), só quando a página não é em inglês.
  const MDN_LOCALES = { pt: 'pt-BR', es: 'es', en: 'en-US' }
  const MDN_STATUS_KNOWN = [200, 201, 400, 401, 403, 404, 405, 408, 413, 415, 429, 500]
  const MDN_STATUS_MISSING = { es: [415, 429] }

  function mdnStatusUrl (code, language) {
    const prefix = String(language || '').slice(0, 2).toLowerCase()
    const number = Number(code)
    const translated = MDN_STATUS_KNOWN.includes(number) && !(MDN_STATUS_MISSING[prefix] || []).includes(number)
    const locale = translated ? MDN_LOCALES[prefix] || 'en-US' : 'en-US'
    return {
      url: 'https://developer.mozilla.org/' + locale + '/docs/Web/HTTP/Reference/Status/' + encodeURIComponent(String(code)),
      english: locale === 'en-US' && prefix !== 'en'
    }
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

  const FIXED_COLUMN = '22px'

  function ranStage (stage) {
    return stage.st === 'ok' || stage.st === 'failed'
  }

  // Colunas da grade do desenho do fluxo. Etapa que não rodou e resposta têm a mesma coluna fixa e
  // estreita; as etapas que rodaram dividem o resto pela raiz da duração, nunca mais estreitas que a
  // coluna fixa. Não é um eixo de tempo linear.
  // Quando as frações somam menos de 1, a grade reparte só essa parte do resto, e o desenho para antes
  // do fim da coluna (etapas rápidas, o normal num servidor local). Aí elas crescem na mesma proporção
  // até somar pelo menos 1, arredondadas para cima.
  function flowColumns (model) {
    const total = model.stages.filter(ranStage).reduce((sum, stage) => sum + segmentGrow(stage), 0)
    const grow = stage => total < 1 ? Math.ceil(segmentGrow(stage) / total * 1000) / 1000 : segmentGrow(stage)
    return model.stages
      .map(stage => ranStage(stage) ? 'minmax(' + FIXED_COLUMN + ', ' + grow(stage).toFixed(3) + 'fr)' : FIXED_COLUMN)
      .concat(FIXED_COLUMN)
      .join(' ')
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

  // Exemplo declarado no próprio conteúdo: example ou o primeiro de examples.
  function declaredExample (spec, content) {
    if (content.example !== undefined) return content.example
    if (content.examples) {
      const first = Object.keys(content.examples)[0]
      const example = first ? resolve(spec, content.examples[first]) : null
      if (example && example.value !== undefined) return example.value
    }
    return undefined
  }

  function exampleOf (spec, content) {
    if (!content) return undefined
    const declared = declaredExample(spec, content)
    if (declared !== undefined) return declared
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

  // Exemplo de corpo de uma resposta documentada: só o que o documento traz. Uma folha sem exemplo
  // fica de fora, em vez de virar um valor inventado; o limite de profundidade protege de schema
  // recursivo.
  function sampleOf (spec, node, depth) {
    const schema = resolve(spec, node)
    if (!schema || depth > 6) return undefined
    if (schema.example !== undefined) return schema.example
    if (schema.type === 'array' || schema.items) {
      const item = sampleOf(spec, schema.items, depth + 1)
      return item === undefined ? undefined : [item]
    }
    if (schema.properties) {
      const out = {}
      Object.keys(schema.properties).forEach(name => {
        const value = sampleOf(spec, schema.properties[name], depth + 1)
        if (value !== undefined) out[name] = value
      })
      return Object.keys(out).length ? out : undefined
    }
    return undefined
  }

  function responseExample (spec, content) {
    if (!content) return undefined
    const declared = declaredExample(spec, content)
    return declared !== undefined ? declared : sampleOf(spec, content.schema, 0)
  }

  // O schema com cada $ref resolvido nas propriedades e nos itens, até a profundidade 6, para a tabela do
  // schema do corpo. O documento não muda: cada parte resolvida é uma cópia rasa.
  function deref (spec, node, depth) {
    const level = depth || 0
    const schema = resolve(spec, node)
    if (!schema || level > 6) return schema || null
    const out = Object.assign({}, schema)
    if (schema.properties) {
      out.properties = {}
      Object.keys(schema.properties).forEach(name => { out.properties[name] = deref(spec, schema.properties[name], level + 1) || {} })
    }
    if (schema.items) out.items = deref(spec, schema.items, level + 1)
    return out
  }

  // As linhas da tabela do schema do corpo, na ordem do documento: um campo por linha; um array de objetos
  // ganha uma linha de grupo e, logo abaixo, os campos de cada item. path junta o grupo e o nome
  // (produtos.quantidade), como o campo aparece na mensagem de erro do servidor.
  function schemaRows (schema, group) {
    const required = (schema && Array.isArray(schema.required)) ? schema.required : []
    const rows = []
    Object.keys((schema && schema.properties) || {}).forEach(name => {
      const prop = schema.properties[name] || {}
      rows.push({ name, group: group || null, path: group ? group + '.' + name : name, type: typeof prop.type === 'string' ? prop.type : '', required: required.includes(name), prop })
      if (prop.type === 'array' && prop.items && prop.items.properties) {
        rows.push({ groupLabel: name })
        rows.push(...schemaRows(prop.items, name))
      }
    })
    return rows
  }

  // Respostas documentadas da operação, na ordem do documento, para o aluno saber o que verificar.
  function responsesOf (spec, operation) {
    const responses = operation.responses || {}
    return Object.keys(responses).map(status => {
      const response = resolve(spec, responses[status]) || {}
      const content = response.content ? response.content['application/json'] : null
      return { status, description: response.description || '', example: responseExample(spec, content) }
    })
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
          enumValues: Array.isArray(schema.enum) ? schema.enum : null,
          type: typeof schema.type === 'string' ? schema.type : ''
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
          operationId: operation.operationId || '',
          responses: responsesOf(spec, operation),
          params: paramsOf(spec, item.parameters || [], operation.parameters || []),
          body: content ? { example: example === undefined ? {} : example, schema: deref(spec, content.schema) } : null,
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

  // Link da rota na página do Swagger (#/<tag>/<operationId>), no idioma da página. Sem operationId
  // no documento, vale o que o Swagger UI gera: o método em minúsculas e o caminho com "_" no lugar
  // de tudo que não é letra, dígito ou "_". Operação sem tag fica no grupo "default" do Swagger UI.
  function swaggerLink (route, language) {
    const id = route.operationId || route.method.toLowerCase() + route.path.replace(/[^A-Za-z0-9_]/g, '_')
    return '/swagger?lang=' + encodeURIComponent(language) + '#/' + encodeURIComponent(route.tag || 'default') + '/' + encodeURIComponent(id)
  }

  /* Requisição */

  // draft.auth existe só quando o aluno editou o header da rota; sem ele, a rota segue o token da página.
  function authValueFor (draft, pageToken) {
    if (draft && typeof draft.auth === 'string') return draft.auth
    return pageToken || ''
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

  // As partes do comando curl, na ordem: o início (método e URL), um -H por header e o corpo. Um corpo que
  // começa por @ vai com --data-raw, porque com -d o curl leria o arquivo local que tem aquele nome.
  function curlParts (request) {
    const list = [{ kind: 'start', method: request.method, url: request.url, text: 'curl -X ' + request.method + ' ' + shellQuote(request.url) }]
    request.headers.forEach(header => list.push({ kind: 'header', name: header[0], value: header[1], text: '-H ' + shellQuote(header[0] + ': ' + header[1]) }))
    if (request.body !== undefined) {
      const flag = String(request.body).charAt(0) === '@' ? '--data-raw' : '-d'
      list.push({ kind: 'body', flag, body: String(request.body), text: flag + ' ' + shellQuote(request.body) })
    }
    return list
  }

  function curlOf (request) {
    return curlParts(request).map(part => part.text).join(' \\\n  ')
  }

  // O que difere entre o envio e o rascunho, parte a parte, na ordem do comando: a URL (a linha do início;
  // o método e a rota são os mesmos), cada header pelo nome (o que está num lado só também conta) e o corpo,
  // dizendo se o rascunho tem corpo. As mesmas partes de curlParts.
  function sentDiffParts (sent, draft) {
    const a = curlParts(sent)
    const b = curlParts(draft)
    const of = (list, kind) => list.find(part => part.kind === kind)
    const header = (list, name) => list.find(part => part.kind === 'header' && part.name.toLowerCase() === name)
    const out = []
    if (of(a, 'start').text !== of(b, 'start').text) out.push({ kind: 'url' })
    const names = []
    a.concat(b).forEach(part => {
      if (part.kind === 'header' && !names.includes(part.name.toLowerCase())) names.push(part.name.toLowerCase())
    })
    names.forEach(name => {
      const one = header(a, name)
      const two = header(b, name)
      if (!one || !two || one.text !== two.text) out.push({ kind: 'header', name: (one || two).name })
    })
    if ((of(a, 'body') || {}).text !== (of(b, 'body') || {}).text) out.push({ kind: 'body', inDraft: !!of(b, 'body') })
    return out
  }

  // Reindenta um JSON com dois espaços sem converter nenhum valor: os caracteres originais ficam (1.0
  // continua 1.0, um inteiro de 20 dígitos não perde precisão, chaves repetidas continuam as duas). null
  // quando o texto não é JSON.
  function prettyJson (text) {
    try {
      JSON.parse(text)
    } catch (e) {
      return null
    }
    const source = String(text)
    const space = ch => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'
    let out = ''
    let depth = 0
    let index = 0
    const newline = () => '\n' + '  '.repeat(depth)
    while (index < source.length) {
      const ch = source.charAt(index)
      if (ch === '"') {
        let end = index + 1
        while (end < source.length && source.charAt(end) !== '"') end += source.charAt(end) === '\\' ? 2 : 1
        out += source.slice(index, end + 1)
        index = end + 1
      } else if (space(ch)) {
        index++
      } else if (ch === '{' || ch === '[') {
        let next = index + 1
        while (next < source.length && space(source.charAt(next))) next++
        const close = ch === '{' ? '}' : ']'
        if (source.charAt(next) === close) {
          out += ch + close
          index = next + 1
        } else {
          depth++
          out += ch + newline()
          index++
        }
      } else if (ch === '}' || ch === ']') {
        depth--
        out += newline() + ch
        index++
      } else if (ch === ',') {
        out += ',' + newline()
        index++
      } else if (ch === ':') {
        out += ': '
        index++
      } else {
        out += ch
        index++
      }
    }
    return out
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

  // De onde veio o valor do campo de autenticação e até quando ele vale, para a legenda do campo.
  // expiresAt e now: Date ou milissegundos. filledFrom: hora do envio do histórico que preencheu o
  // campo; só conta junto com edited, porque preencher grava o valor como edição da rota.
  function tokenCaptionState ({ hasToken, expiresAt, now, edited, filledFrom }) {
    if (edited) return filledFrom ? 'filled' : 'edited'
    if (!hasToken) return 'none'
    if (!expiresAt) return 'active_no_exp'
    return Number(expiresAt) <= Number(now) ? 'expired' : 'active'
  }

  /* Histórico: os envios ficam do mais recente para o mais antigo. */

  function recordKey (record) {
    return record.method.toLowerCase() + ' ' + record.path
  }

  // Chave da rota (como route.key) para o envio mais recente dela.
  function lastResultByRoute (history) {
    const latest = new Map()
    history.forEach(record => {
      const key = recordKey(record)
      if (!latest.has(key)) latest.set(key, record)
    })
    return latest
  }

  // Condição de "Preencher a requisição com este envio": o envio está no histórico e a rota dele
  // tem um envio mais recente.
  function isOlderThanLatest (record, history) {
    return history.includes(record) && lastResultByRoute(history).get(recordKey(record)) !== record
  }

  // Compara o comando curl inteiro (método, URL, headers e corpo) guardado no envio com o da
  // requisição montada agora a partir do rascunho.
  function recordDiffersFromDraft (record, request) {
    return curlOf(request) !== record.curl
  }

  // O token de uma resposta real de POST /login com status 200; null em qualquer outro envio.
  function loginToken (record) {
    if (record.error || record.status !== 200 || record.method !== 'POST' || record.path !== '/login') return null
    try {
      const body = JSON.parse(record.bodyText)
      return body && typeof body.authorization === 'string' && body.authorization ? body.authorization : null
    } catch (e) {
      return null
    }
  }

  // A oferta do token sob a linha do status (D30): o botão (use) ou a frase de que ele já é o token da
  // página (in_use). Um token vencido recebe o mesmo botão, sem aviso nem bloqueio: a validade não conta.
  function offerState ({ record, pageToken }) {
    const token = loginToken(record)
    if (!token) return 'none'
    return pageToken === token ? 'in_use' : 'use'
  }

  /* Histórico guardado na sessão do navegador (sessionStorage) */

  // O registro como fica guardado: a hora em texto ISO; um corpo maior que maxChars vai cortado, com o
  // tamanho real em bodyCut (a Resposta diz que o corpo foi cortado).
  function storedRecord (record, maxChars) {
    const out = Object.assign({}, record, { at: new Date(record.at).toISOString() })
    if (record.bodyText.length > maxChars) {
      out.bodyText = record.bodyText.slice(0, maxChars)
      out.bodyCut = record.bodyCut || record.bodyText.length
    }
    return out
  }

  const isText = value => typeof value === 'string'
  const isPairs = value => Array.isArray(value) && value.every(pair => Array.isArray(pair) && pair.length === 2 && isText(pair[0]) && isText(pair[1]))

  // Um registro guardado só volta se tem tudo o que a página lê dele, com o tipo certo.
  function validStoredRecord (item) {
    if (!item || typeof item !== 'object') return false
    const sent = item.sent
    return Number.isInteger(item.id) && item.id > 0 &&
      isText(item.method) && isText(item.path) && isText(item.url) && isText(item.curl) && isText(item.bodyText) && isText(item.statusText) &&
      isText(item.at) && !Number.isNaN(Date.parse(item.at)) &&
      (item.status === null || Number.isInteger(item.status)) &&
      (item.error === null || isText(item.error)) &&
      (item.stagesHeader === null || isText(item.stagesHeader)) &&
      (item.bodySent === undefined || isText(item.bodySent)) &&
      (item.bodyCut === undefined || Number.isInteger(item.bodyCut)) &&
      typeof item.ms === 'number' && typeof item.authSent === 'boolean' && typeof item.protected === 'boolean' &&
      isPairs(item.requestHeaders) && isPairs(item.headers) &&
      (sent === null || (!!sent && typeof sent === 'object' && !!sent.params && typeof sent.params === 'object' && isText(sent.body) && isText(sent.auth)))
  }

  // O valor guardado ({ v: 1, history }) de volta em registros, com a hora em Date e no máximo max envios.
  // null quando o valor inteiro deve ser descartado: não é JSON, tem outra forma, um registro não tem o
  // que a página lê, ou um id se repete.
  function readStoredHistory (value, max) {
    let saved = null
    try {
      saved = JSON.parse(value)
    } catch (e) {
      return null
    }
    if (!saved || saved.v !== 1 || !Array.isArray(saved.history)) return null
    const list = saved.history.slice(0, max)
    const ids = new Set()
    const ok = list.every(item => {
      if (!validStoredRecord(item) || ids.has(item.id)) return false
      ids.add(item.id)
      return true
    })
    return ok ? list.map(item => Object.assign({}, item, { at: new Date(item.at) })) : null
  }

  /* Texto */

  function safeHref (url) {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null
    } catch (e) {
      return null
    }
  }

  // Markdown mínimo da introdução do documento: **negrito** e [texto](url), com link dentro de
  // negrito. Devolve pedaços de texto para quem desenha criar os nós; nada vira HTML. Link que não é
  // http(s) vira só o texto dele. Um ** sem par some, e o que vem depois dele fica sem negrito.
  function parseInlineMarkdown (text) {
    const source = String(text || '')
    const pattern = /\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g
    const out = []
    let boldPieces = null
    const add = (value, href) => {
      if (!value) return
      const piece = href ? { text: value, href } : { text: value }
      if (boldPieces) boldPieces.push(piece)
      else out.push({ ...piece, bold: false })
    }
    let last = 0
    let match = pattern.exec(source)
    while (match) {
      add(source.slice(last, match.index))
      if (match[0] !== '**') {
        add(match[1], safeHref(match[2]))
      } else if (boldPieces) {
        boldPieces.forEach(piece => out.push({ ...piece, bold: true }))
        boldPieces = null
      } else {
        boldPieces = []
      }
      last = match.index + match[0].length
      match = pattern.exec(source)
    }
    add(source.slice(last))
    if (boldPieces) boldPieces.forEach(piece => out.push({ ...piece, bold: false }))
    return out
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
    mdnStatusUrl,
    segmentGrow,
    formatDuration,
    parseStages,
    buildFlowModel,
    stepDelay,
    flowColumns,
    resolve,
    deref,
    schemaRows,
    exampleOf,
    responsesOf,
    authHeaderOf,
    buildRoutes,
    tagOrder,
    swaggerLink,
    authValueFor,
    isSendableHeaderValue,
    trimHeaderValue,
    buildRequest,
    shellQuote,
    curlParts,
    curlOf,
    sentDiffParts,
    prettyJson,
    decodeJwtExp,
    tokenCaptionState,
    recordKey,
    lastResultByRoute,
    isOlderThanLatest,
    recordDiffersFromDraft,
    loginToken,
    offerState,
    storedRecord,
    readStoredHistory,
    safeHref,
    parseInlineMarkdown,
    highlightJson
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = core
  if (typeof window !== 'undefined') window.serverestLabCore = core
})()
