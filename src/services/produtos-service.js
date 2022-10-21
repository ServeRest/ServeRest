'use strict'

const constant = require('../utils/constants')
const Datastore = require('nedb-promises')
const { join } = require('path')
const carrinhosService = require('../services/carrinhos-service')

const alterarValoresParaRegex = require('../utils/alterarValoresParaRegex')

const datastore = Datastore.create({ filename: join(__dirname, '../data/produtos.db'), autoload: true })

exports.getAll = queryString => {
  queryString = alterarValoresParaRegex(queryString)
  return datastore.find(queryString)
}

exports.getOne = id => {
  return datastore.findOne({ _id: id })
}

exports.getProductData = queryString => {
  return datastore.findOne(queryString)
}

exports.productExists = query => {
  return datastore.count(query)
}

exports.updateQuantity = async ({ idProduto: productId, quantidade: quantity }) => {
  const { quantidade: stockQuantity } = await this.getProductData({ _id: productId })
  const newQuantity = stockQuantity - quantity
  await this.updateById(productId, { $set: { quantidade: newQuantity } })
}

exports.createProduct = async body => {
  body = formatValues(body)
  return datastore.insert(body)
}

exports.getUnitPriceOrError = async (product) => {
  const quantity = parseInt(product.quantidade)
  const { idProduto: productId } = product
  const productExists = await this.productExists({ _id: productId })
  if (!productExists) {
    return { error: { statusCode: 400, message: constant.PRODUCT_NOT_FOUND, item: { idProduto: productId, quantidade: quantity } } }
  }

  const { quantidade: stockQuantity, preco: price } = await this.getProductData({ _id: productId })
  if (quantity > stockQuantity) {
    return { error: { statusCode: 400, message: constant.INSUFFICIENT_STOCK, item: { idProduto: productId, quantidade: quantity, quantidadeEstoque: stockQuantity } } }
  }
  return { precoUnitario: price }
}

exports.getAllCartsWithProduct = productId => {
  return carrinhosService.getAll({ produtos: { $elemMatch: { idProduto: productId } } })
}

exports.deleteProductOrError = async productId => {
  const cartsWithProduct = await this.getAllCartsWithProduct(productId)
  if (cartsWithProduct.length) {
    const cartsIds = cartsWithProduct.map((cart) => cart._id)
    return { error: { message: constant.DELETE_PRODUCT_WITH_CART, idCarrinhos: cartsIds } }
  }
  const totalOfDeletedRegisters = await this.deleteById(productId)
  return { message: totalOfDeletedRegisters === 0 ? constant.DELETE_NONE : constant.DELETE_SUCCESS }
}

exports.deleteById = async id => {
  return datastore.remove({ _id: id }, {})
}

exports.createOrUpdateById = async (productToBeUpdatedId, body) => {
  body = formatValues(body)
  return this.updateById(productToBeUpdatedId, body)
}

exports.updateById = async (productToBeUpdatedId, body) => {
  return datastore.update({ _id: productToBeUpdatedId }, body, { upsert: true, returnUpdatedDocs: true })
}

function formatValues (body) {
  body.nome = body.nome.trim()
  body.preco = parseInt(body.preco)
  body.quantidade = parseInt(body.quantidade)
  if (body.imagem) {
    body.imagem = body.imagem.trim()
  }
  return body
}
