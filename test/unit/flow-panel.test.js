const { expect } = require('chai')
const { readFileSync } = require('fs')
const { join } = require('path')
const vm = require('vm')

const ptBr = require('../../src/swagger/translations/pt-BR')
const en = require('../../src/swagger/translations/en')
const es = require('../../src/swagger/translations/es')

const scriptPath = join(__dirname, '../../src/swagger/scripts/08-flow-panel.js')
const scriptSource = readFileSync(scriptPath, 'utf8')

function carregarPainel () {
  const textos = Object.keys(ptBr)
    .filter(key => key.startsWith('ui.flow.') || key === 'ui.response')
    .reduce((acc, key) => ({ ...acc, [key]: ptBr[key] }), {})
  const window = {}
  vm.runInNewContext(scriptSource, { window, __FLOW_PANEL_TEXTS__: textos })
  return window.serverestFlowPanelPlugin
}

const { parseStages, buildFlowModel } = carregarPainel()

const headers = {
  criado: 'body;st=ok;dur=0.18, rate_limit;st=skipped, auth;st=ok;dur=1.41, schema;st=ok;dur=0.32, rules;st=ok;dur=2.10, rules.single_cart;st=ok, rules.no_duplicate_product;st=ok, rules.product_exists;st=ok, rules.enough_stock;st=ok, write;st=ok;dur=1.02',
  semToken: 'body;st=ok;dur=0.21, rate_limit;st=ok;dur=0.09, auth;st=failed;dur=0.05;reason=token_missing, schema;st=not_run, rules;st=not_run, write;st=not_run',
  semEstoque: 'body;st=ok;dur=0.20, rate_limit;st=skipped, auth;st=ok;dur=1.38, schema;st=ok;dur=0.30, rules;st=failed;dur=1.92, rules.single_cart;st=ok, rules.no_duplicate_product;st=ok, rules.product_exists;st=ok, rules.enough_stock;st=failed;item=1, write;st=not_run',
  jsonMalformado: 'body;st=failed;dur=0.34, rate_limit;st=not_run',
  rotaInexistente: 'body;st=ok;dur=0.11, rate_limit;st=ok;dur=0.02',
  loginInvalido: 'body;st=ok;dur=0.20, rate_limit;st=ok;dur=0.05, schema;st=ok;dur=0.31, rules;st=failed;dur=0.90'
}

const regras = ['single_cart', 'no_duplicate_product', 'product_exists', 'enough_stock']
const motivosDeAuth = ['token_missing', 'bad_format', 'token_expired', 'token_invalid', 'user_not_found', 'not_admin']

function modelo (header, status) {
  return buildFlowModel(parseStages(header), status)
}

function headerComRegraFalhando (regra) {
  const entradas = regras.map(nome => nome === regra ? `rules.${nome};st=failed;item=2` : `rules.${nome};st=ok`)
  return `body;st=ok;dur=0.2, auth;st=ok;dur=1.1, rules;st=failed;dur=1.5, ${entradas.join(', ')}, write;st=not_run`
}

function chavesDoModelo (model) {
  const chaves = [model.whyKey, model.howKey]
  model.stages.forEach(stage => {
    chaves.push(stage.labelKey, stage.descriptionKey, stage.statusKey)
    stage.rules.forEach(rule => chaves.push(rule.labelKey, rule.statusKey))
  })
  return chaves.filter(Boolean)
}

describe('Painel de fluxo da requisição', () => {
  it('201 em POST /carrinhos: etapas em ordem com as regras aninhadas e resumo completed', () => {
    const model = modelo(headers.criado, 201)
    expect(model.stages.map(stage => stage.name)).to.deep.equal(['body', 'rate_limit', 'auth', 'schema', 'rules', 'write'])
    expect(model.stages[4].rules.map(rule => rule.code)).to.deep.equal(regras)
    expect(model.stages[4].rules.every(rule => rule.st === 'ok')).to.equal(true)
    expect(model.summary).to.equal('completed')
    expect(model.failedStage).to.equal(null)
    expect(model.whyKey).to.equal(null)
    expect(model.howKey).to.equal(null)
    expect(model.stages[1].dur).to.equal(undefined)
    expect(model.stages[1].width).to.equal(0)
    expect(model.stages[4].width).to.be.greaterThan(model.stages[0].width)
    const soma = model.stages.reduce((total, stage) => total + stage.width, 0)
    expect(soma).to.be.closeTo(1, 1e-9)
  })

  it('401 sem token: para em auth com os textos de token_missing e as etapas seguintes não executam', () => {
    const model = modelo(headers.semToken, 401)
    expect(model.summary).to.equal('stopped')
    expect(model.failedStage).to.equal('auth')
    expect(model.failedRule).to.equal(null)
    expect(model.whyKey).to.equal('ui.flow.why.auth.token_missing')
    expect(model.howKey).to.equal('ui.flow.how.auth.token_missing')
    expect(model.stages.slice(3).map(stage => stage.st)).to.deep.equal(['not_run', 'not_run', 'not_run'])
    expect(model.stages[2].params).to.deep.equal({ reason: 'token_missing' })
  })

  it('cada reason de auth seleciona seu par de textos e reason desconhecido usa o genérico', () => {
    const pares = motivosDeAuth.map(motivo => {
      const model = modelo(`body;st=ok;dur=0.1, auth;st=failed;dur=0.05;reason=${motivo}, rules;st=not_run`, 401)
      expect(model.whyKey).to.equal(`ui.flow.why.auth.${motivo}`)
      expect(model.howKey).to.equal(`ui.flow.how.auth.${motivo}`)
      return model.whyKey
    })
    expect(new Set(pares).size).to.equal(motivosDeAuth.length)
    const desconhecido = modelo('body;st=ok;dur=0.1, auth;st=failed;dur=0.05;reason=token_revoked', 401)
    expect(desconhecido.whyKey).to.equal('ui.flow.why.stage.auth')
    expect(desconhecido.howKey).to.equal('ui.flow.how.stage.auth')
    const semReason = modelo('body;st=ok;dur=0.1, auth;st=failed;dur=0.05', 401)
    expect(semReason.whyKey).to.equal('ui.flow.why.stage.auth')
  })

  it('cada uma das quatro regras falhando: textos vêm da regra e item fica exposto', () => {
    regras.forEach(regra => {
      const model = modelo(headerComRegraFalhando(regra), 400)
      expect(model.failedStage).to.equal('rules')
      expect(model.failedRule).to.equal(regra)
      expect(model.whyKey).to.equal(`ui.flow.why.rule.${regra}`)
      expect(model.howKey).to.equal(`ui.flow.how.rule.${regra}`)
      const falhou = model.stages.find(stage => stage.name === 'rules').rules.find(rule => rule.code === regra)
      expect(falhou.item).to.equal('2')
    })
    const estoque = modelo(headers.semEstoque, 400)
    expect(estoque.failedRule).to.equal('enough_stock')
    expect(estoque.stages[4].rules[3].item).to.equal('1')
    expect(estoque.stages[5].st).to.equal('not_run')
  })

  it('rules falhando em rota sem regras detalhadas usa o par genérico', () => {
    const model = modelo(headers.loginInvalido, 401)
    expect(model.failedStage).to.equal('rules')
    expect(model.failedRule).to.equal(null)
    expect(model.whyKey).to.equal('ui.flow.why.stage.rules')
    expect(model.howKey).to.equal('ui.flow.how.stage.rules')
  })

  it('body falhando com JSON malformado: apenas duas etapas e resumo stopped', () => {
    const model = modelo(headers.jsonMalformado, 400)
    expect(model.stages.map(stage => stage.name)).to.deep.equal(['body', 'rate_limit'])
    expect(model.summary).to.equal('stopped')
    expect(model.failedStage).to.equal('body')
    expect(model.whyKey).to.equal('ui.flow.why.stage.body')
    expect(model.howKey).to.equal('ui.flow.how.stage.body')
  })

  it('408 com etapa falhando: textos de tempo limite, com ou sem reason', () => {
    const semReason = modelo('body;st=ok;dur=0.20, rate_limit;st=ok;dur=0.05, auth;st=failed;dur=5001.20, schema;st=not_run, rules;st=not_run', 408)
    const comReason = modelo('body;st=ok;dur=0.20, rate_limit;st=ok;dur=0.05, auth;st=failed;dur=5001.20;reason=token_missing, schema;st=not_run, rules;st=not_run', 408)
    ;[semReason, comReason].forEach(model => {
      expect(model.summary).to.equal('stopped')
      expect(model.failedStage).to.equal('auth')
      expect(model.whyKey).to.equal('ui.flow.why.status.timeout')
      expect(model.howKey).to.equal('ui.flow.how.status.timeout')
    })
  })

  it('500 com etapa falhando: textos de erro inesperado, mesmo com regra falhando', () => {
    const leitura = modelo('body;st=ok;dur=0.20, rate_limit;st=ok;dur=0.05, schema;st=ok;dur=0.10, read;st=failed;dur=0.40', 500)
    expect(leitura.failedStage).to.equal('read')
    expect(leitura.whyKey).to.equal('ui.flow.why.status.unexpected_error')
    expect(leitura.howKey).to.equal('ui.flow.how.status.unexpected_error')
    const regra = modelo(headerComRegraFalhando('enough_stock'), 500)
    expect(regra.failedStage).to.equal('rules')
    expect(regra.failedRule).to.equal('enough_stock')
    expect(regra.whyKey).to.equal('ui.flow.why.status.unexpected_error')
    expect(regra.howKey).to.equal('ui.flow.how.status.unexpected_error')
  })

  it('405 sem etapa falhando: resumo outside', () => {
    const model = modelo(headers.rotaInexistente, 405)
    expect(model.summary).to.equal('outside')
    expect(model.statusCode).to.equal(405)
    expect(model.failedStage).to.equal(null)
    expect(model.whyKey).to.equal('ui.flow.why.outside')
    expect(model.howKey).to.equal('ui.flow.how.outside')
  })

  it('etapa, status e parâmetro desconhecidos são mantidos com o código cru e sem exceção', () => {
    const header = 'body;st=ok;dur=0.1;trace=abc, cache;st=ok;dur=0.4, auth;st=waiting, rules;st=failed;dur=1, rules.limit_per_day;st=failed;window=24h, extra.orphan;st=ok'
    let model
    expect(() => { model = modelo(header, 400) }).to.not.throw()
    const [body, cache, auth, rules, orfa] = model.stages
    expect(body.params).to.deep.equal({ trace: 'abc' })
    expect(cache.name).to.equal('cache')
    expect(cache.labelKey).to.equal(null)
    expect(cache.descriptionKey).to.equal(null)
    expect(cache.statusKey).to.equal('ui.flow.status.ok')
    expect(auth.st).to.equal('waiting')
    expect(auth.statusKey).to.equal(null)
    expect(rules.rules[0].code).to.equal('limit_per_day')
    expect(rules.rules[0].labelKey).to.equal(null)
    expect(rules.rules[0].params).to.deep.equal({ window: '24h' })
    expect(model.failedRule).to.equal('limit_per_day')
    expect(model.whyKey).to.equal('ui.flow.why.stage.rules')
    expect(orfa.name).to.equal('extra.orphan')
    expect(orfa.labelKey).to.equal(null)
    const falhaDesconhecida = modelo('cache;st=failed;dur=0.2', 400)
    expect(falhaDesconhecida.summary).to.equal('stopped')
    expect(falhaDesconhecida.whyKey).to.equal(null)
    expect(falhaDesconhecida.howKey).to.equal(null)
  })

  it('header vazio, ausente ou só com espaços: parseStages retorna [] e buildFlowModel retorna null', () => {
    ['', undefined, null, '   ', ' , ,, '].forEach(valor => {
      expect(parseStages(valor)).to.deep.equal([])
      expect(buildFlowModel(parseStages(valor), 200)).to.equal(null)
    })
    expect(buildFlowModel(undefined, 200)).to.equal(null)
  })

  it('toda chave de texto usada pelo painel existe em pt-BR, en e es', () => {
    const modelos = [
      ...Object.values(headers).map(header => modelo(header, 400)),
      ...regras.map(regra => modelo(headerComRegraFalhando(regra), 400)),
      ...motivosDeAuth.map(motivo => modelo(`auth;st=failed;reason=${motivo}`, 401)),
      ...['body', 'rate_limit', 'auth', 'schema', 'read', 'rules', 'write'].map(etapa => modelo(`${etapa};st=failed`, 400)),
      ...['ok', 'skipped', 'not_run'].map(st => modelo(`read;st=${st}`, 200)),
      modelo('auth;st=failed', 408),
      modelo('read;st=failed', 500)
    ]
    const chavesNoScript = scriptSource.match(/'ui\.(flow\.[a-z_.]*[a-z_]|response)'/g).map(chave => chave.slice(1, -1))
    const chaves = new Set([...modelos.flatMap(chavesDoModelo), ...chavesNoScript])
    chaves.forEach(chave => {
      expect(ptBr, chave).to.have.property(chave)
      expect(en, chave).to.have.property(chave)
      expect(es, chave).to.have.property(chave)
    })
    expect(chaves.size).to.be.greaterThan(60)
  })

  it('dois modelos seguidos com headers diferentes são independentes', () => {
    const primeiro = modelo(headers.semToken, 401)
    const antes = JSON.stringify(primeiro)
    const segundo = modelo(headers.semEstoque, 400)
    expect(JSON.stringify(primeiro)).to.equal(antes)
    expect(segundo.failedStage).to.equal('rules')
    expect(segundo.stages).to.not.equal(primeiro.stages)
    expect(segundo.stages[0]).to.not.equal(primeiro.stages[0])
  })

  it('painel é registrado mesmo quando concatenado depois de outro script autoexecutável', () => {
    const window = {}
    vm.runInNewContext('(function () {})()\n' + scriptSource, { window, __FLOW_PANEL_TEXTS__: {} })
    expect(window.serverestFlowPanelPlugin).to.be.a('function')
  })

  it('script da página compila e não contém mais __FLOW_PANEL_TEXTS__', () => {
    const { buildCustomJsStr } = require('../../src/swagger')
    const script = buildCustomJsStr(null, 'x', false)
    expect(() => new vm.Script(script)).to.not.throw()
    expect(script).to.not.include('__FLOW_PANEL_TEXTS__')
    expect(script).to.include('serverestFlowPanelPlugin')
  })
})
