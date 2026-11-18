// Apaga o que cada teste cadastrou, para a suíte poder rodar de novo na mesma instância (staging, container
// reaproveitado, integração sem restaurar src/data). Sem isso os cadastros se acumulavam entre execuções e o
// contrato de /carrinhos GET passava a validar carrinhos deixados pela execução anterior.
//
// O registro é feito pela resposta, não pelos helpers: todo POST ou PUT que devolve 201 em /usuarios,
// /produtos ou /carrinhos entra na lista, inclusive os feitos direto com request.post nos testes. Um DELETE
// do próprio teste que responde 200 tira o cadastro da lista: depois dele o registro não existe mais.

const { faker } = require('@faker-js/faker')
const jwt = require('jsonwebtoken')

const utils = require('./index')

const ROTA = /^\/(usuarios|produtos|carrinhos)(?:\/([^/]+))?$/
// Carrinho antes de produto e usuário: a API não exclui produto que está em carrinho nem usuário com carrinho.
const FASES = ['carrinhos', 'produtos', 'usuarios']
// O token vale 600 s (src/utils/conf.js); a limpeza renova o do seu administrador bem antes disso.
const RENOVAR_LOGIN_MS = 300 * 1000
// As requisições da limpeza não mandam lang, então a resposta vem em pt-BR.
const EXCLUIDO = 'Registro excluído com sucesso'
// No staging e na produção a limpeza só avisa: um smoke que falha na produção dispara o rollback, e um E2E
// que falha no staging segura o deploy, e um cadastro que sobrou não justifica nenhum dos dois.
const REMOTO = ['e2e-staging', 'e2e-production'].includes(process.env.TEST_TYPE)
// Limites de tempo, abaixo do timeout dos hooks (30 s local, 100 s remoto). Depois de um teste, cada
// requisição tem 5 s e não espera a janela do limitador: um 429, um timeout ou o token vencido de um carrinho
// adiam o item e as fases seguintes para o fim. O fim pode esperar o limitador, tem o seu próprio timeout e
// para de começar fases quando o prazo acaba.
const TIMEOUT_DA_REQUISICAO_MS = 5000
const PRAZO_DO_FIM_MS = 5 * 60 * 1000
const TIMEOUT_DO_FIM_MS = 10 * 60 * 1000

let cliente
let dentroDeTeste = false
const doTeste = []
const foraDeTeste = []
const falhas = []
let administrador
let sessao

const rotaDe = url => ROTA.exec(new URL(url).pathname)

function emailDoToken (authorization) {
  try {
    return jwt.decode(String(authorization).split(' ').pop()).email
  } catch {
    return undefined
  }
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
      const email = tipo === 'carrinhos' && emailDoToken(test._header.authorization)
      const deveSair = item => item.tipo === tipo && (email ? item.email === email : item._id === id)
      esquecer(doTeste, deveSair)
      esquecer(foraDeTeste, deveSair)
      return
    }
    if (res.status !== 201 || !res.body?._id) return
    const cadastro = { tipo, _id: res.body._id }
    if (tipo === 'carrinhos') {
      cadastro.authorization = test._header.authorization
      cadastro.email = emailDoToken(cadastro.authorization)
    }
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

function enviar (requisicao, noFim) {
  requisicao.timeout(TIMEOUT_DA_REQUISICAO_MS)
  return noFim ? requisicao : requisicao.retry(0)
}

function criarAdministrador (noFim) {
  const dados = {
    nome: 'Limpeza dos testes',
    email: `limpeza-${faker.string.alphanumeric(16)}@qa.com`,
    password: faker.string.alphanumeric(16),
    administrador: 'true'
  }
  return enviar(cliente.post('/usuarios').send(dados), noFim).then(({ status, body }) => {
    if (status !== 201) {
      throw Object.assign(new Error(`administrador da limpeza: ${status} ${JSON.stringify(body)}`), { status })
    }
    return { ...dados, _id: body._id }
  })
}

// Um administrador da própria limpeza: o que cadastrou o produto pode ter sido excluído, ter deixado de ser
// administrador ou ter o token vencido. As promessas ficam guardadas para as exclusões em paralelo de uma fase
// usarem o mesmo cadastro e o mesmo login.
async function tokenDeAdministrador (noFim) {
  administrador ??= criarAdministrador(noFim).catch(erro => {
    administrador = undefined
    throw erro
  })
  const { email, password } = await administrador
  if (!sessao || Date.now() - sessao.desde > RENOVAR_LOGIN_MS) {
    const token = utils.login(email, password).then(({ authorization }) => authorization)
    sessao = { desde: Date.now(), token }
    token.catch(() => { sessao = undefined })
  }
  return sessao.token
}

// O token capturado no cadastro do carrinho pode ter vencido; só então a limpeza entra de novo como o dono,
// com o email e a senha que o próprio token traz.
async function cancelarComLoginNovo (cadastro) {
  const { email, password } = jwt.decode(cadastro.authorization.split(' ').pop())
  let authorization
  try {
    authorization = (await utils.login(email, password)).authorization
  } catch (erro) {
    throw new Error(`o token do dono foi recusado (401) e o login de ${email} falhou (${erro.message}); ` +
      'a senha pode ter sido trocada por um PUT /usuarios no teste')
  }
  return enviar(cliente.del('/carrinhos/cancelar-compra').set('authorization', authorization), true)
}

const exclusao = {
  carrinhos: async (cadastro, noFim) => {
    const resposta = await enviar(cliente.del('/carrinhos/cancelar-compra').set('authorization', cadastro.authorization), noFim)
    return resposta.status === 401 && noFim ? cancelarComLoginNovo(cadastro) : resposta
  },
  produtos: async ({ _id }, noFim) =>
    enviar(cliente.del(`/produtos/${_id}`).set('authorization', await tokenDeAdministrador(noFim)), noFim),
  usuarios: ({ _id }, noFim) => enviar(cliente.del(`/usuarios/${_id}`), noFim)
}

const descrever = cadastro => `${cadastro.tipo} ${cadastro._id}${cadastro.email ? ` (dono ${cadastro.email})` : ''}`

// Devolve true quando o item deve ficar para o fim. Um 200 com "Nenhum registro excluído" ou "Não foi
// encontrado carrinho" é falha: nada saiu do banco.
async function excluir (cadastro, noFim) {
  try {
    const { status, body } = await exclusao[cadastro.tipo](cadastro, noFim)
    if (!noFim && (status === 429 || (status === 401 && cadastro.tipo === 'carrinhos'))) return true
    if (status !== 200 || !String(body?.message).startsWith(EXCLUIDO)) {
      falhas.push(`${descrever(cadastro)}: ${status} ${JSON.stringify(body)}`)
    }
  } catch (erro) {
    if (!noFim && (erro.timeout || erro.status === 429)) return true
    falhas.push(`${descrever(cadastro)}: ${erro.message}`)
  }
  return false
}

async function apagar (pendentes, { noFim = false, prazo = Infinity } = {}) {
  for (const [fase, tipo] of FASES.entries()) {
    const daFase = pendentes.filter(item => item.tipo === tipo)
    if (Date.now() > prazo) {
      daFase.forEach(item => falhas.push(`${descrever(item)}: o prazo da limpeza acabou antes da exclusão`))
      continue
    }
    const adiar = await Promise.all(daFase.map(item => excluir(item, noFim)))
    const adiados = daFase.filter((item, indice) => adiar[indice])
    if (adiados.length) {
      // Sem o carrinho cancelado, o produto e o usuário dele não saem; as fases seguintes vão juntas.
      foraDeTeste.push(...adiados, ...pendentes.filter(item => FASES.indexOf(item.tipo) > fase))
      return
    }
  }
}

// O fim apaga as duas listas: o que um before() de describe cadastrou, o que foi adiado e o que chegou pela
// resposta atrasada do último teste. Depois sai o administrador da limpeza.
async function apagarCadastrosForaDosTestes () {
  this.timeout(TIMEOUT_DO_FIM_MS)
  const prazo = Date.now() + PRAZO_DO_FIM_MS
  await apagar([...doTeste.splice(0), ...foraDeTeste.splice(0)], { noFim: true, prazo })
  if (administrador) {
    const criado = await administrador.catch(() => undefined)
    if (criado) await excluir({ tipo: 'usuarios', _id: criado._id }, true)
    administrador = sessao = undefined
  }
}

// Síncrono e separado da exclusão, para a raiz poder rodar outras verificações antes de relatar.
function relatarFalhasDaLimpeza () {
  if (!falhas.length) return
  const relatorio = `Cadastros que a limpeza não conseguiu apagar:\n${falhas.splice(0).join('\n')}`
  if (REMOTO) {
    console.warn(`AVISO (não reprova a execução): ${relatorio}`)
    return
  }
  throw new Error(relatorio)
}

// Um afterEach da raiz que falha faz o mocha pular o resto da suíte; por isso a falha só aparece no fim.
const mochaHooks = {
  beforeEach () {
    dentroDeTeste = true
  },
  async afterEach () {
    dentroDeTeste = false
    await apagar(doTeste.splice(0))
  },
  afterAll: [apagarCadastrosForaDosTestes, relatarFalhasDaLimpeza]
}

module.exports = { registrarCadastros, mochaHooks, apagarCadastrosForaDosTestes, relatarFalhasDaLimpeza }
