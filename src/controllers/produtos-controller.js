'use strict'

const constant = require('../utils/constants')
const service = require('../services/produtos-service')

exports.get = async (req, res) => {
  const products = await service.getAll(req.query)
  res.status(200).send({ quantidade: products.length, produtos: products })
}

exports.getOne = async (req, res) => {
  const { id } = req.params
  const product = await service.getOne(id)
  if (!product) {
    return res.status(400).json({ message: constant.PRODUCT_NOT_FOUND })
  }
  return res.status(200).send(product)
}

exports.post = async (req, res) => {
  if (await service.productExists({ nome: req.body.nome.trim() })) {
    return res.status(400).send({ message: constant.NAME_ALREADY_USED })
  }
  const createdProduct = await service.createProduct(req.body)
  res.status(201).send({ message: constant.POST_SUCCESS, _id: createdProduct._id })
}

exports.delete = async (req, res) => {
  const { message, error } = await service.deleteProductOrError(req.params.id)
  if (error) {
    return res.status(400).send(error)
  }
  return res.status(200).send({ message })
}

exports.put = async (req, res) => {
  const nonExistentIdAndRepeteadName = await service.productExists({ nome: req.body.nome.trim(), $not: { _id: req.params.id } })
  if (nonExistentIdAndRepeteadName) {
    return res.status(400).send({ message: constant.NAME_ALREADY_USED })
  }
  const createdOrUpdatedProduct = await service.createOrUpdateById(req.params.id, req.body)
  if (createdOrUpdatedProduct._id !== req.params.id) { return res.status(201).send({ message: constant.POST_SUCCESS, _id: createdOrUpdatedProduct._id }) }
  res.status(200).send({ message: constant.PUT_SUCCESS })
}
