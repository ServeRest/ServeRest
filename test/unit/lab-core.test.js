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

    it('flowColumns: requisição que parou tem coluna fixa para cada etapa que não rodou e para a resposta', () => {
      const model = core.buildFlowModel(core.parseStages(headers.semToken), 401, textosDoFluxo)
      expect(core.flowColumns(model)).to.equal('minmax(22px, 0.467fr) minmax(22px, 0.306fr) minmax(22px, 0.228fr) 22px 22px 22px 22px')
    })

    it('flowColumns: requisição que passou divide as colunas pela raiz da duração, e etapa pulada fica fixa', () => {
      const model = core.buildFlowModel(core.parseStages(headers.criado), 201, textosDoFluxo)
      expect(core.flowColumns(model)).to.equal('minmax(22px, 0.424fr) 22px minmax(22px, 1.187fr) minmax(22px, 0.566fr) minmax(22px, 1.449fr) minmax(22px, 1.010fr) 22px')
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

  describe('safeHref', () => {
    it('aceita só URL absoluta http ou https e devolve a forma normalizada', () => {
      expect(core.safeHref('https://github.com/ServeRest/ServeRest/releases')).to.equal('https://github.com/ServeRest/ServeRest/releases')
      expect(core.safeHref('http://localhost:3000')).to.equal('http://localhost:3000/')
      expect(core.safeHref('javascript:alert(1)')).to.equal(null)
      expect(core.safeHref('/swagger')).to.equal(null)
      expect(core.safeHref('')).to.equal(null)
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
      expect(nomes.map(nome => nome.split(sep).join('/'))).to.include.members(['page.html', 'index.js', 'public/app.js', 'public/core.js', 'public/prefs-boot.js', 'public/lab.css'])
    })

    it('os textos do fluxo trocados pela página existem e viram a instrução única de como obter um token', () => {
      const app = readFileSync(join(labDir, 'public/app.js'), 'utf8')
      const trocas = [...app.matchAll(/'(ui\.flow\.how\.[a-z_.]+)': '(lab\.[a-z_.]+)'/g)].map(match => [match[1], match[2]])
      expect(trocas).to.deep.equal([
        ['ui.flow.how.auth.token_missing', 'lab.auth.how_to_get'],
        ['ui.flow.how.auth.token_expired', 'lab.auth.how_to_get'],
        ['ui.flow.how.auth.token_invalid', 'lab.auth.how_to_get'],
        ['ui.flow.how.stage.auth', 'lab.auth.how_to_get'],
        ['ui.flow.how.auth.user_not_found', 'lab.flow.how.user_not_found']
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
