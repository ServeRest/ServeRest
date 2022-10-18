'use strict'

const constant = require('../utils/constants')
const service = require('../services/carrinhos-service')

exports.get = async (req, res) => {
  const carrinhos = await service.getAll(req.query)
  res.status(200).send({ quantidade: carrinhos.length, carrinhos })
}

exports.getOne = async (req, res) => {
  const { id } = req.params
  const carrinho = await service.getOne(id)
  if (!carrinho) {
    return res.status(400).json({ message: constant.CART_NOT_FOUND })
  }
  return res.status(200).send(carrinho)
}

exports.post = async (req, res) => {
  const { idUsuario, possuiCarrinho } = await service.usuarioJaPossuiCarrinho(req.headers.authorization)
  if (possuiCarrinho) {
    return res.status(400).send({ message: constant.LIMIT_JUST_ONE_CART })
  }

  const { produtos } = req.body

  const idProdutosDuplicados = service.extrairProdutosDuplicados(produtos)
  if (idProdutosDuplicados.length) {
    return res.status(400).send({ message: constant.CART_WITH_DUPLICATE_PRODUCT, idProdutosDuplicados })
  }

  const { produtosComPrecoUnitario, error } = await service.getProdutosComPrecoUnitarioOuErro(produtos)
  if (error) {
    return res.status(error.statusCode).send({ message: error.message, item: error.item })
  }
  const precoTotal = await service.precoTotal(produtosComPrecoUnitario)
  const quantidadeTotal = await service.quantidadeTotal(produtosComPrecoUnitario)

  const carrinho = { produtos: produtosComPrecoUnitario, precoTotal, quantidadeTotal, idUsuario }

  const dadosCadastrados = await service.criarCarrinho(carrinho)
  res.status(201).send({ message: constant.POST_SUCCESS, _id: dadosCadastrados._id })
}

exports.cancelarCompra = async (req, res) => {
  const carrinhoDoUsuario = await service.getCarrinhoDoUsuario(req.headers.authorization)

  if (carrinhoDoUsuario.length) {
    await service.removeCarrinho(carrinhoDoUsuario[0])
    return res.status(200).send({ message: `${constant.DELETE_SUCCESS}. ${constant.REPLENISHED_STOCK}` })
  }

  res.status(200).send({ message: constant.NO_CART })
}

exports.concluirCompra = async (req, res) => {
  const carrinhoDoUsuario = await service.getCarrinhoDoUsuario(req.headers.authorization)

  if (carrinhoDoUsuario.length) {
    await service.concluiCompra(carrinhoDoUsuario)
    return res.status(200).send({ message: constant.DELETE_SUCCESS })
  }
  res.status(200).send({ message: constant.NO_CART })
}
