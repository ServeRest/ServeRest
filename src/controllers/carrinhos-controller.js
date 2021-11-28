'use strict'

const authService = require('../services/auth-service')
const constant = require('../utils/constants')
const produtosService = require('../services/produtos-service')
const service = require('../services/carrinhos-service')
const usuariosService = require('../services/usuarios-service')

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
  const { email, password } = authService.verifyToken(req.headers.authorization)
  const { _id } = await usuariosService.getDadosDoUsuario({ email, password })
  const usuarioJaPossuiCarrinho = await service.existeCarrinho({ idUsuario: _id })
  if (usuarioJaPossuiCarrinho) {
    return res.status(400).send({ message: constant.LIMITE_1_CARRINHO })
  }

  const idProdutosDuplicados = service.extrairProdutosDuplicados(req.body.produtos)
  const temProdutosDuplicados = isNotUndefined(idProdutosDuplicados[0])
  if (temProdutosDuplicados) {
    return res.status(400).send({ message: constant.CARRINHO_COM_PRODUTO_DUPLICADO, idProdutosDuplicados })
  }

  const produtosDoCarrinho = req.body.produtos
  const produtosComPrecoUnitario = []
  for (let index = 0; index < produtosDoCarrinho.length; index++) {
    const { precoUnitario: preco, error } = await getPrecoUnitarioOuErro(produtosDoCarrinho[index])
    if (error) {
      const item = { ...error.item, index }
      return res.status(error.statusCode).send({ message: error.message, item })
    }
    produtosComPrecoUnitario.push({ ...produtosDoCarrinho[index], precoUnitario: preco })
  }
  let precoTotal = 0
  let quantidadeTotal = 0
  for (let index = 0; index < produtosComPrecoUnitario.length; index++) {
    const { quantidade, preco } = await getQuantidadeEPreco(produtosComPrecoUnitario[index])
    precoTotal += preco * quantidade
    quantidadeTotal += quantidade
  }

  const carrinho = { produtos: produtosComPrecoUnitario, precoTotal, quantidadeTotal, idUsuario: _id }

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

const getQuantidadeEPreco = async (produto) => {
  const { idProduto, quantidade } = produto
  const { quantidade: quantidadeEmEstoque, preco } = await produtosService.getDadosDoProduto({ _id: idProduto })
  const novaQuantidade = quantidadeEmEstoque - quantidade
  await produtosService.updateById(idProduto, { $set: { quantidade: novaQuantidade } })
  return { quantidade, preco }
}

const getPrecoUnitarioOuErro = async (produto) => {
  // confirmando que a quantidade é um número
  const quantidade = parseInt(produto.quantidade)
  const { idProduto } = produto
  const existePedido = await existeProduto(produto.idProduto)
  if (!existePedido) {
    return { error: { statusCode: 400, message: constant.IDPRODUTO_INVALIDO, item: { idProduto, quantidade } } }
  }

  const { quantidade: quantidadeEstoque, preco } = await produtosService.getDadosDoProduto({ _id: idProduto })
  if (quantidade > quantidadeEstoque) {
    return { error: { statusCode: 400, message: constant.ESTOQUE_INSUFICIENTE, item: { idProduto, quantidade, quantidadeEstoque } } }
  }
  return { precoUnitario: preco }
}

const existeProduto = (idProduto) => {
  return produtosService.existeProduto({ _id: idProduto })
}
