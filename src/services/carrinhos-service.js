'use strict'

const Datastore = require('nedb-promises')
const { join } = require('path')

const alterarValoresParaRegex = require('../utils/alterarValoresParaRegex')
const authService = require('../services/auth-service')
const usuariosService = require('../services/usuarios-service')
const produtosService = require('../services/produtos-service')

const datastore = Datastore.create({ filename: join(__dirname, '../data/carrinhos.db'), autoload: true })

// Index frequently searched fields for better query performance
/* istanbul ignore next */
datastore.ensureIndex({ fieldName: 'idUsuario' })
/* istanbul ignore next */
datastore.ensureIndex({ fieldName: 'precoTotal' })
/* istanbul ignore next */
datastore.ensureIndex({ fieldName: 'quantidadeTotal' })
/* istanbul ignore next */
datastore.ensureIndex({ fieldName: 'produtos.idProduto' })

exports.getAll = queryString => {
  queryString = alterarValoresParaRegex(queryString)
  return datastore.find(queryString)
}

exports.getOne = id => {
  return datastore.findOne({ _id: id })
}

exports.existeCarrinho = pesquisa => {
  return datastore.findOne(pesquisa)
}

exports.existeCarrinhoComProduto = idProduto => {
  return datastore.findOne({ produtos: { $elemMatch: { idProduto } } })
}

exports.criarCarrinho = async body => {
  return datastore.insert(body)
}

exports.extrairProdutosDuplicados = arrayProdutos => {
  const sortedArr = arrayProdutos.slice().sort()
  const produtosDuplicados = []
  for (let i = 0; i < sortedArr.length - 1; i++) {
    if (sortedArr[i + 1].idProduto === sortedArr[i].idProduto) {
      produtosDuplicados.push(sortedArr[i].idProduto)
    }
  }
  return produtosDuplicados
}

exports.getProdutosComPrecoUnitarioOuErro = async arrayProdutos => {
  // Use batch lookup instead of per-item queries to reduce round-trips
  const { produtosComPreco, error } = await produtosService.getPrecosUnitariosPorLote(arrayProdutos)

  if (error) {
    const item = { ...error.item, index: error.index }
    return { error: { ...error, item } }
  }

  return { produtosComPrecoUnitario: produtosComPreco }
}

exports.deleteById = async id => {
  return datastore.remove({ _id: id }, {})
}

exports.concluiCompra = async carrinho => {
  await this.deleteById(carrinho._id)
}

exports.removeCarrinho = async carrinho => {
  const { produtos, _id } = carrinho
  await this.reabasteceEstoque(produtos)
  await this.deleteById(_id)
}

exports.getCarrinhoDoUsuario = async (authorization) => {
  const _id = await idUsuario(authorization)
  return this.getAll({ idUsuario: _id })
}

exports.usuarioJaPossuiCarrinho = async (authorization) => {
  const _id = await idUsuario(authorization)
  return {
    idUsuario: _id,
    possuiCarrinho: await this.existeCarrinho({ idUsuario: _id })
  }
}

exports.precoTotal = async (produtos) => {
  return produtos.reduce((total, produto) => {
    return total + (produto.precoUnitario * produto.quantidade)
  }, 0)
}

exports.quantidadeTotal = async (produtos) => {
  // Use batch update to reduce round-trips instead of updating per-item
  await produtosService.updateQuantidadePorLote(produtos)
  return produtos.reduce((total, produto) => total + produto.quantidade, 0)
}

exports.reabasteceEstoque = async produtos => {
  // Use batch restore to reduce round-trips instead of restoring per-item
  await produtosService.restoreQuantidadePorLote(produtos)
}

const idUsuario = async (authorization) => {
  const { email, password } = authService.verifyToken(authorization)
  const { _id } = await usuariosService.getDadosDoUsuario({ email, password })
  return _id
}
