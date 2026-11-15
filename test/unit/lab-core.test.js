const { expect } = require('chai')
const { execFileSync } = require('child_process')
const { readFileSync, readdirSync, statSync } = require('fs')
const { join, sep } = require('path')
const vm = require('vm')
const jwt = require('jsonwebtoken')

const core = require('../../src/lab/public/core')
const ptBr = require('../../src/swagger/translations/pt-BR')
const { localizeSwaggerDocument } = require('../../src/swagger/translations')
const swaggerDocument = require('../../docs/swagger.json')

const textosDoFluxo = Object.keys(ptBr)
  .filter(key => key.startsWith('ui.flow.') || key === 'ui.response')
  .reduce((acc, key) => ({ ...acc, [key]: ptBr[key] }), {})

// Cópia dos headers de test/unit/flow-panel.test.js, que cobre o modelo do fluxo.
const headers = {
  criado: 'body;st=ok;dur=0.18, rate_limit;st=skipped, auth;st=ok;dur=1.41, schema;st=ok;dur=0.32, rules;st=ok;dur=2.10, rules.single_cart;st=ok, rules.no_duplicate_product;st=ok, rules.product_exists;st=ok, rules.enough_stock;st=ok, write;st=ok;dur=1.02',
  semToken: 'body;st=ok;dur=0.21, rate_limit;st=ok;dur=0.09, auth;st=failed;dur=0.05;reason=token_missing, schema;st=not_run, rules;st=not_run, write;st=not_run',
  semEstoque: 'body;st=ok;dur=0.20, rate_limit;st=skipped, auth;st=ok;dur=1.38, schema;st=ok;dur=0.30, rules;st=failed;dur=1.92, rules.single_cart;st=ok, rules.no_duplicate_product;st=ok, rules.product_exists;st=ok, rules.enough_stock;st=failed;item=1, write;st=not_run',
  jsonMalformado: 'body;st=failed;dur=0.34, rate_limit;st=not_run',
  rotaInexistente: 'body;st=ok;dur=0.11, rate_limit;st=ok;dur=0.02',
  loginInvalido: 'body;st=ok;dur=0.20, rate_limit;st=ok;dur=0.05, schema;st=ok;dur=0.31, rules;st=failed;dur=0.90'
}

function rascunho (params = {}, body) {
  return { params, body }
}

describe('Página do lab: funções puras', () => {
  describe('Fluxo', () => {
    it('chave de texto desconhecida continua null quando os textos não a têm', () => {
      const model = core.buildFlowModel(core.parseStages('auth;st=failed;reason=token_missing'), 401, {})
      expect(model.stages[0].labelKey).to.equal(null)
      expect(model.whyKey).to.equal(null)
    })

    it('stepDelay e segmentGrow seguem as regras do painel de fluxo', () => {
      expect(core.stepDelay({})).to.equal(420)
      expect(core.stepDelay({ dur: 0.1 })).to.equal(420)
      expect(core.stepDelay({ dur: 2 })).to.equal(960)
      expect(core.stepDelay({ dur: 100 })).to.equal(1700)
      expect(core.segmentGrow({ dur: 4 })).to.equal(2)
      expect(core.segmentGrow({})).to.equal(Math.sqrt(0.2))
      expect(core.segmentGrow({ dur: 0 })).to.equal(Math.sqrt(0.2))
    })

    it('formatDuration usa vírgula decimal, exceto em inglês', () => {
      expect(core.formatDuration(1.5, 'pt-BR')).to.equal('1,50')
      expect(core.formatDuration(1.5, 'es')).to.equal('1,50')
      expect(core.formatDuration(1.5, 'en')).to.equal('1.50')
    })

    it('flowColumns: requisição que parou tem coluna fixa para cada etapa que não rodou e para a resposta', () => {
      const model = core.buildFlowModel(core.parseStages(headers.semToken), 401, textosDoFluxo)
      expect(core.flowColumns(model)).to.equal('minmax(22px, 0.467fr) minmax(22px, 0.306fr) minmax(22px, 0.228fr) 22px 22px 22px 22px')
    })

    it('flowColumns: requisição que passou divide as colunas pela raiz da duração, e etapa pulada fica fixa', () => {
      const model = core.buildFlowModel(core.parseStages(headers.criado), 201, textosDoFluxo)
      expect(core.flowColumns(model)).to.equal('minmax(22px, 0.424fr) 22px minmax(22px, 1.187fr) minmax(22px, 0.566fr) minmax(22px, 1.449fr) minmax(22px, 1.010fr) 22px')
    })

    it('stageWidths: com o espaço justo as etapas que rodaram dividem o que sobra e somam o espaço inteiro', () => {
      // O caso do vão na barra fechada: 100,5 px de servidor para quatro etapas, uma pulada.
      const stages = core.parseStages('body;st=ok;dur=0.15, rate_limit;st=skipped, schema;st=ok;dur=0.08, rules;st=failed;dur=0.19')
      const widths = core.stageWidths(stages, 94.5, 22)
      expect(widths[1]).to.equal(22)
      expect(widths.every(width => width >= 22)).to.equal(true)
      expect(widths.reduce((total, width) => total + width, 0)).to.be.closeTo(94.5, 1e-9)
      expect(widths[3]).to.be.greaterThan(widths[0])
    })

    it('stageWidths: sem espaço para todas, cada etapa fica com o mínimo; sem etapa que rodou, dividem por igual', () => {
      const stages = core.parseStages('body;st=ok;dur=5, schema;st=failed;dur=0.01, rules;st=not_run')
      expect(core.stageWidths(stages, 60, 22)).to.deep.equal([22, 22, 22])
      const largas = core.stageWidths(stages, 200, 22)
      expect(largas[1]).to.equal(22)
      expect(largas[2]).to.equal(22)
      expect(largas[0]).to.be.closeTo(156, 1e-9)
      expect(core.stageWidths(core.parseStages('rate_limit;st=skipped, write;st=not_run'), 100, 22)).to.deep.equal([50, 50])
    })

    it('flowColumns: etapa que rodou sem duração usa a duração mínima do painel', () => {
      const model = core.buildFlowModel(core.parseStages('body;st=ok, auth;st=failed;reason=token_missing, write;st=not_run'), 401, textosDoFluxo)
      expect(core.flowColumns(model)).to.equal('minmax(22px, 0.500fr) minmax(22px, 0.500fr) 22px 22px')
    })

    it('flowColumns: etapas rápidas crescem na mesma proporção até as frações somarem pelo menos 1, para o desenho ir até o fim da coluna', () => {
      // O caso comum num servidor local: o limite de requisições pulado e duas etapas de décimos de milissegundo.
      const rapidas = 'body;st=ok;dur=0.19, rate_limit;st=skipped, auth;st=failed;dur=0.07;reason=token_missing, schema;st=not_run, rules;st=not_run, write;st=not_run'
      const colunas = core.flowColumns(core.buildFlowModel(core.parseStages(rapidas), 401, textosDoFluxo))
      const fracoes = colunas.match(/[0-9.]+(?=fr\))/g).map(Number)
      expect(colunas).to.equal('minmax(22px, 0.623fr) 22px minmax(22px, 0.378fr) 22px 22px 22px 22px')
      expect(fracoes.reduce((soma, valor) => soma + valor, 0)).to.be.at.least(1)
      expect(fracoes[0] / fracoes[1]).to.be.closeTo(Math.sqrt(0.19) / Math.sqrt(0.07), 0.01)
    })
  })

  describe('Tempo da requisição (Resource Timing)', () => {
    // Uma entrada como a do Chrome para um envio com conexão reaproveitada (DNS e TCP no fetchStart).
    const entrada = (extra = {}) => ({
      startTime: 1000,
      fetchStart: 1000,
      domainLookupStart: 1000,
      domainLookupEnd: 1000,
      connectStart: 1000,
      connectEnd: 1000,
      requestStart: 1000.6,
      responseStart: 1167.4,
      responseEnd: 1171,
      duration: 171,
      ...extra
    })

    it('resourceEntry escolhe a entrada mais nova que começou no início do envio ou depois', () => {
      const antiga = entrada({ startTime: 900 })
      const doEnvio = entrada({ startTime: 1000 })
      const maisNova = entrada({ startTime: 1005, duration: 50 })
      expect(core.resourceEntry([antiga, doEnvio], 1000)).to.equal(doEnvio)
      expect(core.resourceEntry([maisNova, doEnvio, antiga], 1000)).to.equal(maisNova)
      expect(core.resourceEntry([antiga], 1000)).to.equal(null)
    })

    it('resourceEntry devolve null sem entradas ou com uma duração que não é número', () => {
      expect(core.resourceEntry([], 0)).to.equal(null)
      expect(core.resourceEntry(undefined, 0)).to.equal(null)
      expect(core.resourceEntry([null, entrada({ duration: NaN })], 0)).to.equal(null)
    })

    it('resourcePhases separa conexão, TTFB e download, que somam a duração', () => {
      const fases = core.resourcePhases(entrada())
      expect(fases.conn).to.be.closeTo(0.6, 1e-9)
      expect(fases.ttfb).to.be.closeTo(166.8, 1e-9)
      expect(fases.down).to.be.closeTo(3.6, 1e-9)
      expect(fases.conn + fases.ttfb + fases.down).to.be.closeTo(entrada().duration, 1e-9)
      expect(fases.connNew).to.equal(false)
    })

    it('resourcePhases marca a conexão nova quando houve DNS ou TCP', () => {
      expect(core.resourcePhases(entrada({ connectStart: 1001, connectEnd: 1040, requestStart: 1058.3 })).connNew).to.equal(true)
      expect(core.resourcePhases(entrada({ domainLookupStart: 1000, domainLookupEnd: 1002 })).connNew).to.equal(true)
    })

    it('resourcePhases guarda o protocolo, as etapas de uma conexão nova e o tamanho do corpo', () => {
      const nova = core.resourcePhases(entrada({ nextHopProtocol: 'h2', domainLookupStart: 1000, domainLookupEnd: 1002, connectStart: 1002, secureConnectionStart: 1010, connectEnd: 1040, requestStart: 1058.3, encodedBodySize: 400, decodedBodySize: 1500 }))
      expect(nova).to.include({ protocol: 'h2', dns: 2, tcp: 8, tls: 30, secure: true, size: 1500, encoded: 400 })
      const http = core.resourcePhases(entrada({ connectStart: 1001, connectEnd: 1005, requestStart: 1058.3 }))
      expect(http).to.include({ tcp: 4, tls: 0, secure: false })
    })

    it('connParts põe a espera do navegador numa linha, e as linhas somam o tempo mostrado da conexão', () => {
      // O caso do balão real: 2,5 ms de conexão com DNS 0,0 e TCP 0,1 deixavam 2,4 ms sem explicação.
      expect(core.connParts(2.53, { dns: 0.01, tcp: 0.12, tls: 0 })).to.deep.equal({ wait: 2.4, dns: 0, tcp: 0.1, tls: 0 })
      // Em https o TLS entra na conta; os arredondamentos de cada linha não desfazem a soma.
      const parts = core.connParts(48.26, { dns: 12.34, tcp: 15.55, tls: 20.04 })
      expect(parts).to.deep.equal({ wait: 0.4, dns: 12.3, tcp: 15.6, tls: 20 })
      expect(Math.round((parts.wait + parts.dns + parts.tcp + parts.tls) * 10) / 10).to.equal(48.3)
      // Acima de 100 ms as linhas continuam somando o topo do balão, que timeLabels mostra com uma casa.
      const lenta = { dns: 5.2, tcp: 120.46, tls: 110.3 }
      const linhas = core.connParts(250.47, lenta)
      const topo = core.timeLabels(core.timeBar(400, { conn: 250.47, ttfb: 100, down: 49.53, connNew: true }, 10), 'en').conn
      expect(topo).to.equal('250.5 ms')
      expect(core.formatMsFixed(linhas.wait + linhas.dns + linhas.tcp + linhas.tls, 1, 'en')).to.equal(topo)
      // A espera nunca fica negativa.
      expect(core.connParts(0.1, { dns: 0.06, tcp: 0.06, tls: 0 }).wait).to.equal(0)
    })

    it('protocolName e formatBytes escrevem como as pessoas leem', () => {
      expect(core.protocolName('h2')).to.equal('HTTP/2')
      expect(core.protocolName('http/1.1')).to.equal('HTTP/1.1')
      expect(core.protocolName('h3')).to.equal('HTTP/3')
      expect(core.protocolName('')).to.equal(null)
      expect(core.formatBytes(435, 'pt-BR')).to.equal('435 bytes')
      expect(core.formatBytes(1536, 'pt-BR')).to.equal('1,5 KB')
      expect(core.formatBytes(1536, 'en')).to.equal('1.5 KB')
      expect(core.formatBytes(null, 'pt-BR')).to.equal(null)
    })

    it('headerLink leva ao MDN no idioma da página quando a página existe, e ignora header sem página', () => {
      expect(core.headerLink('content-type', 'pt-BR')).to.deep.equal({ url: 'https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Reference/Headers/Content-Type', english: false })
      expect(core.headerLink('Content-Type', 'es').url).to.include('/es/docs/')
      expect(core.headerLink('Date', 'es')).to.deep.equal({ url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Date', english: true })
      expect(core.headerLink('X-ServeRest-Stages', 'pt-BR')).to.equal(null)
      expect(core.headerLink('x-download-options', 'en')).to.equal(null)
    })

    it('curlWithTimes acrescenta a opção -w com uma variável do curl por linha, dentro das aspas', () => {
      const comando = core.curlWithTimes("curl -X GET 'http://localhost:3000/usuarios'")
      const linhas = comando.split('\n')
      expect(linhas[0]).to.equal("curl -X GET 'http://localhost:3000/usuarios' \\")
      expect(linhas[1]).to.equal("  -w '")
      expect(linhas.slice(2, 7)).to.deep.equal(core.CURL_TIME_VARS.map(nome => (nome + ':').padEnd(20) + '%{' + nome + '}s'))
      expect(linhas[7]).to.equal("'")
    })

    it('timeLink do web.dev escolhe a tradução pelo parâmetro hl', () => {
      expect(core.timeLink('webdev_ttfb', 'pt-BR')).to.deep.equal({ url: 'https://web.dev/articles/ttfb?hl=pt-br', english: false })
      expect(core.timeLink('webdev_ttfb', 'en')).to.deep.equal({ url: 'https://web.dev/articles/ttfb', english: false })
      expect(core.timeLink('overview', 'es').url).to.equal('https://developer.mozilla.org/es/docs/Web/HTTP/Guides/Overview')
      expect(core.timeLink('curl', 'pt-BR').english).to.equal(true)
    })

    it('resourcePhases devolve null sem entrada ou sem as fases (outra origem sem Timing-Allow-Origin)', () => {
      expect(core.resourcePhases(null)).to.equal(null)
      expect(core.resourcePhases(entrada({ requestStart: 0, responseStart: 0 }))).to.equal(null)
      expect(core.resourcePhases(entrada({ responseEnd: undefined }))).to.equal(null)
    })

    it('timeBar divide a rede (TTFB menos servidor) em ida e volta, e as cinco partes somam o total', () => {
      const fases = core.resourcePhases(entrada())
      const barra = core.timeBar(171, fases, 2.43)
      expect(barra.net).to.be.closeTo(164.37, 1e-9)
      expect(barra.half).to.be.closeTo(82.185, 1e-9)
      expect(barra.conn + barra.half + barra.server + barra.half + barra.down).to.be.closeTo(171, 1e-9)
      expect(barra).to.include({ total: 171, server: 2.43, connNew: false })
    })

    it('timeBar deixa a rede em zero se o servidor passar do TTFB', () => {
      const barra = core.timeBar(1, { conn: 0.2, ttfb: 0.7, down: 0.1, connNew: false }, 0.9)
      expect(barra.net).to.equal(0)
      expect(barra.half).to.equal(0)
    })

    it('timeWeights fica na escala real quando toda parte já tem a fatia mínima, como no localhost', () => {
      const local = { conn: 1.8, half: 0.3, server: 0.71, down: 0.4 }
      expect(core.timeWeights(local, 0.03)).to.deep.equal({ ...local, adjusted: false })
      expect(core.timeWeights(local, 0)).to.deep.equal({ ...local, adjusted: false })
    })

    it('a fatia mínima de cada parte é 3% da barra (Q18)', () => {
      expect(core.TIME_MIN_SHARE).to.equal(0.03)
    })

    it('timeWeights ajusta só o necessário em produção: a parte mais fina chega à fatia mínima, na mesma ordem', () => {
      const pesos = core.timeWeights({ conn: 0.6, half: 82, server: 2.4, down: 3.6 }, core.TIME_MIN_SHARE)
      const largura = pesos.conn + pesos.half * 2 + pesos.server + pesos.down
      expect(pesos.adjusted).to.equal(true)
      expect(pesos.conn / largura).to.be.within(0.03, 0.031)
      // Mesma ordem dos tempos: conexão < servidor < download < ida = volta.
      expect(pesos.conn).to.be.below(pesos.server)
      expect(pesos.server).to.be.below(pesos.down)
      expect(pesos.down).to.be.below(pesos.half)
    })

    it('timeWeights deixa em zero uma parte sem tempo e não a conta como a mais fina', () => {
      expect(core.timeWeights({ conn: 0, half: 0, server: 0, down: 0 }, 0.03)).to.deep.equal({ conn: 0, half: 0, server: 0, down: 0, adjusted: false })
      const pesos = core.timeWeights({ conn: 0, half: 40, server: 30, down: 30 }, 0.03)
      expect(pesos).to.deep.equal({ conn: 0, half: 40, server: 30, down: 30, adjusted: false })
    })

    it('formatShare: uma casa, vírgula fora do inglês, "< 0,1%" para fatia mínima e nada sem total', () => {
      expect(core.formatShare(2.43, 171, 'pt-BR')).to.equal('1,4%')
      expect(core.formatShare(2.43, 171, 'en')).to.equal('1.4%')
      expect(core.formatShare(0.05, 171, 'es')).to.equal('< 0,1%')
      expect(core.formatShare(0, 171, 'pt-BR')).to.equal('0,0%')
      expect(core.formatShare(1, 0, 'pt-BR')).to.equal(null)
      expect(core.formatShare(undefined, 171, 'pt-BR')).to.equal(null)
    })

    it('timeFallback faz do total o servidor mais a rede', () => {
      expect(core.timeFallback(171, 2.43)).to.deep.equal({ total: 171, server: 2.43, net: 171 - 2.43 })
      expect(core.timeFallback(1, 2).net).to.equal(0)
    })

    it('formatMs: inteiro a partir de 100 ms, uma casa abaixo, com vírgula fora do inglês', () => {
      expect(core.formatMs(170.6, 'pt-BR')).to.equal('171 ms')
      expect(core.formatMs(100, 'en')).to.equal('100 ms')
      expect(core.formatMs(99.94, 'pt-BR')).to.equal('99,9 ms')
      expect(core.formatMs(3.5, 'en')).to.equal('3.5 ms')
      expect(core.formatMs(3.5, 'es')).to.equal('3,5 ms')
    })

    it('timeLabels: o total como formatMs, o servidor com duas casas e o resto com uma', () => {
      const barra = core.timeBar(171, core.resourcePhases(entrada()), 2.43)
      expect(core.timeLabels(barra, 'pt-BR')).to.deep.equal({
        total: '171 ms', conn: '0,6 ms', ttfb: '166,8 ms', down: '3,6 ms', server: '2,43 ms', net: '164,4 ms', half: '82,2 ms'
      })
      expect(core.timeLabels(core.timeFallback(171, 2.43), 'en')).to.deep.equal({ total: '171 ms', server: '2.43 ms', net: '168.6 ms' })
    })

    it('timeLink: o Server-Timing em pt-BR tem tradução; as outras páginas são em inglês, e english só avisa fora do inglês', () => {
      expect(core.timeLink('server', 'pt-BR')).to.deep.equal({ url: 'https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Reference/Headers/Server-Timing', english: false })
      expect(core.timeLink('server', 'es')).to.deep.equal({ url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Server-Timing', english: true })
      expect(core.timeLink('server', 'en').english).to.equal(false)
      expect(core.timeLink('ttfb', 'pt-BR')).to.deep.equal({ url: 'https://developer.mozilla.org/en-US/docs/Glossary/Time_to_first_byte', english: true })
      expect(core.timeLink('ttfb', 'en').english).to.equal(false)
      ;['conn', 'outbound', 'inbound', 'total'].forEach(part => expect(core.safeHref(core.timeLink(part, 'es').url), part).to.be.a('string'))
      expect(core.timeLink('down', 'pt-BR')).to.equal(null)
      expect(core.timeLink('connection', 'pt-BR')).to.deep.equal({ url: 'https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/Connection_management_in_HTTP_1.x', english: false })
      expect(core.timeLink('connection', 'es').url).to.include('/es/docs/')
      expect(core.timeLink('connection', 'en')).to.deep.equal({ url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Connection_management_in_HTTP_1.x', english: false })
    })
  })

  describe('OpenAPI', () => {
    const metodosHttp = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']
    const operacoes = Object.keys(swaggerDocument.paths).flatMap(path =>
      Object.keys(swaggerDocument.paths[path])
        .filter(method => metodosHttp.includes(method))
        .map(method => ({ key: `${method} ${path}`, operation: swaggerDocument.paths[path][method] })))
    const routes = core.buildRoutes(swaggerDocument)

    it('buildRoutes devolve uma rota por operação do documento', () => {
      expect(operacoes.length).to.be.greaterThan(0)
      expect(routes.map(route => route.key)).to.deep.equal(operacoes.map(item => item.key))
    })

    it('buildRoutes marca needsToken exatamente nas operações que declaram security', () => {
      const comSecurity = operacoes
        .filter(({ operation }) => (operation.security || swaggerDocument.security || []).length > 0)
        .map(item => item.key)
      expect(comSecurity.length).to.be.greaterThan(0)
      expect(routes.filter(route => route.needsToken).map(route => route.key)).to.deep.equal(comSecurity)
    })

    it('buildRoutes dá exemplo não vazio a toda operação com corpo JSON', () => {
      const comCorpo = operacoes.filter(({ operation }) => {
        const requestBody = core.resolve(swaggerDocument, operation.requestBody)
        return requestBody && requestBody.content && requestBody.content['application/json']
      }).map(item => item.key)
      expect(comCorpo.length).to.be.greaterThan(0)
      comCorpo.forEach(key => {
        const route = routes.find(item => item.key === key)
        expect(route.body, key).to.not.equal(null)
        expect(Object.keys(route.body.example), key).to.have.length.greaterThan(0)
      })
      routes.filter(route => !comCorpo.includes(route.key)).forEach(route => expect(route.body, route.key).to.equal(null))
    })

    it('buildRoutes lê parâmetros de caminho, consulta e enum por $ref', () => {
      const porId = routes.find(route => route.key === 'get /usuarios/{_id}')
      expect(porId.params).to.have.length(1)
      expect(porId.params[0]).to.include({ name: '_id', in: 'path', required: true })
      const lista = routes.find(route => route.key === 'get /usuarios')
      expect(lista.params.every(param => param.in === 'query' && param.required === false)).to.equal(true)
      expect(lista.params.find(param => param.name === 'administrador').enumValues).to.deep.equal(['true', 'false'])
    })

    it('buildRoutes guarda o tipo de cada parâmetro, e um parâmetro sem tipo fica com texto vazio', () => {
      const porId = routes.find(route => route.key === 'get /usuarios/{_id}')
      expect(porId.params[0].type).to.equal('string')
      const lista = routes.find(route => route.key === 'get /produtos')
      lista.params.forEach(param => expect(param.type, param.name).to.be.a('string').and.not.equal(''))
      const semTipo = core.buildRoutes({ paths: { '/x': { get: { parameters: [{ name: 'a', in: 'query' }, { name: 'b', in: 'query', schema: { type: ['string', 'null'] } }] } } } })
      expect(semTipo[0].params.map(param => param.type)).to.deep.equal(['', ''])
    })

    it('buildRoutes guarda o schema do corpo resolvido, e só o exemplo continua indo para o editor', () => {
      const carrinho = routes.find(route => route.key === 'post /carrinhos')
      expect(carrinho.body.schema).to.include({ type: 'object' })
      expect(carrinho.body.schema.properties).to.have.property('produtos')
      expect(carrinho.body.example).to.have.property('produtos')
      routes.filter(route => route.body).forEach(route => expect(route.body.schema, route.key).to.not.have.property('$ref'))
    })

    describe('deref', () => {
      const spec = {
        components: {
          schemas: {
            nome: { type: 'string', minLength: 1 },
            item: { type: 'object', properties: { id: { $ref: '#/components/schemas/nome' } } },
            corpo: { type: 'object', properties: { nome: { $ref: '#/components/schemas/nome' }, itens: { type: 'array', items: { $ref: '#/components/schemas/item' } } } },
            laco: { type: 'object', properties: { filho: { $ref: '#/components/schemas/laco' } } }
          }
        }
      }

      it('resolve $ref nas propriedades e nos itens, também aninhados', () => {
        const schema = core.deref(spec, { $ref: '#/components/schemas/corpo' })
        expect(schema.properties.nome).to.deep.equal({ type: 'string', minLength: 1 })
        expect(schema.properties.itens.items.properties.id).to.deep.equal({ type: 'string', minLength: 1 })
      })

      it('não altera o documento: as partes resolvidas são cópias', () => {
        const antes = JSON.stringify(spec)
        const schema = core.deref(spec, { $ref: '#/components/schemas/corpo' })
        schema.properties.nome.minLength = 9
        expect(JSON.stringify(spec)).to.equal(antes)
      })

      it('para depois da profundidade 6 em schema recursivo e devolve null sem schema', () => {
        // Da profundidade 0 à 6 vêm cópias resolvidas; na 7 volta o próprio schema do documento, sem resolver os filhos.
        const original = spec.components.schemas.laco
        let nivel = core.deref(spec, { $ref: '#/components/schemas/laco' })
        let copias = 0
        while (nivel !== original) {
          copias++
          nivel = nivel.properties.filho
        }
        expect(copias).to.equal(7)
        expect(nivel.properties.filho).to.deep.equal({ $ref: '#/components/schemas/laco' })
        expect(core.deref(spec, null)).to.equal(null)
        expect(core.deref(spec, { $ref: '#/components/schemas/nao_existe' })).to.equal(null)
      })
    })

    describe('schemaRows', () => {
      // O requestBodyCarrinho como src/models/carrinho-model.js o valida: o documento corrigido que o trunk
      // ainda vai receber.
      const carrinhoCorrigido = {
        type: 'object',
        required: ['produtos'],
        additionalProperties: false,
        properties: {
          produtos: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['idProduto', 'quantidade'],
              additionalProperties: false,
              properties: { idProduto: { type: 'string', minLength: 1 }, quantidade: { type: 'integer', minimum: 1 } }
            }
          }
        }
      }

      it('dá ao array de objetos uma linha de grupo e, logo abaixo, os campos de cada item', () => {
        const rows = core.schemaRows(carrinhoCorrigido)
        expect(rows.map(row => row.groupLabel || row.path)).to.deep.equal(['produtos', 'produtos', 'produtos.idProduto', 'produtos.quantidade'])
        expect(rows[0]).to.include({ name: 'produtos', group: null, type: 'array', required: true })
        expect(rows[1]).to.deep.equal({ groupLabel: 'produtos' })
        expect(rows[2]).to.include({ name: 'idProduto', group: 'produtos', type: 'string', required: true })
        expect(rows[3].prop).to.deep.equal({ type: 'integer', minimum: 1 })
      })

      it('marca obrigatório só o que está em required', () => {
        const produto = { type: 'object', required: ['nome'], properties: { nome: { type: 'string' }, imagem: { type: 'string' } } }
        expect(core.schemaRows(produto).map(row => [row.name, row.required])).to.deep.equal([['nome', true], ['imagem', false]])
        expect(core.schemaRows({ properties: { a: {} } })[0]).to.include({ required: false, type: '' })
      })

      it('additionalProperties não vira linha: a frase do fim fica com quem desenha a tabela', () => {
        const aberto = { type: 'object', required: [], additionalProperties: { type: 'string' }, properties: { a: { type: 'string' } } }
        expect(core.schemaRows(aberto).map(row => row.name)).to.deep.equal(['a'])
        expect(core.schemaRows(carrinhoCorrigido).filter(row => row.name === 'additionalProperties')).to.deep.equal([])
        expect(core.schemaRows(null)).to.deep.equal([])
      })
    })

    it('authHeaderOf devolve o header do esquema de segurança e Authorization como padrão', () => {
      expect(core.authHeaderOf(swaggerDocument)).to.equal('Authorization')
      expect(core.authHeaderOf({ components: { securitySchemes: { chave: { type: 'apiKey', in: 'header', name: 'X-Token' } } } })).to.equal('X-Token')
      expect(core.authHeaderOf({})).to.equal('Authorization')
    })

    it('exampleOf cai para examples, exemplo do schema e propriedades', () => {
      const spec = { components: { schemas: { s: { properties: { a: { example: 1 }, b: { default: 'x' }, c: {} } } } } }
      expect(core.exampleOf(spec, { examples: { um: { value: { v: 1 } } } })).to.deep.equal({ v: 1 })
      expect(core.exampleOf(spec, { schema: { example: { w: 2 } } })).to.deep.equal({ w: 2 })
      expect(core.exampleOf(spec, { schema: { $ref: '#/components/schemas/s' } })).to.deep.equal({ a: 1, b: 'x', c: '' })
      expect(core.exampleOf(spec, { schema: { type: 'string' } })).to.equal(undefined)
      expect(core.exampleOf(spec, null)).to.equal(undefined)
    })

    it('resolve não entra em laço com $ref circular', () => {
      const spec = { a: { $ref: '#/b' }, b: { $ref: '#/a' } }
      expect(() => core.resolve(spec, { $ref: '#/a' })).to.not.throw()
      expect(core.resolve(spec, { $ref: 'http://fora' })).to.equal(null)
    })

    it('tagOrder segue a ordem do documento e acrescenta tags não declaradas', () => {
      const order = core.tagOrder({ tags: [{ name: 'B' }, { name: 'A' }] }, [{ tag: 'A' }, { tag: 'C' }, { tag: 'B' }])
      expect(order).to.deep.equal(['B', 'A', 'C'])
    })

    describe('responsesOf', () => {
      it('lê as respostas documentadas de POST /carrinhos, inclusive a que vem por $ref', () => {
        const documento = localizeSwaggerDocument(swaggerDocument, 'pt-BR')
        expect(core.responsesOf(documento, documento.paths['/carrinhos'].post)).to.deep.equal([
          {
            status: '201',
            description: ptBr['paths.carrinhos.post.responses.201.description'],
            example: { message: 'Cadastro realizado com sucesso', _id: 'jogfODIlXsqxNFS2' }
          },
          {
            status: '400',
            description: ptBr['paths.carrinhos.post.responses.400.description'],
            example: { message: 'Não é permitido possuir produto duplicado | Não é permitido ter mais de 1 carrinho | Produto não encontrado | Produto não possui quantidade suficiente' }
          },
          {
            status: '401',
            description: ptBr['components.responses.TokenInvalido.description'],
            example: { message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais' }
          }
        ])
      })

      it('usa example e examples do conteúdo antes do schema', () => {
        const spec = { components: { examples: { ok: { value: { v: 2 } } } } }
        const operation = {
          responses: {
            200: { description: 'a', content: { 'application/json': { example: { v: 1 }, schema: { example: { v: 9 } } } } },
            201: { description: 'b', content: { 'application/json': { examples: { primeiro: { $ref: '#/components/examples/ok' } } } } },
            202: { description: 'c', content: { 'application/json': { examples: {}, schema: { example: 'do schema' } } } }
          }
        }
        expect(core.responsesOf(spec, operation).map(response => response.example)).to.deep.equal([{ v: 1 }, { v: 2 }, 'do schema'])
      })

      it('monta o exemplo só com o que o schema documenta, sem inventar valor para folha sem exemplo', () => {
        const spec = { components: { schemas: { item: { properties: { id: { example: 'abc' }, nota: { type: 'string' } } } } } }
        const schema = {
          properties: {
            quantidade: { type: 'number', example: 2 },
            itens: { type: 'array', items: { $ref: '#/components/schemas/item' } },
            vazios: { type: 'array', items: { type: 'string' } },
            semExemplo: { properties: { a: { type: 'string' } } }
          }
        }
        const [response] = core.responsesOf(spec, { responses: { 200: { description: 'd', content: { 'application/json': { schema } } } } })
        expect(response.example).to.deep.equal({ quantidade: 2, itens: [{ id: 'abc' }] })
      })

      it('resposta sem conteúdo JSON, sem exemplo ou sem descrição dá exemplo undefined e descrição vazia', () => {
        const operation = {
          responses: {
            204: { description: 'sem corpo' },
            400: { content: { 'text/plain': { example: 'x' } } },
            500: { content: { 'application/json': { schema: { type: 'string' } } } },
            502: { $ref: '#/naoExiste' }
          }
        }
        expect(core.responsesOf({}, operation)).to.deep.equal([
          { status: '204', description: 'sem corpo', example: undefined },
          { status: '400', description: '', example: undefined },
          { status: '500', description: '', example: undefined },
          { status: '502', description: '', example: undefined }
        ])
        expect(core.responsesOf({}, {})).to.deep.equal([])
      })

      it('para em schema recursivo', () => {
        const spec = { components: { schemas: { no: { properties: { filho: { $ref: '#/components/schemas/no' }, nome: { example: 'n' } } } } } }
        const [response] = core.responsesOf(spec, { responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/no' } } } } } })
        let profundidade = 0
        let atual = response.example
        while (atual.filho) {
          atual = atual.filho
          profundidade++
        }
        expect(atual).to.deep.equal({ nome: 'n' })
        expect(profundidade).to.equal(5)
      })

      it('buildRoutes guarda as respostas documentadas e o operationId de cada rota', () => {
        const carrinho = routes.find(route => route.key === 'post /carrinhos')
        expect(carrinho.responses).to.deep.equal(core.responsesOf(swaggerDocument, swaggerDocument.paths['/carrinhos'].post))
        expect(routes.every(route => route.operationId === '')).to.equal(true)
        const comId = core.buildRoutes({ paths: { '/x': { get: { operationId: 'listarX', tags: ['X'] } } } })
        expect(comId[0]).to.include({ operationId: 'listarX' })
        expect(comId[0].responses).to.deep.equal([])
      })
    })

    describe('swaggerLink', () => {
      const rota = key => routes.find(route => route.key === key)

      it('sem operationId, usa o id que o Swagger UI gera a partir do método e do caminho', () => {
        expect(core.swaggerLink(rota('post /carrinhos'), 'pt-BR')).to.equal('/swagger?lang=pt-BR#/Carrinhos/post_carrinhos')
      })

      it('caminho com parâmetro troca por "_" tudo que não é letra, dígito ou "_", e codifica a tag', () => {
        expect(core.swaggerLink(rota('get /usuarios/{_id}'), 'en')).to.equal('/swagger?lang=en#/Usu%C3%A1rios/get_usuarios___id_')
        expect(core.swaggerLink(rota('delete /carrinhos/concluir-compra'), 'es')).to.equal('/swagger?lang=es#/Carrinhos/delete_carrinhos_concluir_compra')
      })

      it('com operationId, usa o do documento', () => {
        const route = { method: 'post', path: '/login', tag: 'Login', operationId: 'fazerLogin' }
        expect(core.swaggerLink(route, 'pt-BR')).to.equal('/swagger?lang=pt-BR#/Login/fazerLogin')
      })

      it('operação sem tag vai para o grupo default, como no Swagger UI', () => {
        expect(core.swaggerLink({ method: 'get', path: '/x', tag: '', operationId: '' }, 'pt-BR')).to.equal('/swagger?lang=pt-BR#/default/get_x')
      })
    })
  })

  describe('Requisição', () => {
    const routes = core.buildRoutes(swaggerDocument)
    const rota = key => routes.find(route => route.key === key)
    const opcoes = { baseUrl: 'http://localhost:3000', authValue: 'Bearer abc', authHeader: 'Authorization' }

    it('buildRequest codifica os valores dos parâmetros de caminho', () => {
      const request = core.buildRequest(rota('get /usuarios/{_id}'), rascunho({ 'path:_id': 'a/b c?' }), opcoes)
      expect(request.url).to.equal('http://localhost:3000/usuarios/a%2Fb%20c%3F')
      expect(request.method).to.equal('GET')
    })

    it('buildRequest omite parâmetros de consulta vazios', () => {
      const request = core.buildRequest(rota('get /usuarios'), rascunho({ 'query:nome': 'Fulano Silva', 'query:email': '', 'query:administrador': 'true' }), opcoes)
      expect(request.url).to.equal('http://localhost:3000/usuarios?nome=Fulano%20Silva&administrador=true')
      const semFiltro = core.buildRequest(rota('get /usuarios'), rascunho({}), opcoes)
      expect(semFiltro.url).to.equal('http://localhost:3000/usuarios')
    })

    it('buildRequest envia Content-Type só quando há corpo', () => {
      const comCorpo = core.buildRequest(rota('post /usuarios'), rascunho({}, '{"nome": "x"}'), opcoes)
      expect(comCorpo.headers).to.deep.equal([['Content-Type', 'application/json']])
      expect(comCorpo.body).to.equal('{"nome": "x"}')
      const corpoVazio = core.buildRequest(rota('post /usuarios'), rascunho({}, '   '), opcoes)
      expect(corpoVazio.headers).to.deep.equal([])
      expect(corpoVazio.body).to.equal(undefined)
      const semCorpo = core.buildRequest(rota('get /usuarios'), rascunho({}, '{"a": 1}'), opcoes)
      expect(semCorpo.headers).to.deep.equal([])
      expect(semCorpo.body).to.equal(undefined)
    })

    it('buildRequest envia o header de autenticação só quando a rota pede e há token, nunca vazio', () => {
      const comToken = core.buildRequest(rota('post /carrinhos'), rascunho({}, '{}'), opcoes)
      expect(comToken.headers).to.deep.equal([['Content-Type', 'application/json'], ['Authorization', 'Bearer abc']])
      const outroHeader = core.buildRequest(rota('delete /carrinhos/concluir-compra'), rascunho({}), { ...opcoes, authHeader: 'X-Token' })
      expect(outroHeader.headers).to.deep.equal([['X-Token', 'Bearer abc']])
      ;[null, undefined, '', '   ', ' \t '].forEach(authValue => {
        const semToken = core.buildRequest(rota('post /carrinhos'), rascunho({}, '{}'), { ...opcoes, authValue })
        expect(semToken.headers.map(header => header[0]), JSON.stringify(authValue)).to.deep.equal(['Content-Type'])
      })
      const publica = core.buildRequest(rota('get /produtos'), rascunho({}), opcoes)
      expect(publica.headers).to.deep.equal([])
    })

    it('buildRequest envia o valor editado como foi digitado, sem acrescentar Bearer', () => {
      const request = core.buildRequest(rota('delete /carrinhos/concluir-compra'), rascunho({}), { ...opcoes, authValue: 'abc.def' })
      expect(request.headers).to.deep.equal([['Authorization', 'abc.def']])
    })

    it('buildRequest tira espaços e tabs das pontas do valor do header de autenticação', () => {
      const request = core.buildRequest(rota('delete /carrinhos/concluir-compra'), rascunho({}), { ...opcoes, authValue: ' \tBearer abc \t ' })
      expect(request.headers).to.deep.equal([['Authorization', 'Bearer abc']])
      expect(core.curlOf(request)).to.include("-H 'Authorization: Bearer abc'")
    })

    it('buildRequest nunca põe o header de autenticação em rota pública, mesmo com valor', () => {
      const publica = core.buildRequest(rota('get /produtos'), rascunho({}), { ...opcoes, authValue: 'abc' })
      expect(publica.headers).to.deep.equal([])
    })

    it('authValueFor usa o valor editado da rota e, sem edição, o token da página', () => {
      expect(core.authValueFor(rascunho({}), 'Bearer abc')).to.equal('Bearer abc')
      expect(core.authValueFor(rascunho({}), null)).to.equal('')
      expect(core.authValueFor({ ...rascunho({}), auth: '' }, 'Bearer abc')).to.equal('')
      expect(core.authValueFor({ ...rascunho({}), auth: 'abc' }, 'Bearer abc')).to.equal('abc')
    })

    it('isSendableHeaderValue aceita só caracteres que podem ir em um header HTTP', () => {
      const token = jwt.sign({ email: 'fulano@qa.com', password: 'teste' }, 'segredo')
      expect(core.isSendableHeaderValue('Bearer ' + token)).to.equal(true)
      expect(core.isSendableHeaderValue('')).to.equal(true)
      expect(core.isSendableHeaderValue('Bearer açúcar')).to.equal(true)
      expect(core.isSendableHeaderValue('Bearer abc\ndef')).to.equal(false)
      expect(core.isSendableHeaderValue('Bearer abc😀')).to.equal(false)
    })

    it('buildRequest mantém {nome} quando o parâmetro de caminho está vazio', () => {
      const request = core.buildRequest(rota('get /usuarios/{_id}'), rascunho({ 'path:_id': '' }), opcoes)
      expect(request.url).to.equal('http://localhost:3000/usuarios/{_id}')
    })

    it('curlOf: corpo com aspas simples sobrevive à citação do shell', () => {
      const corpo = '{"nome": "O\'Brien", "descricao": "it\'s \'quoted\' $HOME `x`"}'
      const request = core.buildRequest(rota('post /usuarios'), rascunho({}, corpo), opcoes)
      const comando = core.curlOf(request)
      expect(comando).to.include("curl -X POST 'http://localhost:3000/usuarios'")
      expect(comando).to.include("-H 'Content-Type: application/json'")
      const ecoado = execFileSync('sh', ['-c', 'printf %s ' + core.shellQuote(corpo)]).toString()
      expect(ecoado).to.equal(corpo)
      expect(comando).to.include('-d ' + core.shellQuote(corpo))
    })

    describe('curlParts', () => {
      const requisicao = {
        method: 'POST',
        url: 'http://localhost:3000/carrinhos',
        headers: [['Content-Type', 'application/json'], ['Authorization', 'Bearer a.b']],
        body: '{"produtos": []}'
      }

      it('devolve o início, um header por linha e o corpo, cada parte com o texto que entra no comando', () => {
        expect(core.curlParts(requisicao)).to.deep.equal([
          { kind: 'start', method: 'POST', url: 'http://localhost:3000/carrinhos', text: "curl -X POST 'http://localhost:3000/carrinhos'" },
          { kind: 'header', name: 'Content-Type', value: 'application/json', text: "-H 'Content-Type: application/json'" },
          { kind: 'header', name: 'Authorization', value: 'Bearer a.b', text: "-H 'Authorization: Bearer a.b'" },
          { kind: 'body', flag: '-d', body: '{"produtos": []}', text: "-d '{\"produtos\": []}'" }
        ])
      })

      it('corpo que começa por @ vai com --data-raw, para o curl não ler um arquivo local', () => {
        const parts = core.curlParts({ ...requisicao, headers: [], body: '@/etc/passwd' })
        expect(parts[1]).to.include({ kind: 'body', flag: '--data-raw', text: "--data-raw '@/etc/passwd'" })
      })

      it('sem corpo, nenhuma parte de corpo', () => {
        const parts = core.curlParts({ method: 'GET', url: 'http://x/usuarios', headers: [], body: undefined })
        expect(parts.map(part => part.kind)).to.deep.equal(['start'])
      })

      it('curlOf é a junção das partes e continua igual ao formato de antes', () => {
        expect(core.curlOf(requisicao)).to.equal("curl -X POST 'http://localhost:3000/carrinhos' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer a.b' \\\n  -d '{\"produtos\": []}'")
        expect(core.curlOf({ method: 'GET', url: 'http://x/a', headers: [], body: undefined })).to.equal("curl -X GET 'http://x/a'")
      })
    })

    it('statusText vem da tabela fixa e é vazio para código desconhecido', () => {
      expect(core.statusText(401)).to.equal('Unauthorized')
      expect(core.statusText(299)).to.equal('')
    })
  })

  describe('decodeJwtExp', () => {
    const token = jwt.sign({ email: 'fulano@qa.com', password: 'teste' }, 'segredo', { expiresIn: 600 })
    const exp = jwt.decode(token).exp

    it('lê o exp de um token válido', () => {
      expect(core.decodeJwtExp(token).getTime()).to.equal(exp * 1000)
    })

    it('lê o exp de um token com o prefixo Bearer', () => {
      expect(core.decodeJwtExp('Bearer ' + token).getTime()).to.equal(exp * 1000)
    })

    it('devolve null para lixo, sem lançar exceção', () => {
      ;['', 'lixo', 'a.b.c', 'Bearer ', null, undefined, 42, 'x.' + Buffer.from('{"exp":"amanhã"}').toString('base64url') + '.y'].forEach(valor => {
        expect(() => core.decodeJwtExp(valor)).to.not.throw()
        expect(core.decodeJwtExp(valor), String(valor)).to.equal(null)
      })
    })
  })

  describe('tokenCaptionState', () => {
    const agora = new Date('2026-11-12T12:00:00Z')
    const daquiAUmMinuto = new Date(agora.getTime() + 60000)
    const haUmMilissegundo = new Date(agora.getTime() - 1)
    const estado = (entrada) => core.tokenCaptionState({ hasToken: false, expiresAt: null, now: agora, edited: false, filledFrom: null, ...entrada })

    it('none: sem token e sem edição, mesmo com uma validade guardada', () => {
      expect(estado({})).to.equal('none')
      expect(estado({ expiresAt: daquiAUmMinuto })).to.equal('none')
    })

    it('active: token com validade no futuro', () => {
      expect(estado({ hasToken: true, expiresAt: daquiAUmMinuto })).to.equal('active')
    })

    it('active_no_exp: token sem validade conhecida', () => {
      expect(estado({ hasToken: true })).to.equal('active_no_exp')
    })

    it('expired: token com validade no passado ou exatamente agora', () => {
      expect(estado({ hasToken: true, expiresAt: haUmMilissegundo })).to.equal('expired')
      expect(estado({ hasToken: true, expiresAt: agora })).to.equal('expired')
    })

    it('edited: o campo editado vale mais que o token, com ou sem token', () => {
      expect(estado({ edited: true })).to.equal('edited')
      expect(estado({ edited: true, hasToken: true, expiresAt: haUmMilissegundo })).to.equal('edited')
    })

    it('filled: campo preenchido por um envio do histórico', () => {
      expect(estado({ edited: true, filledFrom: haUmMilissegundo })).to.equal('filled')
      expect(estado({ edited: true, hasToken: true, expiresAt: daquiAUmMinuto, filledFrom: haUmMilissegundo })).to.equal('filled')
    })

    it('filledFrom sem edição não conta: o campo segue o token', () => {
      expect(estado({ filledFrom: haUmMilissegundo, hasToken: true, expiresAt: daquiAUmMinuto })).to.equal('active')
    })

    it('aceita validade e relógio em milissegundos', () => {
      expect(estado({ hasToken: true, expiresAt: daquiAUmMinuto.getTime(), now: agora.getTime() })).to.equal('active')
      expect(estado({ hasToken: true, expiresAt: haUmMilissegundo.getTime(), now: agora.getTime() })).to.equal('expired')
    })
  })

  describe('Histórico', () => {
    const routes = core.buildRoutes(swaggerDocument)
    const rota = key => routes.find(route => route.key === key)
    const opcoes = { baseUrl: 'http://localhost:3000', authValue: 'Bearer abc', authHeader: 'Authorization' }
    const envio = (id, method, path) => ({ id, method, path, curl: '' })

    it('lastResultByRoute devolve o envio mais recente de cada rota, com a chave da rota', () => {
      const antigo = envio(1, 'POST', '/carrinhos')
      const produtos = envio(2, 'GET', '/produtos')
      const recente = envio(3, 'POST', '/carrinhos')
      const ultimos = core.lastResultByRoute([recente, produtos, antigo])
      expect(ultimos.size).to.equal(2)
      expect(ultimos.get(rota('post /carrinhos').key)).to.equal(recente)
      expect(ultimos.get(rota('get /produtos').key)).to.equal(produtos)
      expect(ultimos.has('post /login')).to.equal(false)
      expect(core.lastResultByRoute([]).size).to.equal(0)
    })

    it('recordKey dá ao envio a mesma chave da rota dele', () => {
      expect(core.recordKey(envio(1, 'POST', '/carrinhos'))).to.equal(rota('post /carrinhos').key)
      expect(core.recordKey(envio(2, 'GET', '/usuarios/{_id}'))).to.equal(rota('get /usuarios/{_id}').key)
    })

    it('isOlderThanLatest só é verdade para um envio do histórico com envio mais recente da mesma rota', () => {
      const antigo = envio(1, 'POST', '/carrinhos')
      const produtos = envio(2, 'GET', '/produtos')
      const recente = envio(3, 'POST', '/carrinhos')
      const historico = [recente, produtos, antigo]
      expect(core.isOlderThanLatest(antigo, historico)).to.equal(true)
      expect(core.isOlderThanLatest(recente, historico)).to.equal(false)
      expect(core.isOlderThanLatest(produtos, historico)).to.equal(false)
      expect(core.isOlderThanLatest(envio(4, 'POST', '/carrinhos'), historico)).to.equal(false)
      expect(core.isOlderThanLatest(antigo, [])).to.equal(false)
    })

    describe('recordDiffersFromDraft', () => {
      function enviado (route, draft, options = opcoes) {
        return { curl: core.curlOf(core.buildRequest(route, draft, options)) }
      }

      it('é falso quando a requisição é a mesma do envio', () => {
        const route = rota('post /carrinhos')
        const record = enviado(route, rascunho({}, '{"produtos": []}'))
        expect(core.recordDiffersFromDraft(record, core.buildRequest(route, rascunho({}, '{"produtos": []}'), opcoes))).to.equal(false)
      })

      it('é verdade quando o corpo mudou', () => {
        const route = rota('post /carrinhos')
        const record = enviado(route, rascunho({}, '{"produtos": []}'))
        expect(core.recordDiffersFromDraft(record, core.buildRequest(route, rascunho({}, '{"produtos": [1]}'), opcoes))).to.equal(true)
      })

      it('é verdade quando um parâmetro de caminho ou de consulta mudou', () => {
        const porId = rota('get /usuarios/{_id}')
        const record = enviado(porId, rascunho({ 'path:_id': 'abc' }))
        expect(core.recordDiffersFromDraft(record, core.buildRequest(porId, rascunho({ 'path:_id': 'abd' }), opcoes))).to.equal(true)
        const lista = rota('get /usuarios')
        const semFiltro = enviado(lista, rascunho({}))
        expect(core.recordDiffersFromDraft(semFiltro, core.buildRequest(lista, rascunho({ 'query:nome': 'Fulano' }), opcoes))).to.equal(true)
      })

      it('é verdade quando o Authorization mudou ou deixou de ir, e falso quando só mudaram espaços das pontas', () => {
        const route = rota('delete /carrinhos/concluir-compra')
        const record = enviado(route, rascunho({}))
        const com = authValue => core.buildRequest(route, rascunho({}), { ...opcoes, authValue })
        expect(core.recordDiffersFromDraft(record, com('Bearer xyz'))).to.equal(true)
        expect(core.recordDiffersFromDraft(record, com(''))).to.equal(true)
        expect(core.recordDiffersFromDraft(record, com('  Bearer abc\t'))).to.equal(false)
      })
    })
  })

  describe('offerState', () => {
    const login = (body, extra = {}) => ({ error: null, status: 200, method: 'POST', path: '/login', bodyText: JSON.stringify(body), ...extra })
    const token = 'Bearer ' + jwt.sign({ email: 'fulano@qa.com' }, 'segredo', { expiresIn: 600 })
    const vencido = 'Bearer ' + jwt.sign({ email: 'fulano@qa.com', exp: Math.floor(Date.now() / 1000) - 60 }, 'segredo')

    it('é none para um envio que não é um login com token', () => {
      expect(core.offerState({ record: login({ authorization: token }, { status: 401 }), pageToken: null })).to.equal('none')
      expect(core.offerState({ record: login({ authorization: token }, { path: '/usuarios' }), pageToken: null })).to.equal('none')
      expect(core.offerState({ record: login({ message: 'Login realizado com sucesso' }), pageToken: null })).to.equal('none')
      expect(core.offerState({ record: login({}, { bodyText: 'não é json' }), pageToken: null })).to.equal('none')
      expect(core.offerState({ record: login({ authorization: token }, { error: 'Failed to fetch' }), pageToken: null })).to.equal('none')
    })

    it('é in_use quando o token do envio já é o da página e use quando é outro ou nenhum', () => {
      const record = login({ authorization: token })
      expect(core.offerState({ record, pageToken: token })).to.equal('in_use')
      expect(core.offerState({ record, pageToken: null })).to.equal('use')
      expect(core.offerState({ record, pageToken: vencido })).to.equal('use')
    })

    it('um token vencido recebe o mesmo botão (a validade não conta)', () => {
      expect(core.offerState({ record: login({ authorization: vencido }), pageToken: null })).to.equal('use')
    })
  })

  describe('tokenInUseId', () => {
    const login = (id, authorization, extra = {}) => ({ id, error: null, status: 200, method: 'POST', path: '/login', bodyText: JSON.stringify({ message: 'Login realizado com sucesso', authorization }), ...extra })
    const antigo = 'Bearer ' + jwt.sign({ email: 'fulano@qa.com', n: 1 }, 'segredo')
    const novo = 'Bearer ' + jwt.sign({ email: 'fulano@qa.com', n: 2 }, 'segredo')
    // A lista do Histórico: o mais recente primeiro.
    const historico = [
      { id: 5, error: null, status: 201, method: 'POST', path: '/produtos', bodyText: '{"_id":"abc"}' },
      login(4, novo),
      login(3, antigo, { status: 401 }),
      login(2, antigo),
      { id: 1, error: null, status: 200, method: 'GET', path: '/usuarios', bodyText: JSON.stringify({ authorization: novo }) }
    ]

    it('aponta o login cujo token é o valor enviado, o mais novo ou o mais antigo', () => {
      expect(core.tokenInUseId(historico, novo)).to.equal(4)
      expect(core.tokenInUseId(historico, antigo)).to.equal(2)
    })

    it('não aponta nenhum com valor vazio, sem valor ou com um valor que não é token de login', () => {
      expect(core.tokenInUseId(historico, '')).to.equal(null)
      expect(core.tokenInUseId(historico, null)).to.equal(null)
      expect(core.tokenInUseId(historico, 'Bearer qualquer-coisa')).to.equal(null)
      expect(core.tokenInUseId([], novo)).to.equal(null)
    })

    it('com dois logins do mesmo token, aponta só o mais recente', () => {
      expect(core.tokenInUseId([login(9, novo), login(8, novo)], novo)).to.equal(9)
    })
  })

  describe('mdnStatusUrl', () => {
    const base = 'https://developer.mozilla.org/'

    it('usa o idioma da página para os códigos conferidos', () => {
      expect(core.mdnStatusUrl(401, 'pt-BR')).to.deep.equal({ url: base + 'pt-BR/docs/Web/HTTP/Reference/Status/401', english: false })
      expect(core.mdnStatusUrl(404, 'es')).to.deep.equal({ url: base + 'es/docs/Web/HTTP/Reference/Status/404', english: false })
      expect(core.mdnStatusUrl(200, 'en')).to.deep.equal({ url: base + 'en-US/docs/Web/HTTP/Reference/Status/200', english: false })
    })

    it('cai para en-US, com english, nos códigos que a MDN não traduziu', () => {
      expect(core.mdnStatusUrl(415, 'es')).to.deep.equal({ url: base + 'en-US/docs/Web/HTTP/Reference/Status/415', english: true })
      expect(core.mdnStatusUrl(429, 'es')).to.deep.equal({ url: base + 'en-US/docs/Web/HTTP/Reference/Status/429', english: true })
      expect(core.mdnStatusUrl(415, 'pt-BR')).to.deep.equal({ url: base + 'pt-BR/docs/Web/HTTP/Reference/Status/415', english: false })
      expect(core.mdnStatusUrl(418, 'pt-BR')).to.deep.equal({ url: base + 'en-US/docs/Web/HTTP/Reference/Status/418', english: true })
    })

    it('numa página em inglês english nunca é verdade', () => {
      expect(core.mdnStatusUrl(418, 'en').english).to.equal(false)
      expect(core.mdnStatusUrl(429, 'en').english).to.equal(false)
    })
  })

  describe('mdnMethodUrl', () => {
    const base = 'https://developer.mozilla.org/'
    const locais = { 'pt-BR': 'pt-BR', es: 'es', en: 'en-US' }

    it('usa o idioma da página para os quatro métodos do ServeRest e para PATCH', () => {
      Object.entries(locais).forEach(([idioma, local]) => {
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(metodo => {
          expect(core.mdnMethodUrl(metodo, idioma), `${idioma} ${metodo}`).to.deep.equal({ url: `${base}${local}/docs/Web/HTTP/Reference/Methods/${metodo}`, english: false })
        })
      })
    })

    it('aceita o método em minúsculas, como vem das rotas', () => {
      expect(core.mdnMethodUrl('post', 'pt-BR').url).to.equal(base + 'pt-BR/docs/Web/HTTP/Reference/Methods/POST')
    })

    it('cai para en-US com um método desconhecido, com english só fora de uma página em inglês', () => {
      expect(core.mdnMethodUrl('TRACE', 'pt-BR')).to.deep.equal({ url: base + 'en-US/docs/Web/HTTP/Reference/Methods/TRACE', english: true })
      expect(core.mdnMethodUrl('TRACE', 'es')).to.deep.equal({ url: base + 'en-US/docs/Web/HTTP/Reference/Methods/TRACE', english: true })
      expect(core.mdnMethodUrl('TRACE', 'en')).to.deep.equal({ url: base + 'en-US/docs/Web/HTTP/Reference/Methods/TRACE', english: false })
    })

    it('com um idioma desconhecido usa en-US e avisa que está em inglês', () => {
      expect(core.mdnMethodUrl('GET', 'fr')).to.deep.equal({ url: base + 'en-US/docs/Web/HTTP/Reference/Methods/GET', english: true })
      expect(core.mdnMethodUrl(undefined, undefined)).to.deep.equal({ url: base + 'en-US/docs/Web/HTTP/Reference/Methods/', english: true })
    })
  })

  describe('releaseNotice', () => {
    const url = 'https://github.com/ServeRest/ServeRest/releases/tag/v3.3.0'

    it('uma estável nova num servidor estável: a linha comum e o painel com a versão do servidor', () => {
      expect(core.releaseNotice({ running: '3.2.1', version: '3.2.2', url })).to.deep.equal({
        kind: 'panel', line: 'lab.version.notice', title: 'lab.release.title', runningKey: 'lab.release.running'
      })
    })

    it('um servidor que roda um pré-lançamento ouve falar da estável nova, e o painel diz beta', () => {
      expect(core.releaseNotice({ running: '3.3.0-beta.8', version: '3.3.0', url })).to.deep.equal({
        kind: 'panel', line: 'lab.version.notice_stable', title: 'lab.release.title_stable', runningKey: 'lab.release.running_beta'
      })
    })

    it('o aviso forçado sem versão é a linha simples, sem painel', () => {
      expect(core.releaseNotice({ running: '3.3.0-beta.8', version: '', url: 'https://github.com/ServeRest/ServeRest/releases' })).to.deep.equal({ kind: 'plain' })
    })

    it('sem URL, ou com uma URL que não é http ou https, não há aviso', () => {
      expect(core.releaseNotice({ running: '3.2.1', version: '', url: '' })).to.equal(null)
      expect(core.releaseNotice({ running: '3.2.1', version: '3.2.2', url: 'javascript:alert(1)' })).to.equal(null)
      expect(core.releaseNotice(undefined)).to.equal(null)
    })

    it('nunca compara versões: mostra o que o servidor decidiu, mesmo com uma versão mais antiga', () => {
      expect(core.releaseNotice({ running: '3.3.0-beta.8', version: '3.2.2', url }).kind).to.equal('panel')
    })
  })

  describe('feedbackInvite (R4 estendida, sem fim)', () => {
    // Abre a página em cada dia da lista (um dia de uso cada) e diz em quais o convite apareceu.
    const usar = (dias, { count = 3, inicio = core.readInvite(null), edition = 1 } = {}) => {
      let estado = inicio
      const vistos = []
      dias.forEach(dia => {
        estado = core.inviteVisit(estado, dia)
        const decisao = core.feedbackInvite({ count, today: dia, state: estado, session: null, edition })
        if (decisao.state) estado = decisao.state
        if (decisao.show) vistos.push(dia)
      })
      return { vistos, estado }
    }
    // n dias seguidos a partir de um dia (UTC, para não depender do fuso de quem roda o teste).
    const seguidos = (inicio, n) => Array.from({ length: n }, (_, i) => new Date(Date.parse(inicio + 'T00:00:00Z') + i * 86400000).toISOString().slice(0, 10))
    const dias = n => seguidos('2026-12-01', n)

    it('com menos de 3 envios no Histórico não aparece', () => {
      expect(core.feedbackInvite({ count: 2, today: '2026-12-01', state: core.readInvite(null) }).show).to.equal(false)
      expect(core.feedbackInvite(undefined).show).to.equal(false)
    })

    it('aparece no dia 1, pula os dias de uso 2 e 3 e volta no dia 4', () => {
      expect(usar(dias(4)).vistos).to.deep.equal(['2026-12-01', '2026-12-04'])
    })

    it('dias sem uso não contam: depois de aparecer, só o 3º dia de uso seguinte o traz de volta', () => {
      expect(usar(['2026-12-01', '2026-12-09', '2026-12-20', '2027-01-05', '2027-01-06']).vistos).to.deep.equal(['2026-12-01', '2027-01-05'])
    })

    it('nos 10 primeiros dias em que aparece segue a folga de 2 dias de uso', () => {
      const { vistos, estado } = usar(dias(28))
      expect(vistos).to.deep.equal(['01', '04', '07', '10', '13', '16', '19', '22', '25', '28'].map(dia => '2026-12-' + dia))
      expect(estado.days).to.equal(10)
    })

    it('depois do 10º dia não para: espera 30 dias do calendário, mesmo com uso todo dia', () => {
      const { vistos } = usar(seguidos('2026-12-01', 120))
      expect(vistos.slice(10)).to.deep.equal(['2027-01-27', '2027-02-26', '2027-03-28'])
    })

    it('depois do 10º dia, o primeiro dia de uso passados os 30 dias o traz de volta', () => {
      const { estado } = usar(dias(28))
      expect(usar(['2027-01-10', '2027-01-26', '2027-02-15', '2027-02-16'], { inicio: estado }).vistos).to.deep.equal(['2027-02-15'])
    })

    it('uma aba só por dia: a aba que mostrou continua mostrando; outra aba, no mesmo dia, não', () => {
      const primeira = core.feedbackInvite({ count: 3, today: '2026-12-01', state: core.inviteVisit(core.readInvite(null), '2026-12-01'), session: null })
      expect(primeira).to.include({ show: true, session: '2026-12-01' })
      expect(core.feedbackInvite({ count: 4, today: '2026-12-01', state: primeira.state, session: '2026-12-01' }).show).to.equal(true)
      expect(core.feedbackInvite({ count: 4, today: '2026-12-01', state: primeira.state, session: null }).show).to.equal(false)
    })

    it('respondido, some por 180 dias e volta no primeiro dia de uso depois deles', () => {
      const { estado } = usar(['2026-12-01'])
      const respondido = core.inviteEnd(estado, '2026-12-01', true, 1)
      expect(respondido).to.include({ answered: '2026-12-01', edition: 1 })
      const { vistos, estado: depois } = usar(seguidos('2026-12-02', 200), { inicio: respondido })
      expect(vistos[0]).to.equal('2027-05-30')
      expect(depois.answered).to.equal(null)
    })

    it('uma edição nova do formulário traz de volta na hora quem respondeu a anterior, e depois segue a folga', () => {
      const { estado } = usar(['2026-12-01'])
      const respondido = core.inviteEnd(estado, '2026-12-01', true, 1)
      expect(usar(['2026-12-02'], { inicio: respondido, edition: 1 }).vistos).to.deep.equal([])
      expect(usar(['2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05'], { inicio: respondido, edition: 2 }).vistos).to.deep.equal(['2026-12-02', '2026-12-05'])
      expect(usar(['2027-01-02'], { inicio: core.inviteEnd(respondido, '2027-01-01', true, 2), edition: 2 }).vistos).to.deep.equal([])
    })

    it('"Agora não" tira só naquele dia: o resto do dia, em qualquer aba, não aparece, e a contagem segue', () => {
      const { estado } = usar(['2026-12-01'])
      const fechado = core.inviteEnd(estado, '2026-12-01', false)
      expect(core.feedbackInvite({ count: 5, today: '2026-12-01', state: fechado, session: '2026-12-01' }).show).to.equal(false)
      expect(usar(['2026-12-02', '2026-12-03', '2026-12-04'], { inicio: fechado }).vistos).to.deep.equal(['2026-12-04'])
    })

    it('com o que a versão anterior guardou ("shown" ou "closed", com ou sem a marca "1" da aba), aparece no dia', () => {
      ;['shown', 'closed'].forEach(antigo => {
        ;[null, '1'].forEach(marca => {
          const estado = core.inviteVisit(core.readInvite(antigo, '2026-12-01'), '2026-12-01')
          const decisao = core.feedbackInvite({ count: 3, today: '2026-12-01', state: estado, session: marca })
          expect(decisao, antigo + ' ' + marca).to.include({ show: true, session: '2026-12-01' })
          expect(core.feedbackInvite({ count: 4, today: '2026-12-01', state: decisao.state, session: decisao.session }).show, antigo + ' ' + marca).to.equal(true)
        })
      })
    })

    it('migra o "answered" antigo (texto ou no JSON) para respondido hoje, na edição 1, e o conta por 180 dias', () => {
      const antigoJson = JSON.stringify({ days: 4, last: '2026-11-01', seen: '2026-11-10', gap: 3, off: null, answered: true })
      ;['answered', antigoJson].forEach(antigo => {
        const estado = core.readInvite(antigo, '2026-12-01')
        expect(estado, antigo).to.include({ answered: '2026-12-01', edition: 1 })
        ;[null, '1'].forEach(marca => {
          expect(core.feedbackInvite({ count: 3, today: '2026-12-01', state: core.inviteVisit(estado, '2026-12-01'), session: marca }).show, antigo + ' ' + marca).to.equal(false)
        })
        expect(usar(seguidos('2026-12-01', 182), { inicio: estado }).vistos, antigo).to.deep.equal(['2027-05-30'])
      })
    })

    it('migra os valores antigos: "shown" e "closed" recomeçam, e lixo vira estado novo', () => {
      ;['shown', 'closed', '{x', null, '[]'].forEach(antigo => {
        expect(usar(['2026-12-01'], { inicio: core.readInvite(antigo, '2026-12-01') }).vistos, String(antigo)).to.deep.equal(['2026-12-01'])
      })
    })

    it('o estado guardado continua um JSON pequeno', () => {
      const { estado } = usar(seguidos('2026-12-01', 400))
      expect(JSON.stringify(core.inviteEnd(estado, '2028-01-05', true, 3)).length).to.be.below(160)
    })

    it('dayKey é o dia do calendário local', () => {
      expect(core.dayKey(new Date(2026, 0, 5, 23, 59))).to.equal('2026-01-05')
    })
  })

  describe('prettyJson', () => {
    it('reindenta com dois espaços', () => {
      expect(core.prettyJson('{"a":1,"b":[1,2],"c":{"d":"x"}}')).to.equal('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ],\n  "c": {\n    "d": "x"\n  }\n}')
    })

    it('não converte nenhum valor', () => {
      expect(core.prettyJson('{"preco":1.0}')).to.equal('{\n  "preco": 1.0\n}')
      expect(core.prettyJson('{"a":1,"a":2}')).to.equal('{\n  "a": 1,\n  "a": 2\n}')
      expect(core.prettyJson('{"n":12345678901234567890}')).to.equal('{\n  "n": 12345678901234567890\n}')
      expect(core.prettyJson('{"t":"x,{y}: [z]"}')).to.equal('{\n  "t": "x,{y}: [z]"\n}')
      expect(core.prettyJson('{"t":"a\\"b,c"}')).to.equal('{\n  "t": "a\\"b,c"\n}')
    })

    it('objeto e lista vazios ficam numa linha', () => {
      expect(core.prettyJson('{}')).to.equal('{}')
      expect(core.prettyJson('[ ]')).to.equal('[]')
      expect(core.prettyJson('{"a":{},"b":[]}')).to.equal('{\n  "a": {},\n  "b": []\n}')
      expect(core.prettyJson('{ "a" :\n\t1 }')).to.equal('{\n  "a": 1\n}')
    })

    it('devolve null quando o texto não é JSON', () => {
      expect(core.prettyJson('não é json')).to.equal(null)
      expect(core.prettyJson('{"a":')).to.equal(null)
      expect(core.prettyJson('')).to.equal(null)
    })
  })

  describe('storedRecord e readStoredHistory', () => {
    const registro = (id, extra = {}) => ({
      id,
      kind: 'route',
      at: new Date('2026-11-14T01:00:00.000Z'),
      method: 'GET',
      path: '/usuarios',
      protected: false,
      url: 'http://localhost:3000/usuarios',
      status: 200,
      statusText: 'OK',
      ms: 12.5,
      requestHeaders: [],
      authSent: false,
      curl: "curl -X GET 'http://localhost:3000/usuarios'",
      bodySent: undefined,
      sent: { params: {}, body: '', auth: '' },
      headers: [['content-type', 'application/json']],
      stagesHeader: null,
      bodyText: '{"quantidade":0}',
      error: null,
      ...extra
    })
    const guardado = lista => JSON.stringify({ v: 1, history: lista.map(item => core.storedRecord(item, 100)) })

    it('ida e volta: a hora vira texto ISO e volta como Date', () => {
      const original = [registro(2), registro(1, { status: null, statusText: '', error: 'Failed to fetch' })]
      expect(core.storedRecord(original[0], 100).at).to.equal('2026-11-14T01:00:00.000Z')
      const lido = core.readStoredHistory(guardado(original), 50)
      expect(lido).to.have.length(2)
      expect(lido[0].at).to.be.instanceOf(Date)
      expect(lido[0].at.getTime()).to.equal(original[0].at.getTime())
      expect(lido[1].error).to.equal('Failed to fetch')
      expect(lido[0]).to.deep.include({ id: 2, curl: original[0].curl, bodyText: original[0].bodyText })
    })

    it('um corpo maior que o limite vai cortado, com o tamanho real em bodyCut, e volta assim', () => {
      const grande = registro(1, { bodyText: 'x'.repeat(150) })
      const cortado = core.storedRecord(grande, 100)
      expect(cortado.bodyText).to.have.length(100)
      expect(cortado.bodyCut).to.equal(150)
      expect(grande.bodyText).to.have.length(150)
      const lido = core.readStoredHistory(JSON.stringify({ v: 1, history: [cortado] }), 50)
      expect(lido[0].bodyCut).to.equal(150)
      // Guardado de novo, o registro já cortado mantém o tamanho real.
      expect(core.storedRecord(lido[0], 100).bodyCut).to.equal(150)
      expect(core.storedRecord(registro(1), 100)).to.not.have.property('bodyCut')
    })

    it('descarta o valor inteiro quando não é JSON ou tem outra forma', () => {
      expect(core.readStoredHistory('{not json', 50)).to.equal(null)
      expect(core.readStoredHistory('[1,2', 50)).to.equal(null)
      expect(core.readStoredHistory(JSON.stringify({ v: 2, history: [] }), 50)).to.equal(null)
      expect(core.readStoredHistory(JSON.stringify({ v: 1, history: {} }), 50)).to.equal(null)
      expect(core.readStoredHistory(JSON.stringify([registro(1)]), 50)).to.equal(null)
      expect(core.readStoredHistory(null, 50)).to.equal(null)
    })

    it('descarta o valor inteiro quando um registro não tem o que a página lê ou um id se repete', () => {
      const semCurl = core.storedRecord(registro(2), 100)
      delete semCurl.curl
      expect(core.readStoredHistory(JSON.stringify({ v: 1, history: [semCurl, core.storedRecord(registro(1), 100)] }), 50)).to.equal(null)
      expect(core.readStoredHistory(guardado([registro(1), registro(1)]), 50)).to.equal(null)
      expect(core.readStoredHistory(JSON.stringify({ v: 1, history: [{ ...core.storedRecord(registro(1), 100), at: 'ontem' }] }), 50)).to.equal(null)
      expect(core.readStoredHistory(guardado([registro(1, { headers: [['a']] })]), 50)).to.equal(null)
      expect(core.readStoredHistory(guardado([registro(1, { protected: 'não' })]), 50)).to.equal(null)
    })

    it('guarda e devolve as fases da Resource Timing; um envio sem elas (antigo ou sem entrada) também volta', () => {
      const timing = { conn: 0.6, ttfb: 166.8, down: 3.6, connNew: false }
      const lido = core.readStoredHistory(guardado([registro(3, { timing }), registro(2, { timing: null }), registro(1)]), 50)
      expect(lido[0].timing).to.deep.equal(timing)
      expect(lido[1].timing).to.equal(null)
      expect(lido[2]).to.not.have.property('timing')
    })

    it('descarta o valor inteiro quando as fases guardadas não têm a forma certa', () => {
      const ruins = [{}, { conn: 1, ttfb: 2, down: 3 }, { conn: -1, ttfb: 2, down: 3, connNew: false }, { conn: '1', ttfb: 2, down: 3, connNew: false }, { conn: 1, ttfb: null, down: 3, connNew: true }, 'rápido']
      ruins.forEach(timing => expect(core.readStoredHistory(guardado([registro(1, { timing })]), 50), JSON.stringify(timing)).to.equal(null))
    })

    it('volta com no máximo o limite de envios, os mais recentes', () => {
      const lista = Array.from({ length: 60 }, (_, index) => registro(60 - index))
      const lido = core.readStoredHistory(guardado(lista), 50)
      expect(lido).to.have.length(50)
      expect(lido[0].id).to.equal(60)
      expect(lido[49].id).to.equal(11)
      expect(core.readStoredHistory(JSON.stringify({ v: 1, history: [] }), 50)).to.deep.equal([])
    })
  })

  describe('safeHref', () => {
    it('aceita só URL absoluta http ou https e devolve a forma normalizada', () => {
      expect(core.safeHref('https://github.com/ServeRest/ServeRest/releases')).to.equal('https://github.com/ServeRest/ServeRest/releases')
      expect(core.safeHref('http://localhost:3000')).to.equal('http://localhost:3000/')
      expect(core.safeHref('javascript:alert(1)')).to.equal(null)
      expect(core.safeHref('/swagger')).to.equal(null)
      expect(core.safeHref('')).to.equal(null)
    })
  })

  describe('releaseUrl', () => {
    it('leva à release da versão no GitHub, estável ou beta', () => {
      expect(core.releaseUrl('3.2.2')).to.equal('https://github.com/ServeRest/ServeRest/releases/tag/v3.2.2')
      expect(core.releaseUrl('3.3.0-beta.14')).to.equal('https://github.com/ServeRest/ServeRest/releases/tag/v3.3.0-beta.14')
    })

    it('não devolve link sem versão', () => {
      expect(core.releaseUrl('')).to.equal(null)
    })
  })

  describe('feedbackFormUrl', () => {
    const modelo = 'https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.1=VERSAO'

    it('troca VERSAO pela versão da página', () => {
      expect(core.feedbackFormUrl(modelo, '3.3.0-beta.12')).to.equal('https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.1=3.3.0-beta.12')
    })

    it('codifica a versão e deixa vazio quando ela não existe', () => {
      expect(core.feedbackFormUrl(modelo, '1.0.0+build&x')).to.equal('https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.1=1.0.0%2Bbuild%26x')
      expect(core.feedbackFormUrl(modelo, '')).to.equal('https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.1=')
    })

    it('não devolve link sem modelo ou com modelo que não é http ou https', () => {
      expect(core.feedbackFormUrl('', '3.3.0')).to.equal(null)
      expect(core.feedbackFormUrl('javascript:alert(1)', '3.3.0')).to.equal(null)
    })

    it('para de devolver o link depois da data final do formulário', () => {
      const ate = '2027-01-31T23:59:59-03:00'
      expect(core.feedbackFormUrl(modelo, '3.3.0', Date.parse('2027-01-31T23:59:58-03:00'), ate)).to.equal('https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.1=3.3.0')
      expect(core.feedbackFormUrl(modelo, '3.3.0', Date.parse('2027-02-01T00:00:00-03:00'), ate)).to.equal(null)
    })
  })

  describe('parseInlineMarkdown', () => {
    it('separa texto comum e negrito', () => {
      expect(core.parseInlineMarkdown('O **ServeRest** simula uma loja')).to.deep.equal([
        { text: 'O ', bold: false },
        { text: 'ServeRest', bold: true },
        { text: ' simula uma loja', bold: false }
      ])
    })

    it('transforma [texto](url) http ou https em pedaço com href', () => {
      expect(core.parseInlineMarkdown('Veja [o repositório](https://github.com/ServeRest/ServeRest) e [o site](http://serverest.dev).')).to.deep.equal([
        { text: 'Veja ', bold: false },
        { text: 'o repositório', href: 'https://github.com/ServeRest/ServeRest', bold: false },
        { text: ' e ', bold: false },
        { text: 'o site', href: 'http://serverest.dev/', bold: false },
        { text: '.', bold: false }
      ])
    })

    it('mantém o link dentro de negrito', () => {
      expect(core.parseInlineMarkdown('**Apoie em [Open Collective](https://opencollective.com/serverest)!**')).to.deep.equal([
        { text: 'Apoie em ', bold: true },
        { text: 'Open Collective', href: 'https://opencollective.com/serverest', bold: true },
        { text: '!', bold: true }
      ])
    })

    it('link que não é http nem https vira só o texto dele', () => {
      ;['javascript:alert1', 'mailto:paulo@serverest.dev', 'data:text/html,x', '/relativo', 'http://', 'nada'].forEach(url => {
        expect(core.parseInlineMarkdown(`[clique](${url})`), url).to.deep.equal([{ text: 'clique', bold: false }])
      })
      expect(core.parseInlineMarkdown('**[clique](javascript:alert1)**')).to.deep.equal([{ text: 'clique', bold: true }])
    })

    it('texto com < continua texto, sem virar marcação', () => {
      expect(core.parseInlineMarkdown('a <script>alert(1)</script> & **<b>**')).to.deep.equal([
        { text: 'a <script>alert(1)</script> & ', bold: false },
        { text: '<b>', bold: true }
      ])
    })

    it('** sem par some e o resto fica sem negrito', () => {
      expect(core.parseInlineMarkdown('a **b [c](https://c.dev/)')).to.deep.equal([
        { text: 'a ', bold: false },
        { text: 'b ', bold: false },
        { text: 'c', href: 'https://c.dev/', bold: false }
      ])
    })

    it('texto vazio ou ausente não gera pedaço', () => {
      expect(core.parseInlineMarkdown('')).to.deep.equal([])
      expect(core.parseInlineMarkdown(undefined)).to.deep.equal([])
      expect(core.parseInlineMarkdown('****')).to.deep.equal([])
    })
  })

  describe('highlightJson', () => {
    it('escapa &, < e > dentro e fora dos tokens', () => {
      const html = core.highlightJson('{\n  "<b>": "a & <script>",\n  "n": -1.5e3,\n  "ok": true\n}')
      expect(html).to.not.include('<b>')
      expect(html).to.not.include('<script>')
      expect(html).to.include('<span class="j-key">"&lt;b&gt;":</span>')
      expect(html).to.include('<span class="j-str">"a &amp; &lt;script&gt;"</span>')
      expect(html).to.include('<span class="j-num">-1.5e3</span>')
      expect(html).to.include('<span class="j-lit">true</span>')
    })
  })

  describe('Textos', () => {
    const labDir = join(__dirname, '../../src/lab')
    // Todos os arquivos de src/lab, e não uma lista fixa: um arquivo novo que use uma chave entra sozinho.
    const nomes = readdirSync(labDir, { recursive: true }).filter(nome => statSync(join(labDir, nome)).isFile())
    const arquivos = nomes.map(nome => readFileSync(join(labDir, nome), 'utf8'))
    const referenciadas = new Set(arquivos.flatMap(source => [
      ...[...source.matchAll(/\{\{(lab\.[a-z0-9_.]+)\}\}/g)].map(match => match[1]),
      ...[...source.matchAll(/'(lab\.[a-z0-9_.]+)'/g)].map(match => match[1])
    ]))
    const chavesDoLab = Object.keys(ptBr).filter(key => key.startsWith('lab.'))

    it('toda chave lab.* usada na página existe em pt-BR.js', () => {
      expect(referenciadas.size).to.be.greaterThan(0)
      referenciadas.forEach(key => expect(ptBr, key).to.have.property(key))
    })

    it('toda chave lab.* de pt-BR.js é usada na página', () => {
      chavesDoLab.forEach(key => expect(referenciadas.has(key), key).to.equal(true))
    })

    it('nenhuma chave lab.* termina em .summary', () => {
      expect(chavesDoLab.filter(key => key.endsWith('.summary'))).to.deep.equal([])
    })

    it('a lista lida inclui a página, os scripts e o CSS', () => {
      expect(nomes.map(nome => nome.split(sep).join('/'))).to.include.members(['page.html', 'index.js', 'public/app.js', 'public/core.js', 'public/guia.js', 'public/prefs-boot.js', 'public/lab.css'])
    })

    it('os textos do fluxo trocados pela página existem e viram a instrução única de como obter um token', () => {
      const app = readFileSync(join(labDir, 'public/app.js'), 'utf8')
      const trocas = [...app.matchAll(/'(ui\.flow\.how\.[a-z_.]+)': '(lab\.[a-z_.]+)'/g)].map(match => [match[1], match[2]])
      expect(trocas).to.deep.equal([
        ['ui.flow.how.auth.token_missing', 'lab.auth.how_to_get'],
        ['ui.flow.how.auth.token_expired', 'lab.auth.how_to_get'],
        ['ui.flow.how.auth.token_invalid', 'lab.auth.how_to_get'],
        ['ui.flow.how.stage.auth', 'lab.auth.how_to_get'],
        ['ui.flow.how.auth.user_not_found', 'lab.flow.how.user_not_found'],
        ['ui.flow.how.outside', 'lab.flow.how.outside']
      ])
      trocas.forEach(([origem]) => expect(ptBr, origem).to.have.property(origem))
      // A instrução nomeia o botão pelo rótulo inteiro nos três idiomas, não só em pt-BR.
      const idiomas = { 'pt-BR': ptBr, en: require('../../src/swagger/translations/en'), es: require('../../src/swagger/translations/es') }
      Object.keys(idiomas).forEach(idioma => {
        const textos = idiomas[idioma]
        expect(textos['lab.flow.how.user_not_found'], idioma).to.match(/\{instruction\}$/)
        expect(textos['lab.auth.how_to_get'], idioma).to.include(`“${textos['lab.token.use']}”`)
      })
    })
  })

  describe('Preferências', () => {
    const publicDir = join(__dirname, '../../src/lab/public')
    const fonteDoBoot = readFileSync(join(publicDir, 'prefs-boot.js'), 'utf8')
    const fonteDoApp = readFileSync(join(publicDir, 'app.js'), 'utf8')

    function chave (fonte, nome) {
      const match = new RegExp(`const ${nome} = '([^']+)'`).exec(fonte)
      return match ? match[1] : null
    }

    function rodarBoot (guardado, sistemaEscuro) {
      const atributos = {}
      const window = {
        localStorage: { getItem: key => Object.prototype.hasOwnProperty.call(guardado, key) ? guardado[key] : null },
        matchMedia: () => ({ matches: sistemaEscuro })
      }
      const document = { documentElement: { setAttribute: (nome, valor) => { atributos[nome] = valor } } }
      vm.runInNewContext(fonteDoBoot, { window, document })
      return atributos
    }

    it('prefs-boot.js e app.js usam as mesmas chaves do localStorage para tema e tamanho do texto', () => {
      ['THEME_KEY', 'TEXT_KEY'].forEach(nome => {
        expect(chave(fonteDoBoot, nome), nome).to.be.a('string')
        expect(chave(fonteDoBoot, nome), nome).to.equal(chave(fonteDoApp, nome))
      })
    })

    // Cada chave de armazenamento aparece uma vez em app.js, numa constante, e as que prefs-boot.js também
    // lê têm o mesmo texto nos dois arquivos. A lista cresce com as chaves que a página passa a usar.
    const chavesDeArmazenamento = {
      serverestTheme: 'THEME_KEY',
      serverestTextSize: 'TEXT_KEY',
      swaggerLanguage: 'LANGUAGE_KEY',
      serverestLangGlow: 'GLOW_KEY',
      serverestFlowSlowMotion: 'SLOW_MOTION_KEY',
      serverestFlowOpen: 'FLOW_OPEN_KEY',
      serverestLabHistory: 'HISTORY_KEY',
      serverestLabView: 'VIEW_KEY',
      serverestReleaseSeen: 'RELEASE_SEEN_KEY',
      serverestFeedbackInvite: 'FEEDBACK_KEY',
      serverestFeedbackInviteSession: 'FEEDBACK_SESSION_KEY',
      serverestGuideInvite: 'GUIDE_KEY'
    }

    it('cada chave do localStorage e do sessionStorage é uma constante só em app.js, igual à de prefs-boot.js', () => {
      Object.entries(chavesDeArmazenamento).forEach(([valor, nome]) => {
        expect(fonteDoApp.split(`'${valor}'`).length - 1, valor).to.equal(1)
        expect(chave(fonteDoApp, nome), valor).to.equal(valor)
        if (fonteDoBoot.includes(`'${valor}'`)) expect(chave(fonteDoBoot, nome), valor).to.equal(valor)
      })
      expect(chave(fonteDoBoot, 'THEME_KEY')).to.equal('serverestTheme')
      expect(chave(fonteDoBoot, 'TEXT_KEY')).to.equal('serverestTextSize')
    })

    // A aba da esquerda não é guardada: toda carga da página abre em Rotas. A chave da vista
    // (serverestLabView) continua, com o envio mostrado e os não vistos do Histórico.
    it('a sessão não guarda a aba da esquerda: a página sempre abre em Rotas', () => {
      const gravacao = /sessionStorage\.setItem\(VIEW_KEY, JSON\.stringify\((\{[^}]*\})\)\)/.exec(fonteDoApp)
      expect(gravacao).to.not.equal(null)
      expect(gravacao[1]).to.equal('{ v: 1, shownId, unseen: state.unseen }')
      expect(fonteDoApp).to.not.include('view.sideTab')
      expect(/ sideTab: '([a-z]+)',/.exec(fonteDoApp)[1]).to.equal('rotas')
      expect(fonteDoApp.match(/state\.sideTab = /g)).to.deep.equal(['state.sideTab = '])
      expect(/function selectSideTab \(id, focus\) \{\s+state\.sideTab = id/.test(fonteDoApp)).to.equal(true)
    })

    it('prefs-boot.js resolve o tema do sistema para claro ou escuro e aplica o tamanho guardado', () => {
      const theme = chave(fonteDoBoot, 'THEME_KEY')
      const text = chave(fonteDoBoot, 'TEXT_KEY')
      expect(rodarBoot({}, true)).to.deep.equal({ 'data-theme': 'dark', 'data-text': 'normal' })
      expect(rodarBoot({}, false)).to.deep.equal({ 'data-theme': 'light', 'data-text': 'normal' })
      expect(rodarBoot({ [theme]: 'light', [text]: 'maior' }, true)).to.deep.equal({ 'data-theme': 'light', 'data-text': 'maior' })
      expect(rodarBoot({ [theme]: 'dark', [text]: 'grande' }, false)).to.deep.equal({ 'data-theme': 'dark', 'data-text': 'grande' })
      expect(rodarBoot({ [theme]: 'roxo', [text]: 'enorme' }, false)).to.deep.equal({ 'data-theme': 'light', 'data-text': 'normal' })
    })

    it('prefs-boot.js não quebra sem localStorage nem matchMedia', () => {
      const atributos = {}
      const window = {
        get localStorage () { throw new Error('bloqueado') },
        matchMedia: () => { throw new Error('sem suporte') }
      }
      const document = { documentElement: { setAttribute: (nome, valor) => { atributos[nome] = valor } } }
      vm.runInNewContext(fonteDoBoot, { window, document })
      expect(atributos).to.deep.equal({ 'data-theme': 'light', 'data-text': 'normal' })
    })
  })
})
