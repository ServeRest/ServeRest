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
    return res.status(400).json({ message: constant.PRODUTO_NAO_ENCONTRADO })
  }
  return res.status(200).send(produto)
}

exports.post = async (req, res) => {
  if (await service.existeProduto({ nome: req.body.nome.trim() })) {
    return res.status(400).send({ message: constant.NOME_JA_USADO })
  }
  const dadosCadastrados = await service.criarProduto(req.body)
  res.status(201).send({ message: constant.POST_SUCESS, _id: dadosCadastrados._id })
}

exports.delete = async (req, res) => {
  const carrinhoDoUsuario = await carrinhosService.getAll({ produtos: { $elemMatch: { idProduto: req.params.id } } })
  const usuarioTemCarrinho = typeof carrinhoDoUsuario[0] !== 'undefined'
  if (usuarioTemCarrinho) {
    const idCarrinhos = carrinhoDoUsuario.map((carrinhos) => { return carrinhos._id })
    return res.status(400).send({ message: constant.EXCLUIR_PRODUTO_COM_CARRINHO, idCarrinhos })
  }
  const quantidadeRegistrosExcluidos = await service.deleteById(req.params.id)
  const message = quantidadeRegistrosExcluidos === 0 ? constant.DELETE_NONE : constant.DELETE_SUCESS
  res.status(200).send({ message })
}

exports.put = async (req, res) => {
  const idInexistenteENomeRepetido = await service.existeProduto({ nome: req.body.nome.trim(), $not: { _id: req.params.id } })
  if (idInexistenteENomeRepetido) {
    return res.status(400).send({ message: constant.NOME_JA_USADO })
  }
  const registroCriado = await service.createOrUpdateById(req.params.id, req.body)
  if (registroCriado._id !== req.params.id) { return res.status(201).send({ message: constant.POST_SUCESS, _id: registroCriado._id }) }
  res.status(200).send({ message: constant.PUT_SUCESS })
}
