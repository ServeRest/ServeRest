'use strict'

const Nedb = require('nedb')
const { join } = require('path')

const datastore = new Nedb({ filename: join(__dirname, '../data/produtos.db'), autoload: true })

exports.getAll = queryString => {
  return new Promise((resolve, reject) => {
    datastore.find(queryString, (err, resultado) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(resultado)
    })
  })
}

exports.getDadosDoProduto = queryString => {
  return new Promise((resolve, reject) => {
    datastore.findOne(queryString, (err, resultado) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(resultado)
    })
  })
}

exports.existeProduto = pesquisa => {
  return new Promise((resolve, reject) => {
    datastore.count(pesquisa, (err, count) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(count !== 0)
    })
  })
}

exports.criarProduto = async body => {
  body = formatarValores(body)
  return new Promise((resolve, reject) => {
    datastore.insert(body, (err, novoProduto) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(novoProduto)
    })
  })
}

exports.deleteById = async id => {
  return new Promise((resolve, reject) => {
    datastore.remove({ _id: id }, {}, (err, quantidadeRegistrosExcluidos) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(quantidadeRegistrosExcluidos)
    })
  })
}

exports.createOrUpdateById = async (idDoProdutoQueSeraAlterado, body) => {
  body = formatarValores(body)
  return this.updateById(idDoProdutoQueSeraAlterado, body)
}

exports.updateById = async (idDoProdutoQueSeraAlterado, body) => {
  return new Promise((resolve, reject) => {
    datastore.update({ _id: idDoProdutoQueSeraAlterado }, body, { upsert: true }, (err, quantidadeRegistrosAlterados, registroCriado) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(registroCriado)
    })
  })
}

function formatarValores (body) {
  body.nome = body.nome.trim()
  body.preco = parseInt(body.preco)
  body.quantidade = parseInt(body.quantidade)
  return body
}
