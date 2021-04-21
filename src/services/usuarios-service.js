'use strict'

const Nedb = require('nedb')
const { join } = require('path')

const alterarValoresParaRegex = require('../utils/alterarValoresParaRegex')

const datastore = new Nedb({ filename: join(__dirname, '../data/usuarios.db'), autoload: true })

exports.getAll = queryString => {
  queryString = alterarValoresParaRegex(queryString)
  return new Promise((resolve, reject) => {
    datastore.find(queryString, (err, resultado) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(resultado)
    })
  })
}

exports.getOne = id => {
  return new Promise((resolve, reject) => {
    datastore.findOne({ _id: id }, (err, usuario) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(usuario)
    })
  })
}

exports.getDadosDoUsuario = queryString => {
  return new Promise((resolve, reject) => {
    datastore.findOne(queryString, (err, resultado) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(resultado)
    })
  })
}

exports.existeUsuario = pesquisa => {
  return new Promise((resolve, reject) => {
    datastore.count(pesquisa, (err, count) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(count !== 0)
    })
  })
}

exports.usuarioEhAdministrador = ({ email, password }) => {
  return new Promise((resolve, reject) => {
    datastore.find({ email, password }, (err, resultado) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(JSON.parse(resultado[0].administrador))
    })
  })
}

exports.createUser = async body => {
  return new Promise((resolve, reject) => {
    datastore.insert(body, (err, novoUsuario) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(novoUsuario)
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

exports.createOrUpdateById = async (idDoUsuarioQueSeraAlterado, body) => {
  return new Promise((resolve, reject) => {
    datastore.update({ _id: idDoUsuarioQueSeraAlterado }, body, { upsert: true }, (err, quantidadeRegistrosAlterados, registroCriado) => {
      /* istanbul ignore if */
      if (err) reject(err)
      resolve(registroCriado)
    })
  })
}
