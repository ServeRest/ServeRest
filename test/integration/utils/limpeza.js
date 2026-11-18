// Apaga o que cada teste cadastrou, para a suíte poder rodar de novo na mesma instância (staging, container
// reaproveitado, integração sem restaurar src/data). Sem isso os cadastros se acumulavam entre execuções e o
// contrato de /carrinhos GET passava a validar carrinhos deixados pela execução anterior.
//
// O registro é feito pela resposta, não pelos helpers: todo POST ou PUT que devolve 201 em /usuarios,
// /produtos ou /carrinhos entra na lista, inclusive os feitos direto com request.post nos testes. Um DELETE
// do próprio teste que responde 200 tira o cadastro da lista: depois dele o registro não existe mais.

const { faker } = require('@faker-js/faker')

const ROTA = /^\/(usuarios|produtos|carrinhos)(?:\/([^/]+))?$/
// O token vale 600 s (src/utils/conf.js); a limpeza renova o seu bem antes disso.
const RENOVAR_LOGIN_MS = 300 * 1000
// As requisições da limpeza não mandam lang, então a resposta vem em pt-BR.
const EXCLUIDO = 'Registro excluído com sucesso'

let cliente
let dentroDeTeste = false
const doTeste = []
const foraDeTeste = []
const falhas = []
let administrador

const rotaDe = url => ROTA.exec(new URL(url).pathname)

// O token do ServeRest leva o email e a senha do login; com eles a limpeza entra de novo como o dono.
function credenciaisDoToken (authorization) {
  const token = String(authorization).split(' ').pop()
  const { email, password } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url'))
  return { email, password }
}

function esquecer (lista, deveSair) {
  for (let indice = lista.length - 1; indice >= 0; indice--) {
    if (deveSair(lista[indice])) lista.splice(indice, 1)
  }
}

function registrar (test, metodo) {
  // A lista é escolhida quando o pedido é montado: a resposta pode chegar depois do fim do teste.
  const lista = dentroDeTeste ? doTeste : foraDeTeste
  test.on('response', res => {
    const rota = rotaDe(test.url)
    if (!rota) return
    const [, tipo, id] = rota
    if (metodo === 'del') {
      if (res.status !== 200) return
      const email = tipo === 'carrinhos' && credenciaisDoToken(test._header.authorization).email
      const deveSair = item => item.tipo === tipo && (email ? item.email === email : item._id === id)
      esquecer(doTeste, deveSair)
      esquecer(foraDeTeste, deveSair)
      return
    }
    if (res.status !== 201 || !res.body?._id) return
    const cadastro = { tipo, _id: res.body._id }
    if (tipo === 'carrinhos') Object.assign(cadastro, credenciaisDoToken(test._header.authorization))
    lista.push(cadastro)
  })
  return test
}

function registrarCadastros (alvo) {
  cliente = { ...alvo }
  for (const metodo of ['post', 'put', 'del']) {
    alvo[metodo] = (...args) => registrar(cliente[metodo](...args), metodo)
  }
  return alvo
}

async function login ({ email, password }) {
  const { status, body } = await cliente.post('/login').send({ email, password })
  if (status !== 200) throw new Error(`login de ${email}: ${status} ${JSON.stringify(body)}`)
  return body.authorization
}

// Um administrador da própria limpeza: o que cadastrou o produto pode ter sido excluído, ter deixado de ser
// administrador ou ter o token vencido.
async function tokenDeAdministrador () {
  if (!administrador) {
    const dados = {
      nome: 'Limpeza dos testes',
      email: `limpeza-${faker.string.alphanumeric(16)}@qa.com`,
      password: faker.string.alphanumeric(16),
      administrador: 'true'
    }
    const { status, body } = await cliente.post('/usuarios').send(dados)
    if (status !== 201) throw new Error(`administrador da limpeza: ${status} ${JSON.stringify(body)}`)
    administrador = { ...dados, _id: body._id }
  }
  if (!administrador.authorization || Date.now() - administrador.desde > RENOVAR_LOGIN_MS) {
    administrador.authorization = await login(administrador)
    administrador.desde = Date.now()
  }
  return administrador.authorization
}

const exclusao = {
  carrinhos: async cadastro => cliente.del('/carrinhos/cancelar-compra').set('authorization', await login(cadastro)),
  produtos: async ({ _id }) => cliente.del(`/produtos/${_id}`).set('authorization', await tokenDeAdministrador()),
  usuarios: ({ _id }) => cliente.del(`/usuarios/${_id}`)
}

// Um 200 com "Nenhum registro excluído" ou "Não foi encontrado carrinho" também é falha: nada saiu do banco.
async function excluir (cadastro) {
  try {
    const { status, body } = await exclusao[cadastro.tipo](cadastro)
    if (status !== 200 || !String(body?.message).startsWith(EXCLUIDO)) {
      falhas.push(`${cadastro.tipo} ${cadastro._id}: ${status} ${JSON.stringify(body)}`)
    }
  } catch (erro) {
    falhas.push(`${cadastro.tipo} ${cadastro._id}: ${erro.message}`)
  }
}

// Carrinho antes de produto e usuário: a API não exclui produto que está em carrinho nem usuário com carrinho.
async function apagar (cadastros) {
  const pendentes = cadastros.splice(0)
  for (const tipo of ['carrinhos', 'produtos', 'usuarios']) {
    await Promise.all(pendentes.filter(item => item.tipo === tipo).map(excluir))
  }
}

// O que um before() de describe cadastrou serve a vários testes e só sai no fim, junto com o administrador.
async function apagarCadastrosForaDosTestes () {
  await apagar(foraDeTeste)
  if (administrador) {
    await excluir({ tipo: 'usuarios', _id: administrador._id })
    administrador = undefined
  }
}

// Síncrono e separado da exclusão, para a raiz poder rodar outras verificações antes de relatar.
function relatarFalhasDaLimpeza () {
  if (falhas.length) {
    throw new Error(`Cadastros que a limpeza não conseguiu apagar:\n${falhas.splice(0).join('\n')}`)
  }
}

// Um afterEach da raiz que falha faz o mocha pular o resto da suíte; por isso a falha só aparece no fim.
const mochaHooks = {
  beforeEach () {
    dentroDeTeste = true
  },
  async afterEach () {
    dentroDeTeste = false
    await apagar(doTeste)
  },
  afterAll: [apagarCadastrosForaDosTestes, relatarFalhasDaLimpeza]
}

module.exports = { registrarCadastros, mochaHooks, apagarCadastrosForaDosTestes, relatarFalhasDaLimpeza }
