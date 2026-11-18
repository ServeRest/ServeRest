// Apaga o que cada teste cadastrou, para a suíte poder rodar de novo na mesma instância (staging, container
// reaproveitado, integração sem restaurar src/data). Sem isso os cadastros se acumulavam entre execuções e o
// contrato de /carrinhos GET passava a validar carrinhos deixados pela execução anterior.
//
// O registro é feito pela resposta, não pelos helpers: todo POST ou PUT que devolve 201 em /usuarios,
// /produtos ou /carrinhos entra na lista, inclusive os feitos direto com request.post nos testes.

const ROTA_QUE_CADASTRA = /\/(usuarios|produtos|carrinhos)(\/[^/?]*)?(\?|$)/i

let request
let dentroDeTeste = false
const doTeste = []
const foraDeTeste = []
const falhas = []

function registrar (test) {
  test.on('response', res => {
    const rota = ROTA_QUE_CADASTRA.exec(test.url)
    if (res.status !== 201 || !rota || !res.body?._id) return
    // O carrinho é apagado pelo token do dono; o produto, pelo token do administrador que o cadastrou.
    const cadastro = { tipo: rota[1].toLowerCase(), _id: res.body._id, authorization: test._header.authorization }
    ;(dentroDeTeste ? doTeste : foraDeTeste).push(cadastro)
  })
  return test
}

function registrarCadastros (cliente) {
  request = cliente
  for (const metodo of ['post', 'put']) {
    const original = cliente[metodo]
    cliente[metodo] = (...args) => registrar(original(...args))
  }
  return cliente
}

const exclusao = {
  carrinhos: ({ authorization }) => request.del('/carrinhos/cancelar-compra').set('authorization', authorization),
  produtos: ({ _id, authorization }) => request.del(`/produtos/${_id}`).set('authorization', authorization),
  usuarios: ({ _id }) => request.del(`/usuarios/${_id}`)
}

// Carrinho antes de produto e usuário: a API não exclui produto que está em carrinho nem usuário com carrinho.
async function apagar (cadastros) {
  const pendentes = cadastros.splice(0)
  for (const tipo of ['carrinhos', 'produtos', 'usuarios']) {
    for (const cadastro of pendentes.filter(item => item.tipo === tipo)) {
      const { status, body } = await exclusao[tipo](cadastro)
      if (status !== 200) falhas.push(`${tipo} ${cadastro._id}: ${status} ${JSON.stringify(body)}`)
    }
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
  afterAll: [
    // O que um before() de describe cadastrou serve a vários testes e só sai no fim.
    async function apagarCadastrosForaDosTestes () {
      await apagar(foraDeTeste)
      if (falhas.length) {
        throw new Error(`Cadastros que a limpeza não conseguiu apagar:\n${falhas.splice(0).join('\n')}`)
      }
    }
  ]
}

module.exports = { registrarCadastros, mochaHooks }
