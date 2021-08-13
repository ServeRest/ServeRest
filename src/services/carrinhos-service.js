'use strict'

const Datastore = require('nedb-promises')
const { join } = require('path')

const alterarValoresParaRegex = require('../utils/alterarValoresParaRegex')
const authService = require('../services/auth-service')
const usuariosService = require('../services/usuarios-service')

const datastore = Datastore.create({ filename: join(__dirname, '../data/carrinhos.db'), autoload: true })

exports.getAll = queryString => {
  queryString = alterarValoresParaRegex(queryString)
  return datastore.find(queryString)
}

exports.getOne = id => {
  return datastore.findOne({ _id: id })
}

exports.existeCarrinho = pesquisa => {
  return datastore.count(pesquisa)
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

exports.deleteById = async id => {
  return datastore.remove({ _id: id }, {})
}

exports.getCarrinhoDoUsuario = async (authorization) => {
  const { email, password } = authService.verifyToken(authorization)
  const { _id: idUsuario } = await usuariosService.getDadosDoUsuario({ email, password })
  return this.getAll({ idUsuario })
}
