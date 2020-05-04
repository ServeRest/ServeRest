'use strict'

const carrinhosService = require('../services/carrinhos-service')
const constant = require('../utils/constants')
const service = require('../services/produtos-service')

exports.get = async (req, res) => {
  try {
    const produtos = await service.getAll(req.query)
    res.status(200).send({ quantidade: produtos.length, produtos })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}

exports.post = async (req, res) => {
  try {
    if (await service.existeProduto({ nome: req.body.nome.trim() })) {
      return res.status(400).send({ message: constant.NOME_JA_USADO })
    }
    const dadosCadastrados = await service.criarProduto(req.body)
    res.status(201).send({ message: constant.POST_SUCESS, _id: dadosCadastrados._id })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}

exports.delete = async (req, res) => {
  try {
    const carrinhoDoUsuario = await carrinhosService.getAll({ produtos: { $elemMatch: { idproduto: req.params.id } } })
    const usuarioTemCarrinho = typeof carrinhoDoUsuario[0] !== 'undefined'
    if (usuarioTemCarrinho) {
      const idcarrinhos = carrinhoDoUsuario.map((carrinhos) => { return carrinhos._id })
      return res.status(400).send({ message: constant.EXCLUIR_PRODUTO_COM_CARRINHO, idcarrinhos })
    }
    const quantidadeRegistrosExcluidos = await service.deleteById(req.params.id)
    const message = quantidadeRegistrosExcluidos === 0 ? constant.DELETE_NONE : constant.DELETE_SUCESS
    res.status(200).send({ message })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}

exports.put = async (req, res) => {
  try {
    const idInexistenteENomeRepetido = await service.existeProduto({ nome: req.body.nome.trim(), $not: { _id: req.params.id } })
    if (idInexistenteENomeRepetido) {
      return res.status(400).send({ message: constant.NOME_JA_USADO })
    }
    const registroCriado = await service.createOrUpdateById(req.params.id, req.body)
    if (registroCriado) { return res.status(201).send({ message: constant.POST_SUCESS, _id: registroCriado._id }) }
    res.status(200).send({ message: constant.PUT_SUCESS })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}
