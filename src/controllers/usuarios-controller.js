'use strict'

const carrinhosService = require('../services/carrinhos-service')
const constant = require('../utils/constants')
const service = require('../services/usuarios-service')

exports.get = async (req, res) => {
  const usuarios = await service.getAll(req.query)
  res.status(200).send({ quantidade: usuarios.length, usuarios })
}

exports.getOne = async (req, res) => {
  const { id } = req.params
  const usuario = await service.getOne(id)
  if (!usuario) {
    return res.status(400).json({ message: constant.USER_NOT_FOUND })
  }
  const { administrador, ...resto } = usuario
  const usuarioModificado = { ...resto, adm: administrador }
  return res.status(200).send(usuarioModificado)
  // return res.status(200).send(usuario)
}

exports.post = async (req, res) => {
  if (await service.existeUsuario({ email: req.body.email })) {
    return res.status(400).send({ message: constant.EMAIL_ALREADY_USED })
  }
  const dadosCadastrados = await service.createUser(req.body)
  res.status(201).send({ message: constant.POST_SUCCESS, _id: dadosCadastrados._id })
}

exports.delete = async (req, res) => {
  const carrinhoDoUsuario = await carrinhosService.getAll({ idUsuario: req.params.id })
  const usuarioTemCarrinho = typeof carrinhoDoUsuario[0] !== 'undefined'
  if (usuarioTemCarrinho) {
    return res.status(400).send({ message: constant.DELETE_USER_WITH_CART, idCarrinho: carrinhoDoUsuario[0]._id })
  }
  const quantidadeRegistrosExcluidos = await service.deleteById(req.params.id)
  const message = quantidadeRegistrosExcluidos === 0 ? constant.DELETE_NONE : constant.DELETE_SUCCESS
  res.status(200).send({ message })
}

exports.put = async (req, res) => {
  const idInexistenteEEmailRepetido = await service.existeUsuario({ email: req.body.email, $not: { _id: req.params.id } })
  if (idInexistenteEEmailRepetido) {
    return res.status(400).send({ message: constant.EMAIL_ALREADY_USED })
  }
  const registroCriado = await service.createOrUpdateById(req.params.id, req.body)
  if (registroCriado._id !== req.params.id) { return res.status(201).send({ message: constant.POST_SUCCESS, _id: registroCriado._id }) }
  res.status(200).send({ message: constant.PUT_SUCCESS })
}
