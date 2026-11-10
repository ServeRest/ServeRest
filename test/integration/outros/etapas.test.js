const chai = require('chai')
const { faker } = require('@faker-js/faker')
const sandbox = require('sinon').createSandbox()

const authService = require('../../../src/services/auth-service')
const carrinhosService = require('../../../src/services/carrinhos-service')
const { conf } = require('../../../src/utils/conf')
const utils = require('../utils')

const ENTRADA = /^[A-Za-z0-9_.]+(;[A-Za-z0-9_.]+=[A-Za-z0-9_.]+)*$/
const DURACAO = /^\d+\.\d{2}$/

// Valida a gramática e os invariantes do header e devolve as entradas sem 'dur',
// que varia a cada requisição.
function lerEtapas ({ headers }) {
  const entradas = headers['x-serverest-stages'].split(', ').map(texto => {
    chai.assert.match(texto, ENTRADA)
    const [nome, ...parametros] = texto.split(';')
    return { nome, parametros: parametros.map(parametro => parametro.split('=')) }
  })

  entradas.forEach(({ nome, parametros }) => {
    const { st, dur } = Object.fromEntries(parametros)
    chai.assert.include(['ok', 'failed', 'skipped', 'not_run'], st)
    const ehRegra = nome.includes('.')
    const executou = !ehRegra && (st === 'ok' || st === 'failed')
    chai.assert.equal(dur !== undefined, executou, `dur em ${nome}`)
    if (executou) {
      chai.assert.match(dur, DURACAO)
      chai.assert.isBelow(Number(dur), 5000)
    }
  })

  const falhas = entradas.filter(({ parametros }) => parametros.some(([chave, valor]) => chave === 'st' && valor === 'failed'))
  chai.assert.isAtMost(falhas.filter(({ nome }) => !nome.includes('.')).length, 1)
  chai.assert.isAtMost(falhas.filter(({ nome }) => nome.includes('.')).length, 1)

  chai.assert.notProperty(headers, 'server-timing')

  return entradas.map(({ nome, parametros }) => [nome, ...parametros
    .filter(([chave]) => chave !== 'dur')
    .map(parametro => parametro.join('='))].join(';'))
}

const REGRAS_OK = [
  'rules.single_cart;st=ok',
  'rules.no_duplicate_product;st=ok',
  'rules.product_exists;st=ok',
  'rules.enough_stock;st=ok'
]

describe('Etapas da requisição', () => {
  let authorization
  let produto

  beforeEach(async () => {
    const usuario = await utils.cadastrarUsuario({ administrador: 'true' })
    authorization = (await utils.login(usuario.email, usuario.password)).authorization
    produto = await utils.cadastrarProduto({ authorization, quantidade: 5 })
  })

  afterEach(() => sandbox.restore())

  describe('/carrinhos POST', () => {
    it('Cadastro com sucesso passa por todas as etapas e regras - @skipE2E', async () => {
      const resposta = await request.post('/carrinhos').set('authorization', authorization).send({
        produtos: [{ idProduto: produto._id, quantidade: 1 }]
      }).expect(201)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'auth;st=ok',
        'schema;st=ok',
        'rules;st=ok',
        ...REGRAS_OK,
        'write;st=ok'
      ])
    })

    it('Sem token para na autenticação - @skipE2E', async () => {
      const resposta = await request.post('/carrinhos').send({
        produtos: [{ idProduto: produto._id, quantidade: 1 }]
      }).expect(401)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'auth;st=failed;reason=token_missing',
        'schema;st=not_run',
        'rules;st=not_run',
        'write;st=not_run'
      ])
    })

    it('Sem token e com body inválido ainda para na autenticação - @skipE2E', async () => {
      const resposta = await request.post('/carrinhos').send({ inexistente: 1 }).expect(401)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'auth;st=failed;reason=token_missing',
        'schema;st=not_run',
        'rules;st=not_run',
        'write;st=not_run'
      ])
    })

    it('Erro de schema não executa regras nem gravação - @skipE2E', async () => {
      const resposta = await request.post('/carrinhos').set('authorization', authorization).send({ inexistente: 1 }).expect(400)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'auth;st=ok',
        'schema;st=failed',
        'rules;st=not_run',
        'write;st=not_run'
      ])
    })

    it('Regra single_cart falha quando o usuário já possui carrinho - @skipE2E', async () => {
      await utils.cadastrarCarrinho({ idProduto: produto._id, authorization })

      const resposta = await request.post('/carrinhos').set('authorization', authorization).send({
        produtos: [{ idProduto: produto._id, quantidade: 1 }]
      }).expect(400)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'auth;st=ok',
        'schema;st=ok',
        'rules;st=failed',
        'rules.single_cart;st=failed',
        'rules.no_duplicate_product;st=not_run',
        'rules.product_exists;st=not_run',
        'rules.enough_stock;st=not_run',
        'write;st=not_run'
      ])
    })

    it('Regra no_duplicate_product falha com produto repetido - @skipE2E', async () => {
      const resposta = await request.post('/carrinhos').set('authorization', authorization).send({
        produtos: [{ idProduto: produto._id, quantidade: 1 }, { idProduto: produto._id, quantidade: 1 }]
      }).expect(400)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'auth;st=ok',
        'schema;st=ok',
        'rules;st=failed',
        'rules.single_cart;st=ok',
        'rules.no_duplicate_product;st=failed',
        'rules.product_exists;st=not_run',
        'rules.enough_stock;st=not_run',
        'write;st=not_run'
      ])
    })

    it('Regra product_exists falha no item inexistente - @skipE2E', async () => {
      const resposta = await request.post('/carrinhos').set('authorization', authorization).send({
        produtos: [{ idProduto: produto._id, quantidade: 1 }, { idProduto: 'inexistente', quantidade: 1 }]
      }).expect(400)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'auth;st=ok',
        'schema;st=ok',
        'rules;st=failed',
        'rules.single_cart;st=ok',
        'rules.no_duplicate_product;st=ok',
        'rules.product_exists;st=failed;item=1',
        'rules.enough_stock;st=not_run',
        'write;st=not_run'
      ])
    })

    it('Regra enough_stock falha no item sem estoque - @skipE2E', async () => {
      const outroProduto = await utils.cadastrarProduto({ authorization, quantidade: 1 })

      const resposta = await request.post('/carrinhos').set('authorization', authorization).send({
        produtos: [{ idProduto: produto._id, quantidade: 1 }, { idProduto: outroProduto._id, quantidade: 2 }]
      }).expect(400)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'auth;st=ok',
        'schema;st=ok',
        'rules;st=failed',
        'rules.single_cart;st=ok',
        'rules.no_duplicate_product;st=ok',
        'rules.product_exists;st=ok',
        'rules.enough_stock;st=failed;item=1',
        'write;st=not_run'
      ])
    })
  })

  describe('Motivos de falha da autenticação', () => {
    const etapasComFalhaNaAutenticacao = reason => [
      'body;st=ok',
      'rate_limit;st=skipped',
      `auth;st=failed;reason=${reason}`,
      'schema;st=not_run',
      'rules;st=not_run',
      'write;st=not_run'
    ]

    it('Token expirado - @skipE2E', async () => {
      const { email, password } = await utils.cadastrarUsuario()
      sandbox.stub(conf, 'tokenTimeout').value(-10)
      const tokenExpirado = authService.createToken({ email, password })

      const resposta = await request.post('/carrinhos').set('authorization', `Bearer ${tokenExpirado}`).send({}).expect(401)

      chai.assert.deepEqual(lerEtapas(resposta), etapasComFalhaNaAutenticacao('token_expired'))
    })

    it('Bearer sem token - @skipE2E', async () => {
      const resposta = await request.post('/carrinhos').set('authorization', 'Bearer ').send({}).expect(401)

      chai.assert.deepEqual(lerEtapas(resposta), etapasComFalhaNaAutenticacao('bad_format'))
    })

    it('Token sem Bearer - @skipE2E', async () => {
      const resposta = await request.post('/carrinhos').set('authorization', authorization.split(' ')[1]).send({}).expect(401)

      chai.assert.deepEqual(lerEtapas(resposta), etapasComFalhaNaAutenticacao('bad_format'))
    })

    it('Token assinado corretamente sem email - @skipE2E', async () => {
      const tokenSemEmail = authService.createToken({ password: 'teste' })

      const resposta = await request.post('/carrinhos').set('authorization', `Bearer ${tokenSemEmail}`).send({}).expect(401)

      chai.assert.deepEqual(lerEtapas(resposta), etapasComFalhaNaAutenticacao('token_invalid'))
    })

    it('Usuário do token não existe mais - @skipE2E', async () => {
      const { email, password, _id } = await utils.cadastrarUsuario()
      const { authorization: tokenDoUsuarioExcluido } = await utils.login(email, password)
      await request.del(`/usuarios/${_id}`).expect(200)

      const resposta = await request.post('/carrinhos').set('authorization', tokenDoUsuarioExcluido).send({}).expect(401)

      chai.assert.deepEqual(lerEtapas(resposta), etapasComFalhaNaAutenticacao('user_not_found'))
    })

    it('Usuário não administrador em /produtos POST - @skipE2E', async () => {
      const { email, password } = await utils.cadastrarUsuario({ administrador: 'false' })
      const { authorization: tokenNaoAdministrador } = await utils.login(email, password)

      const resposta = await request.post('/produtos').set('authorization', tokenNaoAdministrador).send(utils.dadosProduto()).expect(403)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'auth;st=failed;reason=not_admin',
        'schema;st=not_run',
        'rules;st=not_run'
      ])
    })
  })

  describe('Outras rotas', () => {
    it('/usuarios GET passa por schema e read - @skipE2E', async () => {
      const resposta = await request.get('/usuarios').expect(200)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'schema;st=ok',
        'read;st=ok'
      ])
    })

    it('/usuarios POST passa por schema e rules sem regras detalhadas - @skipE2E', async () => {
      const resposta = await request.post('/usuarios').send({
        nome: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        administrador: 'true'
      }).expect(201)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'schema;st=ok',
        'rules;st=ok'
      ])
    })

    it('Controller que lança erro marca a própria etapa como failed - @skipE2E', async () => {
      sandbox.stub(console, 'log')
      sandbox.stub(carrinhosService, 'getAll').throws(new Error('Teste de erro 500'))

      const resposta = await request.get('/carrinhos').expect(500)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped',
        'schema;st=ok',
        'read;st=failed'
      ])
    })

    it('JSON malformado para no body - @skipE2E', async () => {
      sandbox.stub(console, 'log')

      const resposta = await request.post('/carrinhos')
        .set('authorization', authorization)
        .set('content-type', 'application/json')
        .send('{produtos: 1}')
        .expect(400)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=failed',
        'rate_limit;st=not_run'
      ])
    })

    it('Rota inexistente em um prefixo da API lista apenas body e rate_limit - @skipE2E', async () => {
      const resposta = await request.patch('/carrinhos/a/b').expect(405)

      chai.assert.deepEqual(lerEtapas(resposta), [
        'body;st=ok',
        'rate_limit;st=skipped'
      ])
    })

    it('Rotas fora da API e preflight não possuem os headers - @skipE2E', async () => {
      const respostas = [
        await request.get('/version').expect(200),
        await request.get('/').expect(200),
        await request.options('/usuarios').expect(204)
      ]

      respostas.forEach(({ headers }) => {
        chai.assert.notProperty(headers, 'x-serverest-stages')
      })
    })

    it('Headers expostos para outras origens - @skipE2E', async () => {
      const { headers } = await request.get('/usuarios').expect(200)

      chai.assert.equal(headers['access-control-expose-headers'], 'X-ServeRest-Stages')
    })
  })

  describe('Privacidade', () => {
    it('Nenhum valor da requisição ou do banco aparece nos headers - @skipE2E', async () => {
      const email = `privacidade.${faker.string.alphanumeric(12)}@qa.com`
      const password = `senha${faker.string.alphanumeric(12)}`
      await request.post('/usuarios').send({ nome: 'Privacidade', email, password, administrador: 'true' }).expect(201)
      const login = await request.post('/login').send({ email, password }).expect(200)
      const token = login.body.authorization.split(' ')[1]

      const respostas = [
        login,
        await request.post('/carrinhos').set('authorization', login.body.authorization).send({
          produtos: [{ idProduto: produto._id, quantidade: 1 }]
        }).expect(201),
        await request.post('/carrinhos').set('authorization', `Token ${token}`).send({}).expect(401),
        await request.get('/usuarios').query({ email }).expect(200)
      ]

      respostas.forEach(({ headers }) => {
        const valores = headers['x-serverest-stages']
        lerEtapas({ headers })
        ;[email, password, token, produto._id].forEach(segredo => chai.assert.notInclude(valores, segredo))
      })
    })
  })
})
