'use strict'

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
  if (await service.existeProduto({ nome: req.body.nome.trim() })) {
    return res.status(400).send({ message: constant.NAME_ALREADY_USED })
  }
  const dadosCadastrados = await service.criarProduto(req.body)
  res.status(201).send({ message: constant.POST_SUCCESS, _id: dadosCadastrados._id })
}

exports.delete = async (req, res) => {
  const { message, error } = await service.deletaProdutoOuErro(req.params.id)
  if (error) {
    return res.status(400).send(error)
  }
  return res.status(200).send({ message })
}

exports.put = async (req, res) => {
  const idInexistenteENomeRepetido = await service.existeProduto({ nome: req.body.nome.trim(), $not: { _id: req.params.id } })
  if (idInexistenteENomeRepetido) {
    return res.status(400).send({ message: constant.NAME_ALREADY_USED })
  }
  const registroCriado = await service.createOrUpdateById(req.params.id, req.body)
  if (registroCriado._id !== req.params.id) { return res.status(201).send({ message: constant.POST_SUCCESS, _id: registroCriado._id }) }
  res.status(200).send({ message: constant.PUT_SUCCESS })
}
