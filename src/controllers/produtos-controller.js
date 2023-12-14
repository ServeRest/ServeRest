'use strict'

const carrinhosService = require('../services/carrinhos-service')
const constant = require('../utils/constants')
const service = require('../services/produtos-service')

exports.get = async (req, res) => {
  const produtos = await service.getAll(req.query)
  res.status(200).send({ quantidade: produtos.length, produtos })
}

exports.getOne = async (req, res) => {
  const { id } = req.params
  const produto = await service.getOne(id)
  if (!produto) {
    return res.status(400).json({ message: constant.PRODUCT_NOT_FOUND })
  }
  return res.status(200).send(produto)
}

exports.post = async (req, res) => {
  const { nome } = req.body
  const trimmedName = nome.trim()

  const productExists = await service.existeProduto({ nome: trimmedName })

  if (productExists) {
    return res.status(400).send({ message: constant.NAME_ALREADY_USED })
  }

  const { _id } = await service.criarProduto(req.body)

  res.status(201).send({ message: constant.POST_SUCCESS, _id })
}

exports.delete = async (req, res) => {
  const carrinhoDoUsuario = await carrinhosService.getAll({ produtos: { $elemMatch: { idProduto: req.params.id } } })
  const usuarioTemCarrinho = carrinhoDoUsuario.length > 0
  if (usuarioTemCarrinho) {
    const idCarrinhos = carrinhoDoUsuario.map(carrinhos => carrinhos._id)
    return res.status(400).send({ message: constant.DELETE_PRODUCT_WITH_CART, idCarrinhos })
  }
  const quantidadeRegistrosExcluidos = await service.deleteById(req.params.id)
  const message = quantidadeRegistrosExcluidos === 0 ? constant.DELETE_NONE : constant.DELETE_SUCCESS
  res.status(200).send({ message })
}

exports.put = async (req, res) => {
  const { id } = req.params
  const { nome } = req.body
  const product = { nome: nome.trim(), $not: { _id: id } }

  const productExists = await service.existeProduto(product)

  if (productExists) {
    return res.status(400).json({ message: constant.NAME_ALREADY_USED })
  }

  const updatedProduct = await service.createOrUpdateById(id, req.body)
  if (updatedProduct._id !== id) {
    return res.status(201).json({ message: constant.POST_SUCCESS, _id: updatedProduct._id })
  }

  return res.status(200).json({ message: constant.PUT_SUCCESS })
}
