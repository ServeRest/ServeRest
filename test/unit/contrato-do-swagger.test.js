const { expect } = require('chai')
const { readdirSync } = require('fs')
const { join } = require('path')
const { isDeepStrictEqual } = require('util')
const SwaggerParser = require('@apidevtools/swagger-parser')
const Ajv = require('ajv')
const addFormats = require('ajv-formats')
const parse = require('joi-to-json')

const carrinhos = require('../../src/models/carrinhos-model')
const login = require('../../src/models/login-model')
const produtos = require('../../src/models/produtos-model')
const usuarios = require('../../src/models/usuarios-model')

const DOCUMENTO = join(__dirname, '../../docs/swagger.json')
const PASTA_DOS_MODELOS = join(__dirname, '../../src/models')
const documento = require(DOCUMENTO)
const METODOS = ['get', 'post', 'put', 'patch', 'delete']

// Cada operação do documento e o schema do Joi que a rota dela usa em src/routes/*.js.
const ROTAS = {
  'POST /login': login.schemaPost,
  'GET /usuarios': usuarios.schemaGet,
  'POST /usuarios': usuarios.schemaPost,
  'GET /usuarios/{_id}': usuarios.schemaGetOne,
  'DELETE /usuarios/{_id}': usuarios.schemaDelete,
  'PUT /usuarios/{_id}': usuarios.schemaPut,
  'GET /produtos': produtos.schemaGet,
  'POST /produtos': produtos.schemaPost,
  'GET /produtos/{_id}': produtos.schemaGetOne,
  'DELETE /produtos/{_id}': produtos.schemaDelete,
  'PUT /produtos/{_id}': produtos.schemaPut,
  'GET /carrinhos': carrinhos.schemaGet,
  'POST /carrinhos': carrinhos.schemaPost,
  'GET /carrinhos/{_id}': carrinhos.schemaGetOne
}

// Diferenças de propósito entre o Joi e o documento, cada grupo com o seu motivo. Toda diferença listada
// precisa continuar acontecendo: quando o código ou o documento muda, a linha sai daqui também.
const EXCECOES = [
  {
    motivo: 'Joi.any() aceita qualquer valor, e na query todo valor chega como texto: o documento diz string',
    diferencas: [
      'GET /usuarios query properties._id.type',
      'GET /usuarios query properties.nome.type',
      'GET /usuarios query properties.password.type',
      'GET /produtos query properties._id.type',
      'GET /produtos query properties.nome.type',
      'GET /produtos query properties.descricao.type',
      'GET /carrinhos query properties.idUsuario.type',
      'GET /carrinhos query properties._id.type'
    ]
  },
  {
    motivo: 'Joi.any().valid(\'true\', \'false\') só deixa passar essas duas strings, o que type string com enum já diz',
    diferencas: [
      'GET /usuarios query properties.administrador.type',
      'POST /usuarios body properties.administrador.type',
      'PUT /usuarios/{_id} body properties.administrador.type'
    ]
  },
  {
    motivo: 'OpenAPI 3.0 não tem como dizer que a query não aceita outro parâmetro; o Joi recusa',
    diferencas: [
      'GET /usuarios query additionalProperties',
      'GET /produtos query additionalProperties',
      'GET /carrinhos query additionalProperties'
    ]
  },
  {
    motivo: 'o documento ainda não traz imagem: decisão do projeto, para depois',
    diferencas: [
      'GET /produtos query properties.imagem',
      'POST /produtos body properties.imagem',
      'PUT /produtos/{_id} body properties.imagem'
    ]
  },
  {
    motivo: 'nessas rotas o Joi aceita qualquer id (alinhar com o pattern das outras quebra cliente, fica para depois); um path nunca chega vazio',
    diferencas: [
      'DELETE /usuarios/{_id} path properties.id.minLength',
      'PUT /usuarios/{_id} path properties.id.minLength'
    ]
  }
]

// As palavras de validação comparadas campo a campo. required, properties e items têm comparação própria.
const PALAVRAS = [
  'type', 'format', 'enum', 'pattern', 'minLength', 'maxLength', 'minimum', 'maximum', 'exclusiveMinimum',
  'exclusiveMaximum', 'multipleOf', 'minItems', 'maxItems', 'uniqueItems', 'nullable', 'additionalProperties',
  'anyOf', 'oneOf', 'allOf', 'not'
]

// As regras do Joi que este teste sabe comparar. Uma regra nova (um .max(50), um .alphanum()) falha aqui até
// alguém decidir como ela entra no documento. trim não tem palavra no OpenAPI: o documento fica com minLength 1.
// custom em any é o filtro de texto das listas (src/utils/filtroDeTexto.js): ele só recusa objeto, e o documento
// já diz string.
const REGRAS_CONHECIDAS = {
  any: ['custom'],
  string: ['email', 'min', 'max', 'pattern', 'trim'],
  number: ['sign', 'integer', 'min', 'max', 'greater', 'less'],
  array: ['min', 'max', 'length']
}

// O que o Joi valida e o joi-to-json não escreve, lido do describe() do mesmo schema.
function completarComOJoi (schema, joi, caminho) {
  const regras = (joi.rules || []).map(regra => regra.name)
  regras.forEach(regra => {
    if (!(REGRAS_CONHECIDAS[joi.type] || []).includes(regra)) throw new Error(`${caminho}: regra ${joi.type}.${regra} do Joi sem comparação definida neste teste`)
  })
  if (joi.type === 'any') {
    // O joi-to-json escreve Joi.any() como um anyOf de todos os tipos; sem tipo diz o mesmo.
    delete schema.anyOf
    delete schema.nullable
  }
  if (joi.type === 'number') {
    // O joi-to-json só vê integer quando é a primeira regra; em .positive().integer() ele escreve number.
    if (regras.includes('integer')) schema.type = 'integer'
    // positive() vira "maior que 0"; num inteiro é o mesmo que "maior ou igual a 1", como o documento escreve.
    if (schema.type === 'integer' && schema.exclusiveMinimum === true) {
      schema.minimum = Math.floor(schema.minimum) + 1
      delete schema.exclusiveMinimum
    }
    // O Joi recusa número acima de 9007199254740991 (number.unsafe), a não ser com .unsafe().
    if (!(joi.flags && joi.flags.unsafe) && schema.maximum === undefined) schema.maximum = Number.MAX_SAFE_INTEGER
  }
  if (joi.type === 'string' && schema.minLength === undefined && !(joi.allow || []).includes('')) {
    // O Joi recusa '' (string.empty). Um format ou um pattern que já recusa '' dispensa o minLength.
    const padraoAceitaVazio = schema.pattern === undefined || new RegExp(schema.pattern).test('')
    if (schema.format === undefined && padraoAceitaVazio) schema.minLength = 1
  }
  if (joi.type === 'object' && joi.keys) {
    Object.keys(joi.keys).forEach(nome => completarComOJoi(schema.properties[nome], joi.keys[nome], `${caminho}.${nome}`))
  }
  if (joi.type === 'array' && joi.items) {
    // Um item com .required() faz o array vazio falhar (array.includesRequiredUnknowns).
    const itensObrigatorios = joi.items.filter(item => item.flags && item.flags.presence === 'required').length
    if (itensObrigatorios > (schema.minItems || 0)) schema.minItems = itensObrigatorios
    if (joi.items.length === 1) completarComOJoi(schema.items, joi.items[0], `${caminho}[]`)
  }
  return schema
}

function schemaDoJoi (joi, caminho) {
  return completarComOJoi(parse(joi, 'open-api'), joi.describe(), caminho)
}

// O documento chama o id do path de _id; a rota (/:id) e o Joi chamam de id.
const NOMES_NO_JOI = { _id: 'id' }

// Os parâmetros de um lugar (path ou query) como um objeto, para comparar com o Joi do mesmo lugar. Um path só
// tem os parâmetros do seu template, então ele não aceita outro.
function objetoDosParametros (parametros, lugar) {
  const lista = parametros.filter(parametro => parametro.in === lugar)
  if (!lista.length) return undefined
  const objeto = { type: 'object', required: [], properties: {} }
  lista.forEach(parametro => {
    const nome = lugar === 'path' ? NOMES_NO_JOI[parametro.name] || parametro.name : parametro.name
    objeto.properties[nome] = parametro.schema
    if (parametro.required) objeto.required.push(nome)
  })
  if (lugar === 'path') objeto.additionalProperties = false
  return objeto
}

function operacoesDoDocumento (api) {
  const operacoes = {}
  Object.keys(api.paths).forEach(caminho => METODOS.forEach(metodo => {
    const operacao = api.paths[caminho][metodo]
    if (operacao) operacoes[`${metodo.toUpperCase()} ${caminho}`] = operacao
  }))
  return operacoes
}

function texto (valor) {
  return valor === undefined ? 'ausente' : JSON.stringify(valor)
}

function compararSchemas (joi, doc, prefixo, caminho, saida) {
  const anotar = (onde, detalhe) => saida.push({ chave: `${prefixo} ${onde}`.trim(), detalhe })
  PALAVRAS.forEach(palavra => {
    if (!isDeepStrictEqual(joi[palavra], doc[palavra])) anotar(caminho + palavra, `Joi ${texto(joi[palavra])}, documento ${texto(doc[palavra])}`)
  })
  const obrigatorios = [joi, doc].map(schema => (schema.required || []).slice().sort())
  if (!isDeepStrictEqual(obrigatorios[0], obrigatorios[1])) anotar(caminho + 'required', `Joi ${texto(obrigatorios[0])}, documento ${texto(obrigatorios[1])}`)
  const nomes = new Set(Object.keys(joi.properties || {}).concat(Object.keys(doc.properties || {})))
  nomes.forEach(nome => {
    const doJoi = (joi.properties || {})[nome]
    const doDocumento = (doc.properties || {})[nome]
    if (!doDocumento) anotar(`${caminho}properties.${nome}`, 'campo só no Joi')
    else if (!doJoi) anotar(`${caminho}properties.${nome}`, 'campo só no documento')
    else compararSchemas(doJoi, doDocumento, prefixo, `${caminho}properties.${nome}.`, saida)
  })
  if (joi.items || doc.items) compararSchemas(joi.items || {}, doc.items || {}, prefixo, caminho + 'items.', saida)
}

// Os lugares de uma requisição: a chave do modelo do Joi e onde o documento diz o mesmo.
const LUGARES = { body: 'body', params: 'path', query: 'query' }

function diferencasDaRota (nome, modelo, operacao) {
  const saida = []
  Object.keys(modelo).forEach(parte => {
    if (!LUGARES[parte]) throw new Error(`${nome}: parte ${parte} do modelo sem lugar no documento`)
  })
  const corpo = operacao.requestBody && operacao.requestBody.content['application/json']
  const doDocumento = {
    body: corpo ? corpo.schema : undefined,
    path: objetoDosParametros(operacao.parameters || [], 'path'),
    query: objetoDosParametros(operacao.parameters || [], 'query')
  }
  Object.keys(LUGARES).forEach(parte => {
    const lugar = LUGARES[parte]
    const prefixo = `${nome} ${lugar}`
    if (!modelo[parte] && !doDocumento[lugar]) return
    if (!doDocumento[lugar]) return saida.push({ chave: prefixo, detalhe: 'só o Joi valida este lugar' })
    if (!modelo[parte]) return saida.push({ chave: prefixo, detalhe: 'só o documento descreve este lugar' })
    compararSchemas(schemaDoJoi(modelo[parte], prefixo), doDocumento[lugar], prefixo, '', saida)
  })
  return saida
}

const EXCECAO_DE = EXCECOES.reduce((mapa, excecao) => {
  excecao.diferencas.forEach(chave => { mapa[chave] = excecao.motivo })
  return mapa
}, {})

// Os exemplos que a requisição mostra: o do corpo, os de cada schema dentro dele e, nos parâmetros, example e
// default (o valor que o Swagger e a página já deixam preenchido).
function exemplosDoSchema (schema, onde, casos) {
  if (!schema) return
  if (schema.example !== undefined) casos.push({ onde: `${onde} (example do schema)`, schema, valor: schema.example })
  Object.keys(schema.properties || {}).forEach(nome => exemplosDoSchema(schema.properties[nome], `${onde}.${nome}`, casos))
  exemplosDoSchema(schema.items, `${onde}[]`, casos)
}

function exemplosDaOperacao (operacao) {
  const casos = []
  const corpo = operacao.requestBody && operacao.requestBody.content['application/json']
  if (corpo) {
    if (corpo.example !== undefined) casos.push({ onde: 'corpo (example)', schema: corpo.schema, valor: corpo.example })
    exemplosDoSchema(corpo.schema, 'corpo', casos)
  }
  ;(operacao.parameters || []).forEach(parametro => {
    const onde = `${parametro.in} ${parametro.name}`
    if (parametro.example !== undefined) casos.push({ onde: `${onde} (example)`, schema: parametro.schema, valor: parametro.example })
    if (parametro.schema.default !== undefined) casos.push({ onde: `${onde} (default)`, schema: parametro.schema, valor: parametro.schema.default })
    exemplosDoSchema(parametro.schema, onde, casos)
  })
  return casos
}

describe('Contrato do docs/swagger.json com o código', () => {
  let api

  before(async () => {
    api = await SwaggerParser.validate(DOCUMENTO)
  })

  it('é um OpenAPI 3.0 válido e todo $ref resolve', () => {
    expect(api.openapi).to.match(/^3\.0\.\d+$/)
  })

  describe('Exemplos de requisição', () => {
    const ajv = new Ajv({ strict: true, allErrors: true })
    addFormats(ajv)
    // example é do OpenAPI, não do JSON Schema.
    ajv.addVocabulary(['example'])

    Object.keys(ROTAS).forEach(nome => {
      it(`${nome}: cada exemplo da requisição passa no schema do próprio documento`, () => {
        const erros = exemplosDaOperacao(operacoesDoDocumento(api)[nome])
          .map(caso => {
            const validar = ajv.compile(caso.schema)
            return validar(caso.valor) ? null : `${caso.onde}: ${ajv.errorsText(validar.errors)}`
          })
          .filter(Boolean)
        expect(erros).to.deep.equal([])
      })
    })
  })

  describe('Schemas do Joi em src/models', () => {
    // Calculadas uma vez por rota: uma regra do Joi sem comparação definida falha só a rota dela.
    const calculadas = {}
    function diferencas (nome) {
      if (!calculadas[nome]) calculadas[nome] = diferencasDaRota(nome, ROTAS[nome], operacoesDoDocumento(api)[nome])
      return calculadas[nome]
    }

    it('toda operação do documento com corpo ou parâmetro tem o schema do Joi da sua rota, e vice-versa', () => {
      const operacoes = operacoesDoDocumento(documento)
      const comEntrada = Object.keys(operacoes).filter(nome => operacoes[nome].requestBody || (operacoes[nome].parameters || []).length)
      expect(Object.keys(ROTAS).sort()).to.deep.equal(comEntrada.sort())
    })

    it('todo schema exportado por src/models tem uma operação na lista', () => {
      const mapeados = Object.values(ROTAS)
      const soltos = readdirSync(PASTA_DOS_MODELOS).flatMap(arquivo => {
        const modelo = require(join(PASTA_DOS_MODELOS, arquivo))
        return Object.keys(modelo).filter(nome => !mapeados.includes(modelo[nome])).map(nome => `${arquivo} ${nome}`)
      })
      expect(soltos).to.deep.equal([])
    })

    Object.keys(ROTAS).forEach(nome => {
      it(`${nome}: o documento descreve o que o Joi valida`, () => {
        const inesperadas = diferencas(nome)
          .filter(diferenca => !EXCECAO_DE[diferenca.chave])
          .map(diferenca => `${diferenca.chave}: ${diferenca.detalhe}`)
        expect(inesperadas).to.deep.equal([])
      })
    })

    it('toda exceção listada ainda acontece', () => {
      const encontradas = new Set(Object.keys(ROTAS).flatMap(nome => diferencas(nome)).map(diferenca => diferenca.chave))
      expect(Object.keys(EXCECAO_DE).filter(chave => !encontradas.has(chave))).to.deep.equal([])
    })
  })
})
