'use strict'

const Nedb = require('nedb')
const { join } = require('path')

const datastore = new Nedb({ filename: join(__dirname, '../data/carrinhos.db'), autoload: true })

exports.getAll = queryString => {
  return new Promise((resolve, reject) => {
    datastore.find(queryString, (err, resultado) => {
      if (err) reject(err)
      else resolve(resultado)
    })
  })
}

exports.existeCarrinho = pesquisa => {
  return new Promise((resolve, reject) => {
    datastore.count(pesquisa, (err, count) => {
      if (err) reject(err)
      else resolve(count !== 0)
    })
  })
}

exports.criarCarrinho = async body => {
  // body = formatarValores(body)
  return new Promise((resolve, reject) => {
    datastore.insert(body, (err, novoProduto) => {
      if (err) reject(err)
      else resolve(novoProduto)
    })
  })
}

// exports.deleteById = async id => {
//   return new Promise((resolve, reject) => {
//     datastore.remove({ _id: id }, {}, (err, quantidadeRegistrosExcluidos) => {
//       if (err) reject(err)
//       else resolve(quantidadeRegistrosExcluidos)
//     })
//   })
// }

// exports.createOrUpdateById = async (idDoUsuarioQueSeraAlterado, body) => {
//   body = formatarValores(body)
//   return new Promise((resolve, reject) => {
//     datastore.update({ _id: idDoUsuarioQueSeraAlterado }, body, { upsert: true }, (err, quantidadeRegistrosAlterados, registroCriado) => {
//       if (err) reject(err)
//       else resolve(registroCriado)
//     })
//   })
// }

// function formatarValores (body) {
//   body.nome = body.nome.trim()
//   body.preco = parseInt(body.preco)
//   body.quantidade = parseInt(body.quantidade)
//   return body
// }
