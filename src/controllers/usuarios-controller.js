'use strict'

const service = require('../services/usuarios-service')
const constant = require('../utils/constants')

exports.get = async (req, res) => {
  try {
    const usuarios = await service.getAll(req.query)
    res.status(200).send({ quantidade: usuarios.length, usuarios })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}

exports.post = async (req, res) => {
  try {
    if (await service.existeUsuarioComEsseEmail(req.body.email)) {
      return res.status(400).send({ message: constant.EMAIL_JA_USADO })
    }
    const dadosCadastrados = await service.createUser(req.body)
    res.status(201).send({ message: constant.POST_SUCESS, _id: dadosCadastrados._id })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}

exports.delete = async (req, res) => {
  try {
    const quantidadeRegistrosExcluidos = await service.deleteById(req.params.id)
    const message = quantidadeRegistrosExcluidos === 0 ? constant.DELETE_NONE : constant.DELETE_SUCESS
    res.status(200).send({ message })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}

exports.put = async (req, res) => {
  try {
    const registroCriado = await service.createOrUpdateById(req.params.id, req.body)
    if (registroCriado) { return res.status(201).send({ message: constant.POST_SUCESS, _id: registroCriado._id }) }
    res.status(200).send({ message: constant.PUT_SUCESS })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}
