// Apaga no fim da execução o que a suíte cadastrou, para ela poder rodar de novo na mesma instância (staging,
// container reaproveitado, integração sem restaurar src/data). Sem isso os cadastros se acumulavam entre
// execuções e o contrato de /carrinhos GET passava a validar carrinhos deixados pela execução anterior.
//
// O registro é feito pela resposta, não pelos helpers: todo POST ou PUT que devolve 201 em /usuarios,
// /produtos ou /carrinhos entra na lista, inclusive os feitos direto com request.post nos testes.

const jwt = require('jsonwebtoken')

const utils = require('./index')

// O Express não diferencia maiúsculas nem a barra no fim.
const ROTA = /^\/(usuarios|produtos|carrinhos)(?:\/[^/]+)?\/?$/i
// Carrinho antes de produto e usuário: a API não exclui produto que está em carrinho nem usuário com carrinho.
const FASES = ['carrinhos', 'produtos', 'usuarios']
// No staging e na revisão nova a limpeza só avisa: um E2E que falha segura o deploy, e um cadastro que sobrou não
// justifica isso.
const REMOTO = ['e2e-staging', 'e2e-production'].includes(process.env.TEST_TYPE)
// Cada requisição da limpeza tem 5 s e não é reenviada depois de um 429. A limpeza inteira tem um orçamento
// bem abaixo do timeout do hook (30 s local, 100 s remoto).
const TIMEOUT_DA_REQUISICAO_MS = 5000
const ORCAMENTO_MS = REMOTO ? 60000 : 20000

let cliente
const cadastros = []
const falhas = []

function registrar (test) {
  test.on('response', res => {
    const rota = ROTA.exec(new URL(test.url).pathname)
    if (!rota || res.status !== 201 || !res.body?._id) return
    const cadastro = { tipo: rota[1].toLowerCase(), _id: res.body._id }
    if (cadastro.tipo === 'carrinhos') cadastro.authorization = test._header.authorization
    cadastros.push(cadastro)
  })
  return test
}

// O cliente sem o registro fica guardado: as requisições da limpeza não entram na lista.
function registrarCadastros (alvo) {
  cliente = {}
  for (const metodo of ['post', 'del']) {
    cliente[metodo] = (...args) => alvo[metodo](...args).timeout(TIMEOUT_DA_REQUISICAO_MS).retry(0)
  }
  for (const metodo of ['post', 'put']) {
    const original = alvo[metodo]
    alvo[metodo] = (...args) => registrar(original(...args))
  }
  return alvo
}

// O token do ServeRest leva o email e a senha do login.
function decodificarToken (authorization) {
  try {
    const { email, password } = jwt.decode(String(authorization).split(' ').pop())
    return { email, password }
  } catch {
    return {}
  }
}

// Um administrador da própria limpeza: o que cadastrou o produto pode ter sido excluído ou ter deixado de ser
// administrador. A promessa é uma só para as exclusões em paralelo usarem o mesmo cadastro.
let administrador
function criarAdministrador () {
  administrador ??= utils.cadastrarUsuario({ nome: 'Limpeza dos testes', administrador: 'true' }, cliente)
    .then(async usuario => ({ ...usuario, ...await utils.login(usuario.email, usuario.password, cliente) }))
  return administrador
}

const exclusao = {
  // O token capturado no cadastro pode ter vencido; só então a limpeza entra de novo como o dono.
  carrinhos: async ({ authorization }) => {
    const resposta = await cliente.del('/carrinhos/cancelar-compra').set('authorization', authorization)
    if (resposta.status !== 401) return resposta
    const { email, password } = decodificarToken(authorization)
    const login = await utils.login(email, password, cliente).catch(erro => {
      throw new Error(`o token do dono foi recusado (401) e o login de ${email} falhou (${erro.message}); ` +
        'a senha pode ter sido trocada por um PUT /usuarios no teste')
    })
    return cliente.del('/carrinhos/cancelar-compra').set('authorization', login.authorization)
  },
  produtos: async ({ _id }) => cliente.del(`/produtos/${_id}`).set('authorization', (await criarAdministrador()).authorization),
  usuarios: ({ _id }) => cliente.del(`/usuarios/${_id}`)
}

const descrever = ({ tipo, _id, authorization }) =>
  `${tipo} ${_id}${authorization ? ` (dono ${decodificarToken(authorization).email})` : ''}`

// Devolve o motivo da falha, ou nada quando o registro não existe mais. Um 200 com "Nenhum registro excluído"
// ou "Não foi encontrado carrinho" quer dizer que um teste já o apagou.
async function excluir (cadastro, parar) {
  try {
    const { status, body } = await exclusao[cadastro.tipo](cadastro)
    if (status === 200) return
    if (status === 429) parar()
    return `${status} ${JSON.stringify(body)}`
  } catch (erro) {
    if (erro.timeout) parar()
    return erro.message
  }
}

async function apagar (pendentes, motivos, estado) {
  for (const tipo of FASES) {
    if (estado.parado) return
    await Promise.all([...pendentes].filter(item => item.tipo === tipo).map(async item => {
      const motivo = await excluir(item, () => { estado.parado = true })
      if (motivo === undefined) pendentes.delete(item)
      else motivos.set(item, motivo)
    }))
  }
  if (estado.parado || !administrador) return
  const criado = await administrador.catch(() => undefined)
  if (criado) {
    const motivo = await excluir({ tipo: 'usuarios', _id: criado._id }, () => {})
    if (motivo !== undefined) falhas.push(`administrador da limpeza ${criado._id}: ${motivo}`)
  }
}

// Um 429, um timeout ou o fim do orçamento param a limpeza; o que sobrou vai para o relatório.
async function limparCadastros () {
  const pendentes = new Set(cadastros.splice(0))
  const motivos = new Map()
  const estado = { parado: false }
  let prazo
  const orcamento = new Promise(resolve => { prazo = setTimeout(resolve, ORCAMENTO_MS) })
  try {
    await Promise.race([apagar(pendentes, motivos, estado), orcamento])
  } catch (erro) {
    falhas.push(`a limpeza parou: ${erro.message}`)
  } finally {
    clearTimeout(prazo)
    estado.parado = true
  }
  pendentes.forEach(item => falhas.push(`${descrever(item)}: ${motivos.get(item) ?? 'a limpeza parou antes'}`))
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

const mochaHooks = { afterAll: [limparCadastros, relatarFalhasDaLimpeza] }

module.exports = { registrarCadastros, mochaHooks, limparCadastros, relatarFalhasDaLimpeza }
