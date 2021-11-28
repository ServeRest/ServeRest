'use strict'

const constant = require('../utils/constants')
const produtosService = require('../services/produtos-service')
const service = require('../services/carrinhos-service')

exports.get = async (req, res) => {
  const carrinhos = await service.getAll(req.query)
  res.status(200).send({ quantidade: carrinhos.length, carrinhos })
}

exports.getOne = async (req, res) => {
  const { id } = req.params
  const carrinho = await service.getOne(id)
  if (!carrinho) {
    return res.status(400).json({ message: constant.CARRINHO_NAO_ENCONTRADO })
  }
  return res.status(200).send(carrinho)
}

exports.post = async (req, res) => {
  const { idUsuario, possuiCarrinho } = await service.usuarioJaPossuiCarrinho(req.headers.authorization)
  if (possuiCarrinho) {
    return res.status(400).send({ message: constant.LIMITE_1_CARRINHO })
  }

  const idProdutosDuplicados = service.extrairProdutosDuplicados(req.body.produtos)
  const temProdutosDuplicados = isNotUndefined(idProdutosDuplicados[0])
  if (temProdutosDuplicados) {
    return res.status(400).send({ message: constant.CARRINHO_COM_PRODUTO_DUPLICADO, idProdutosDuplicados })
  }

  const { produtos } = req.body
  const produtosComPrecoUnitario = []
  for (const produto of produtos) {
    const { precoUnitario: preco, error } = await produtosService.getPrecoUnitarioOuErro(produto)
    if (error) {
      const index = produtos.indexOf(produto)
      const item = { ...error.item, index }
      return res.status(error.statusCode).send({ message: error.message, item })
    }
    produtosComPrecoUnitario.push({ ...produto, precoUnitario: preco })
  }
  const precoTotal = await service.precoTotal(produtosComPrecoUnitario)
  const quantidadeTotal = await service.quantidadeTotal(produtosComPrecoUnitario)

  const carrinho = { produtos: produtosComPrecoUnitario, precoTotal, quantidadeTotal, idUsuario }

  const dadosCadastrados = await service.criarCarrinho(carrinho)
  res.status(201).send({ message: constant.POST_SUCESS, _id: dadosCadastrados._id })
}

exports.cancelarCompra = async (req, res) => {
  const carrinhoDoUsuario = await service.getCarrinhoDoUsuario(req.headers.authorization)
  const usuarioTemCarrinho = isNotUndefined(carrinhoDoUsuario[0])

  if (usuarioTemCarrinho) {
    const produtos = carrinhoDoUsuario[0].produtos

    produtos.forEach(async (produto) => {
      const { idProduto, quantidade } = produto
      const { quantidade: quantidadeEmEstoque } = await produtosService.getDadosDoProduto({ _id: idProduto })
      await produtosService.updateById(idProduto, { $set: { quantidade: quantidadeEmEstoque + quantidade } })
    })

    await service.deleteById(carrinhoDoUsuario[0]._id)
    return res.status(200).send({ message: `${constant.DELETE_SUCESS}. ${constant.ESTOQUE_REABASTECIDO}` })
  }

  res.status(200).send({ message: constant.SEM_CARRINHO })
}

exports.concluirCompra = async (req, res) => {
  const carrinhoDoUsuario = await service.getCarrinhoDoUsuario(req.headers.authorization)
  const usuarioTemCarrinho = isNotUndefined(carrinhoDoUsuario[0])
  if (usuarioTemCarrinho) {
    await service.deleteById(carrinhoDoUsuario[0]._id)
    return res.status(200).send({ message: constant.DELETE_SUCESS })
  }
  res.status(200).send({ message: constant.SEM_CARRINHO })
}

const isUndefined = (object) => typeof object === 'undefined'

const isNotUndefined = (object) => !isUndefined(object)
