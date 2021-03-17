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
  const temProdutosDuplicados = typeof idProdutosDuplicados[0] !== 'undefined'
  if (temProdutosDuplicados) {
    return res.status(400).send({ message: constant.CARRINHO_COM_PRODUTO_DUPLICADO, idProdutosDuplicados })
  }

  const produtos = req.body.produtos
  for (let index = 0; index < produtos.length; index++) {
    produtos[index].quantidade = parseInt(produtos[index].quantidade)
    const { idProduto, quantidade } = produtos[index]
    if (!await produtosService.existeProduto({ _id: idProduto })) {
      return res.status(400).send({ message: constant.IDPRODUTO_INVALIDO, item: { index, idProduto, quantidade } })
    }

    const { quantidade: quantidadeEstoque, preco } = await produtosService.getDadosDoProduto({ _id: idProduto })
    if (quantidade > quantidadeEstoque) {
      return res.status(400).send({ message: constant.ESTOQUE_INSUFICIENTE, item: { index, idProduto, quantidade, quantidadeEstoque } })
    }
    Object.assign(produtos[index], { precoUnitario: preco })
  }
  let precoTotal = 0
  let quantidadeTotal = 0
  for (let index = 0; index < produtos.length; index++) {
    const { idProduto, quantidade } = produtos[index]
    const { quantidade: quantidadeEmEstoque, preco } = await produtosService.getDadosDoProduto({ _id: idProduto })
    const novaQuantidade = quantidadeEmEstoque - quantidade
    await produtosService.updateById(idProduto, { $set: { quantidade: novaQuantidade } })
    precoTotal += preco * quantidade
    quantidadeTotal += quantidade
  }

  Object.assign(req.body, { precoTotal, quantidadeTotal, idUsuario: _id })

  const dadosCadastrados = await service.criarCarrinho(req.body)
  res.status(201).send({ message: constant.POST_SUCESS, _id: dadosCadastrados._id })
}

exports.cancelarCompra = async (req, res) => {
  const carrinhoDoUsuario = await service.getCarrinhoDoUsuario(req.headers.authorization)
  const usuarioTemCarrinho = typeof carrinhoDoUsuario[0] !== 'undefined'

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
  const usuarioTemCarrinho = typeof carrinhoDoUsuario[0] !== 'undefined'
  if (usuarioTemCarrinho) {
    await service.deleteById(carrinhoDoUsuario[0]._id)
    return res.status(200).send({ message: constant.DELETE_SUCESS })
  }
  res.status(200).send({ message: constant.SEM_CARRINHO })
}
