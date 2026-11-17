'use strict'

// Estados e token do contrato do consumidor Front (repositório ServeRest/front). Os nomes dos estados
// precisam ser idênticos aos de __tests__/contract/serverest-provider.test.js naquele repositório.

const produtosService = require('../../../src/services/produtos-service')
const usuariosService = require('../../../src/services/usuarios-service')

const ADMIN_DA_SEMENTE = {
  _id: '0uxuPY0cbmQhpEz1',
  nome: 'Fulano da Silva',
  email: 'fulano@qa.com',
  password: 'teste',
  administrador: 'true'
}

// O requestFilter entra como este admin, então todo estado garante que ele existe.
async function garantirAdminDaSemente () {
  const { _id, ...dados } = ADMIN_DA_SEMENTE
  await usuariosService.createOrUpdateById(_id, dados)
}

async function excluirUsuarioPorEmail (email) {
  const usuario = await usuariosService.getDadosDoUsuario({ email })
  if (usuario) await usuariosService.deleteById(usuario._id)
}

async function excluirProdutoPorNome (nome) {
  const produto = await produtosService.existeProduto({ nome })
  if (produto) await produtosService.deleteById(produto._id)
}

const stateHandlers = {
  'existe o usuário administrador da semente': garantirAdminDaSemente,
  'não existe usuário com o e-mail beltrano@qa.com.br': async () => {
    await garantirAdminDaSemente()
    await excluirUsuarioPorEmail('beltrano@qa.com.br')
  },
  'existe um usuário não administrador com o id usuarioPactFront': async () => {
    await garantirAdminDaSemente()
    await usuariosService.createOrUpdateById('usuarioPactFront', {
      nome: 'Usuário do contrato do front',
      email: 'usuario.pact.front@qa.com',
      password: 'teste',
      administrador: 'false'
    })
  },
  'existe um produto chamado Produto do Front com o id produtoPactFront': async () => {
    await garantirAdminDaSemente()
    await produtosService.createOrUpdateById('produtoPactFront', {
      nome: 'Produto do Front',
      preco: 100,
      descricao: 'Produto do contrato do front',
      quantidade: 10
    })
  },
  'não existem os produtos Mouse do Front e Teclado do Front': async () => {
    await garantirAdminDaSemente()
    await excluirProdutoPorNome('Mouse do Front')
    await excluirProdutoPorNome('Teclado do Front')
  }
}

// O contrato guarda um token de exemplo, que a API recusaria. Onde o front manda Authorization,
// a verificação troca pelo token de um login de verdade do admin no servidor local.
function trocarTokenPeloDoAdmin (urlDoServidor) {
  return async (req, res, next) => {
    if (!req.headers.authorization) return next()
    try {
      const resposta = await fetch(`${urlDoServidor}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_DA_SEMENTE.email, password: ADMIN_DA_SEMENTE.password })
      })
      const { authorization } = await resposta.json()
      req.headers.authorization = authorization
      next()
    } catch (erro) {
      next(erro)
    }
  }
}

module.exports = { stateHandlers, trocarTokenPeloDoAdmin }
