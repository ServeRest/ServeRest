'use strict'

const Nedb = require('nedb')
const { join } = require('path')

const datastore = new Nedb({ filename: join(__dirname, '../data/usuarios.db'), autoload: true })

exports.getAll = queryString => {
  return new Promise((resolve, reject) => {
    datastore.find(queryString, (err, resultado) => {
      if (err) reject(err)
      else resolve(resultado)
    })
  })
}

exports.existeUsuarioComEsseEmail = email => {
  return new Promise((resolve, reject) => {
    datastore.count({ email }, (err, count) => {
      if (err) reject(err)
      else resolve(count !== 0)
    })
  })
}

exports.usuarioEhAdministrador = ({ email, password }) => {
  return new Promise((resolve, reject) => {
    datastore.find({ email, password }, (err, resultado) => {
      if (err) reject(err)
      else resolve(JSON.parse(resultado[0].administrador))
    })
  })
}

exports.existeUsuarioComEsseEmailESenha = emailSenha => {
  return new Promise((resolve, reject) => {
    datastore.count(emailSenha, (err, count) => {
      if (err) reject(err)
      else resolve(count !== 0)
    })
  })
}

exports.createUser = async body => {
  return new Promise((resolve, reject) => {
    datastore.insert(body, (err, novoUsuario) => {
      if (err) reject(err)
      else resolve(novoUsuario)
    })
  })
}

exports.deleteById = async id => {
  return new Promise((resolve, reject) => {
    datastore.remove({ _id: id }, {}, (err, quantidadeRegistrosExcluidos) => {
      if (err) reject(err)
      else resolve(quantidadeRegistrosExcluidos)
    })
  })
}

exports.createOrUpdateById = async (idDoUsuarioQueSeraAlterado, body) => {
  return new Promise((resolve, reject) => {
    datastore.update({ _id: idDoUsuarioQueSeraAlterado }, body, { upsert: true }, (err, quantidadeRegistrosAlterados, registroCriado) => {
      if (err) reject(err)
      else resolve(registroCriado)
    })
  })
}
