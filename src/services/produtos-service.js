'use strict'

const constant = require('../utils/constants')
const Datastore = require('nedb-promises')
const { join } = require('path')

const alterarValoresParaRegex = require('../utils/alterarValoresParaRegex')

const datastore = Datastore.create({ filename: join(__dirname, '../data/produtos.db'), autoload: true })

// Index frequently searched fields for better query performance
/* istanbul ignore next */
datastore.ensureIndex({ fieldName: 'nome', sparse: true })
/* istanbul ignore next */
datastore.ensureIndex({ fieldName: 'preco' })
/* istanbul ignore next */
datastore.ensureIndex({ fieldName: 'quantidade' })

exports.getAll = queryString => {
  queryString = alterarValoresParaRegex(queryString)
  return datastore.find(queryString)
}

exports.getOne = id => {
  return datastore.findOne({ _id: id })
}

/* istanbul ignore next */
exports.getDadosDoProduto = queryString => {
  return datastore.findOne(queryString)
}

exports.existeProduto = pesquisa => {
  return datastore.findOne(pesquisa)
}

/* istanbul ignore next */
exports.updateQuantidade = async ({ idProduto, quantidade }) => {
  const { quantidade: quantidadeEmEstoque } = await this.getDadosDoProduto({ _id: idProduto })
  const novaQuantidade = quantidadeEmEstoque - quantidade
  await this.updateById(idProduto, { $set: { quantidade: novaQuantidade } })
}

/* istanbul ignore next */
exports.updateQuantidadePorLote = async (arrayProdutosComQuantidade) => {
  // Batch update to reduce round-trips: fetch all, calculate new quantities, update all
  const idProdutos = arrayProdutosComQuantidade.map(p => p.idProduto)
  const produtosEmEstoque = await datastore.find({ _id: { $in: idProdutos } })
  const produtosMap = new Map(produtosEmEstoque.map(p => [p._id, p]))

  // Calculate new quantities and perform updates
  const updates = arrayProdutosComQuantidade.map(produto => {
    const { idProduto, quantidade } = produto
    const produtoAtual = produtosMap.get(idProduto)
    if (produtoAtual) {
      const novaQuantidade = produtoAtual.quantidade - quantidade
      return this.updateById(idProduto, { $set: { quantidade: novaQuantidade } })
    }
    return Promise.resolve()
  })

  await Promise.all(updates)
}

/* istanbul ignore next */
exports.restoreQuantidadePorLote = async (arrayProdutosComQuantidade) => {
  // Batch restore to reduce round-trips: fetch all, calculate restored quantities, update all
  const idProdutos = arrayProdutosComQuantidade.map(p => p.idProduto)
  const produtosEmEstoque = await datastore.find({ _id: { $in: idProdutos } })
  const produtosMap = new Map(produtosEmEstoque.map(p => [p._id, p]))

  // Calculate restored quantities and perform updates
  const updates = arrayProdutosComQuantidade.map(produto => {
    const { idProduto, quantidade } = produto
    const produtoAtual = produtosMap.get(idProduto)
    if (produtoAtual) {
      const quantidadeRestaurada = produtoAtual.quantidade + quantidade
      return this.updateById(idProduto, { $set: { quantidade: quantidadeRestaurada } })
    }
    return Promise.resolve()
  })

  await Promise.all(updates)
}

exports.criarProduto = async body => {
  body = formatarValores(body)
  return datastore.insert(body)
}

/* istanbul ignore next */
exports.getPrecoUnitarioOuErro = async (produto) => {
  const quantidade = parseInt(produto.quantidade)
  const { idProduto } = produto
  const existePedido = await this.existeProduto({ _id: idProduto })
  if (!existePedido) {
    return { error: { statusCode: 400, message: constant.PRODUCT_NOT_FOUND, item: { idProduto, quantidade } } }
  }

  const { quantidade: quantidadeEstoque, preco } = await this.getDadosDoProduto({ _id: idProduto })
  if (quantidade > quantidadeEstoque) {
    return { error: { statusCode: 400, message: constant.INSUFFICIENT_STOCK, item: { idProduto, quantidade, quantidadeEstoque } } }
  }
  return { precoUnitario: preco }
}

exports.getPrecosUnitariosPorLote = async (arrayProdutos) => {
  // Fetch all products in one query to reduce round-trips
  const idProdutos = arrayProdutos.map(p => p.idProduto)
  const produtosEmEstoque = await datastore.find({ _id: { $in: idProdutos } })
  const produtosMap = new Map(produtosEmEstoque.map(p => [p._id, p]))

  // Validate each product and build result
  for (let i = 0; i < arrayProdutos.length; i++) {
    const produto = arrayProdutos[i]
    const quantidade = parseInt(produto.quantidade)
    const { idProduto } = produto

    const produtoEmEstoque = produtosMap.get(idProduto)
    if (!produtoEmEstoque) {
      return { error: { statusCode: 400, message: constant.PRODUCT_NOT_FOUND, item: { idProduto, quantidade }, index: i } }
    }

    if (quantidade > produtoEmEstoque.quantidade) {
      return { error: { statusCode: 400, message: constant.INSUFFICIENT_STOCK, item: { idProduto, quantidade, quantidadeEstoque: produtoEmEstoque.quantidade }, index: i } }
    }
  }

  // Build result with prices
  const produtosComPreco = arrayProdutos.map((produto, index) => ({
    ...produto,
    precoUnitario: produtosMap.get(produto.idProduto).preco
  }))

  return { produtosComPreco }
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
