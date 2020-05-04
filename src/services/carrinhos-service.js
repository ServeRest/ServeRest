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
  return new Promise((resolve, reject) => {
    datastore.insert(body, (err, novoProduto) => {
      if (err) reject(err)
      else resolve(novoProduto)
    })
  })
}

exports.extrairProdutosDuplicados = arrayProdutos => {
  var sorted_arr = arrayProdutos.slice().sort();
  var produtosDuplicados = [];
  for (var i = 0; i < sorted_arr.length - 1; i++) {
      if (sorted_arr[i + 1].idProduto === sorted_arr[i].idProduto) {
          produtosDuplicados.push(sorted_arr[i].idProduto);
      }
  }
  return produtosDuplicados;
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
