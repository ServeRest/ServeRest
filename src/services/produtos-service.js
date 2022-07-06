'use strict'

const constant = require('../utils/constants')
const Datastore = require('nedb-promises')
const { join } = require('path')

const alterarValoresParaRegex = require('../utils/alterarValoresParaRegex')

const datastore = Datastore.create({ filename: join(__dirname, '../data/produtos.db'), autoload: true })

exports.getAll = queryString => {
  queryString = alterarValoresParaRegex(queryString)
  return datastore.find(queryString)
}

exports.getOne = id => {
  return datastore.findOne({ _id: id })
}

exports.getDadosDoProduto = queryString => {
  return datastore.findOne(queryString)
}

exports.existeProduto = pesquisa => {
  return datastore.count(pesquisa)
}

exports.updateQuantidade = async ({ idProduto, quantidade }) => {
  const { quantidade: quantidadeEmEstoque } = await this.getDadosDoProduto({ _id: idProduto })
  const novaQuantidade = quantidadeEmEstoque - quantidade
  await this.updateById(idProduto, { $set: { quantidade: novaQuantidade } })
}

exports.criarProduto = async body => {
  body = formatarValores(body)
  return datastore.insert(body)
}

exports.getPrecoUnitarioOuErro = async (produto) => {
  const quantidade = parseInt(produto.quantidade)
  const { idProduto } = produto
  const existePedido = await this.existeProduto({ _id: idProduto })
  if (!existePedido) {
    return { error: { statusCode: 400, message: constant.IDPRODUTO_INVALIDO, item: { idProduto, quantidade } } }
  }

  const { quantidade: quantidadeEstoque, preco } = await this.getDadosDoProduto({ _id: idProduto })
  if (quantidade > quantidadeEstoque) {
    return { error: { statusCode: 400, message: constant.ESTOQUE_INSUFICIENTE, item: { idProduto, quantidade, quantidadeEstoque } } }
  }
  return { precoUnitario: preco }
}

exports.deleteById = async id => {
  return datastore.remove({ _id: id }, {})
}

exports.createOrUpdateById = async (idDoProdutoQueSeraAlterado, body) => {
  body = formatarValores(body)
  return this.updateById(idDoProdutoQueSeraAlterado, body)
}

exports.updateById = async (idDoProdutoQueSeraAlterado, body) => {
  return datastore.update({ _id: idDoProdutoQueSeraAlterado }, body, { upsert: true, returnUpdatedDocs: true })
}

function formatarValores (body) {
  body.nome = body.nome.trim()
  body.preco = parseInt(body.preco)
  body.quantidade = parseInt(body.quantidade)
  if (body.imagem) {
    body.imagem = body.imagem.trim()
  }
  return body
}
