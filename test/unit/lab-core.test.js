const { expect } = require('chai')
const { execFileSync } = require('child_process')
const { readFileSync } = require('fs')
const { join } = require('path')
const vm = require('vm')
const jwt = require('jsonwebtoken')

const core = require('../../src/lab/public/core')
const ptBr = require('../../src/swagger/translations/pt-BR')
const swaggerDocument = require('../../docs/swagger.json')

const textosDoFluxo = Object.keys(ptBr)
  .filter(key => key.startsWith('ui.flow.') || key === 'ui.response')
  .reduce((acc, key) => ({ ...acc, [key]: ptBr[key] }), {})

function carregarPainelDoSwagger () {
  const source = readFileSync(join(__dirname, '../../src/swagger/scripts/08-flow-panel.js'), 'utf8')
  const window = {}
  vm.runInNewContext(source, { window, __FLOW_PANEL_TEXTS__: textosDoFluxo })
  return window.serverestFlowPanelPlugin
}

// Cópia dos headers de test/unit/flow-panel.test.js, para comparar os dois painéis com as mesmas entradas.
const headers = {
  criado: 'body;st=ok;dur=0.18, rate_limit;st=skipped, auth;st=ok;dur=1.41, schema;st=ok;dur=0.32, rules;st=ok;dur=2.10, rules.single_cart;st=ok, rules.no_duplicate_product;st=ok, rules.product_exists;st=ok, rules.enough_stock;st=ok, write;st=ok;dur=1.02',
  semToken: 'body;st=ok;dur=0.21, rate_limit;st=ok;dur=0.09, auth;st=failed;dur=0.05;reason=token_missing, schema;st=not_run, rules;st=not_run, write;st=not_run',
  semEstoque: 'body;st=ok;dur=0.20, rate_limit;st=skipped, auth;st=ok;dur=1.38, schema;st=ok;dur=0.30, rules;st=failed;dur=1.92, rules.single_cart;st=ok, rules.no_duplicate_product;st=ok, rules.product_exists;st=ok, rules.enough_stock;st=failed;item=1, write;st=not_run',
  jsonMalformado: 'body;st=failed;dur=0.34, rate_limit;st=not_run',
  rotaInexistente: 'body;st=ok;dur=0.11, rate_limit;st=ok;dur=0.02',
  loginInvalido: 'body;st=ok;dur=0.20, rate_limit;st=ok;dur=0.05, schema;st=ok;dur=0.31, rules;st=failed;dur=0.90'
}
const regras = ['single_cart', 'no_duplicate_product', 'product_exists', 'enough_stock']
const motivosDeAuth = ['token_missing', 'bad_format', 'token_expired', 'token_invalid', 'user_not_found', 'not_admin', 'token_revoked']

function headerComRegraFalhando (regra) {
  const entradas = regras.map(nome => nome === regra ? `rules.${nome};st=failed;item=2` : `rules.${nome};st=ok`)
  return `body;st=ok;dur=0.2, auth;st=ok;dur=1.1, rules;st=failed;dur=1.5, ${entradas.join(', ')}, write;st=not_run`
}

const casosDeParidade = [
  ...Object.values(headers).flatMap(header => [[header, 201], [header, 400], [header, 401], [header, 405]]),
  ...motivosDeAuth.map(motivo => [`body;st=ok;dur=0.1, auth;st=failed;dur=0.05;reason=${motivo}, rules;st=not_run`, 401]),
  ['body;st=ok;dur=0.1, auth;st=failed;dur=0.05', 401],
  ...regras.flatMap(regra => [[headerComRegraFalhando(regra), 400], [headerComRegraFalhando(regra), 500]]),
  ['body;st=ok;dur=0.20, rate_limit;st=ok;dur=0.05, auth;st=failed;dur=5001.20, schema;st=not_run, rules;st=not_run', 408],
  ['body;st=ok;dur=0.20, rate_limit;st=ok;dur=0.05, auth;st=failed;dur=5001.20;reason=token_missing, schema;st=not_run, rules;st=not_run', 408],
  ['body;st=ok;dur=0.20, rate_limit;st=ok;dur=0.05, schema;st=ok;dur=0.10, read;st=failed;dur=0.40', 500],
  ['body;st=ok;dur=0.1;trace=abc, cache;st=ok;dur=0.4, auth;st=waiting, rules;st=failed;dur=1, rules.limit_per_day;st=failed;window=24h, extra.orphan;st=ok', 400],
  ['cache;st=failed;dur=0.2', 400],
  ['', 200],
  ['   ', 200],
  [' , ,, ', 200],
  [undefined, 200],
  [null, 200],
  ['body;st=ok;dur=', 'abc']
]

function rascunho (params = {}, body) {
  return { params, body }
}

describe('Página do lab: funções puras', () => {
  describe('Fluxo', () => {
    it('gera o mesmo modelo que o painel do Swagger para todos os headers dos testes do painel', () => {
      const painel = carregarPainelDoSwagger()
      casosDeParidade.forEach(([header, status]) => {
        const esperado = painel.buildFlowModel(painel.parseStages(header), status)
        const obtido = core.buildFlowModel(core.parseStages(header), status, textosDoFluxo)
        expect(JSON.parse(JSON.stringify(core.parseStages(header))), header).to.deep.equal(JSON.parse(JSON.stringify(painel.parseStages(header))))
        expect(obtido, `${header} ${status}`).to.deep.equal(esperado)
      })
    })

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
  })

  describe('Requisição', () => {
    const routes = core.buildRoutes(swaggerDocument)
    const rota = key => routes.find(route => route.key === key)
    const opcoes = { baseUrl: 'http://localhost:3000', token: 'Bearer abc', authHeader: 'Authorization' }

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
      ;[null, undefined, ''].forEach(token => {
        const semToken = core.buildRequest(rota('post /carrinhos'), rascunho({}, '{}'), { ...opcoes, token })
        expect(semToken.headers.map(header => header[0])).to.deep.equal(['Content-Type'])
      })
      const publica = core.buildRequest(rota('get /produtos'), rascunho({}), opcoes)
      expect(publica.headers).to.deep.equal([])
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
    const arquivos = ['page.html', 'public/core.js', 'public/app.js'].map(file => readFileSync(join(labDir, file), 'utf8'))
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
  })
})
