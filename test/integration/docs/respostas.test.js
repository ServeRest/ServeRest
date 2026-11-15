const { expect } = require('chai')
const zlib = require('zlib')

const documento = require('../../../docs/swagger.json')
const ptBr = require('../../../src/swagger/translations/pt-BR')
const { LOAD_TEST_DETECTED } = require('../../../src/utils/constants')
const utils = require('../utils')

const METODOS = ['get', 'post', 'put', 'delete']

function resolver (no) {
  let atual = no
  while (atual && atual.$ref) atual = atual.$ref.slice(2).split('/').reduce((pai, parte) => pai[parte], documento)
  return atual
}

function operacoes () {
  return Object.keys(documento.paths).flatMap(caminho => METODOS
    .filter(metodo => documento.paths[caminho][metodo])
    .map(metodo => ({ rota: `${metodo.toUpperCase()} ${caminho}`, operacao: documento.paths[caminho][metodo] })))
}

function respostaDocumentada (rota, status) {
  const [metodo, caminho] = rota.split(' ')
  return resolver(documento.paths[caminho][metodo.toLowerCase()].responses[status])
}

// O exemplo como a página e o Swagger mostram: o example do conteúdo, um dos examples pelo nome ou o example de
// cada propriedade do schema.
function exemploDocumentado (resposta, nome) {
  const conteudo = resposta.content['application/json']
  if (nome) return conteudo.examples[nome].value
  if (conteudo.example !== undefined) return conteudo.example
  const { properties } = resolver(conteudo.schema)
  return Object.fromEntries(Object.keys(properties).map(campo => [campo, resolver(properties[campo]).example]))
}

const ID_CURTO = 'curto'
const ID_MAL_CODIFICADO = '%E0%A4%A'
// Acima dos 100 KB que o express.json aceita.
const CORPO_GRANDE_DEMAIS = JSON.stringify({ email: 'a'.repeat(110 * 1024) })
// Um a mais que os 1000 parâmetros que o express.urlencoded aceita.
const FORMULARIO_COM_PARAMETROS_DEMAIS = Array.from({ length: 1001 }, (_, indice) => `p${indice}=1`).join('&')

describe('Respostas documentadas dos erros comuns', () => {
  let administrador
  let tokenDeAdministrador
  let tokenDeUsuarioExcluido

  before(async () => {
    administrador = await utils.cadastrarUsuario({ administrador: 'true' })
    tokenDeAdministrador = (await utils.login(administrador.email, administrador.password)).authorization
    const excluido = await utils.cadastrarUsuario()
    tokenDeUsuarioExcluido = (await utils.login(excluido.email, excluido.password)).authorization
    await request.del(`/usuarios/${excluido._id}`).expect(200)
  })

  // Cada erro comum: a rota, o envio, o status real, o trecho da descrição em pt-BR que nomeia a causa deste
  // envio e, quando o documento traz exemplo para o caso, o exemplo igual ao corpo real (true é o exemplo único).
  const casos = [
    { rota: 'POST /login', caso: 'corpo vazio', envio: () => request.post('/login').send({}), status: 400, causa: 'dados inválidos', exemplo: 'dadosInvalidos' },
    { rota: 'POST /login', caso: 'JSON sem aspas', envio: () => request.post('/login').set('content-type', 'application/json').send('{"email": fulano}'), status: 400, causa: 'Corpo ou dados inválidos', exemplo: 'jsonMalformado' },
    { rota: 'POST /login', caso: 'charset latin9', envio: () => request.post('/login').set('content-type', 'application/json; charset=latin9').send('{"email":"fulano@qa.com","password":"teste"}'), status: 415, causa: 'Charset', exemplo: 'charset' },
    { rota: 'POST /login', caso: 'corpo acima de 100 KB', envio: () => request.post('/login').set('content-type', 'application/json').send(CORPO_GRANDE_DEMAIS), status: 413, causa: '100 KB', exemplo: true },
    { rota: 'POST /login', caso: 'formulário com 1001 parâmetros', envio: () => request.post('/login').type('form').send(FORMULARIO_COM_PARAMETROS_DEMAIS), status: 413, causa: '1000 parâmetros', exemplo: true },
    { rota: 'POST /login', caso: 'Content-Encoding br', envio: () => request.post('/login').set('content-type', 'application/json').set('content-encoding', 'br').send('{}'), status: 415, causa: 'Content-Encoding', exemplo: 'contentEncoding' },
    { rota: 'POST /login', caso: 'gzip no header e corpo sem compressão', envio: () => request.post('/login').set('content-type', 'application/json').set('content-encoding', 'gzip').send('{"email": "fulano@qa.com"}'), status: 400, causa: 'Corpo ou dados inválidos', exemplo: 'corpoComprimidoInvalido' },
    { rota: 'POST /usuarios', caso: 'deflate no header e corpo sem compressão', envio: () => request.post('/usuarios').set('content-type', 'application/json').set('content-encoding', 'deflate').send('{"nome": "x"}'), status: 400, causa: 'Corpo ou dados inválidos' },
    { rota: 'POST /usuarios', caso: 'gzip cortado no meio', envio: () => request.post('/usuarios').set('content-type', 'application/json').set('content-encoding', 'gzip').serialize(bytes => bytes).send(zlib.gzipSync('{"nome": "x"}').subarray(0, 12)), status: 400, causa: 'Corpo ou dados inválidos' },
    { rota: 'GET /usuarios', caso: 'email inválido no filtro', envio: () => request.get('/usuarios?email=nao-email'), status: 400, causa: 'Filtro inválido', exemplo: true },
    { rota: 'GET /usuarios', caso: 'filtro que a rota não tem', envio: () => request.get('/usuarios?foo=1'), status: 400, causa: 'Filtro inválido' },
    { rota: 'GET /produtos', caso: 'preco que não é número', envio: () => request.get('/produtos?preco=abc'), status: 400, causa: 'Filtro inválido', exemplo: true },
    { rota: 'GET /carrinhos', caso: 'precoTotal que não é número', envio: () => request.get('/carrinhos?precoTotal=abc'), status: 400, causa: 'Filtro inválido', exemplo: true },
    { rota: 'POST /usuarios', caso: 'nome vazio', envio: () => request.post('/usuarios').send({ nome: '' }), status: 400, causa: 'dados inválidos' },
    { rota: 'POST /usuarios', caso: 'JSON sem aspas', envio: () => request.post('/usuarios').set('content-type', 'application/json').send('{"nome": x}'), status: 400, causa: 'Corpo ou dados inválidos' },
    { rota: 'PUT /usuarios/{_id}', caso: 'campos faltando', envio: () => request.put('/usuarios/0uxuPY0cbmQhpEz1').send({ nome: 'x' }), status: 400, causa: 'Corpo, dados ou URL inválidos' },
    { rota: 'PUT /usuarios/{_id}', caso: 'id mal codificado', envio: () => request.put(`/usuarios/${ID_MAL_CODIFICADO}`).send({}), status: 400, causa: 'URL inválid' },
    { rota: 'GET /usuarios/{_id}', caso: 'id curto', envio: () => request.get(`/usuarios/${ID_CURTO}`), status: 400, causa: 'ID inválido' },
    { rota: 'DELETE /usuarios/{_id}', caso: 'id mal codificado', envio: () => request.del(`/usuarios/${ID_MAL_CODIFICADO}`), status: 400, causa: 'URL inválid' },
    { rota: 'GET /produtos/{_id}', caso: 'id curto', envio: () => request.get(`/produtos/${ID_CURTO}`), status: 400, causa: 'ID inválido' },
    { rota: 'POST /produtos', caso: 'preço que não é número', envio: () => request.post('/produtos').set('authorization', tokenDeAdministrador).send({ nome: 'x', preco: 'abc', descricao: 'x', quantidade: 1 }), status: 400, causa: 'dados inválidos' },
    { rota: 'DELETE /produtos/{_id}', caso: 'id curto', envio: () => request.del(`/produtos/${ID_CURTO}`).set('authorization', tokenDeAdministrador), status: 400, causa: 'ID inválido' },
    { rota: 'PUT /produtos/{_id}', caso: 'id curto', envio: () => request.put(`/produtos/${ID_CURTO}`).set('authorization', tokenDeAdministrador).send({ nome: 'x', preco: 1, descricao: 'x', quantidade: 1 }), status: 400, causa: 'ID, corpo ou dados inválidos' },
    { rota: 'GET /carrinhos/{_id}', caso: 'id curto', envio: () => request.get(`/carrinhos/${ID_CURTO}`), status: 400, causa: 'ID inválido' },
    { rota: 'POST /carrinhos', caso: 'JSON sem aspas, antes do token', envio: () => request.post('/carrinhos').set('content-type', 'application/json').send('{"produtos": [}'), status: 400, causa: 'Corpo ou dados inválidos' },
    { rota: 'POST /carrinhos', caso: 'produtos vazio', envio: () => request.post('/carrinhos').set('authorization', tokenDeAdministrador).send({ produtos: [] }), status: 400, causa: 'dados inválidos' },
    { rota: 'POST /carrinhos', caso: 'token de usuário excluído', envio: () => request.post('/carrinhos').set('authorization', tokenDeUsuarioExcluido).send({ produtos: [] }), status: 401, causa: 'usuário excluído' }
  ]

  casos.forEach(({ rota, caso, envio, status, causa, exemplo }) => {
    it(`${rota}, ${caso}: ${status} documentado, com a causa na descrição`, async () => {
      const { body } = await envio().expect(status)
      const resposta = respostaDocumentada(rota, status)
      expect(resposta, `${rota} sem ${status} no documento`).to.not.equal(undefined)
      expect(ptBr[resposta.description]).to.include(causa)
      if (exemplo) expect(body).to.deep.equal(exemploDocumentado(resposta, exemplo === true ? undefined : exemplo))
    })
  })

  // O serialize mantém os bytes: com content-type JSON, o superagent transformaria o Buffer em JSON.
  it('um corpo comprimido com gzip de verdade continua sendo lido', async () => {
    const corpo = zlib.gzipSync(JSON.stringify({ email: administrador.email, password: administrador.password }))
    const { body } = await request.post('/login').set('content-type', 'application/json').set('content-encoding', 'gzip').serialize(bytes => bytes).send(corpo).expect(200)
    expect(body.message).to.equal('Login realizado com sucesso')
  })

  it('toda operação documenta o 429 do limite de requisições, com a mensagem que o servidor devolve', () => {
    operacoes().forEach(({ rota }) => {
      const resposta = respostaDocumentada(rota, '429')
      expect(resposta, rota).to.not.equal(undefined)
      expect(exemploDocumentado(resposta), rota).to.deep.equal({ message: LOAD_TEST_DETECTED })
    })
  })

  it('toda operação com corpo documenta o 413 e o 415, e só ela', () => {
    operacoes().forEach(({ rota, operacao }) => {
      const comCorpo = operacao.requestBody !== undefined
      expect(respostaDocumentada(rota, '413') !== undefined, `${rota} 413`).to.equal(comCorpo)
      expect(respostaDocumentada(rota, '415') !== undefined, `${rota} 415`).to.equal(comCorpo)
    })
  })
})
