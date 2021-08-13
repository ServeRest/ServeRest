'use strict'

const Datastore = require('nedb-promises')
const { join } = require('path')

const alterarValoresParaRegex = require('../utils/alterarValoresParaRegex')

const datastore = Datastore.create({ filename: join(__dirname, '../data/usuarios.db'), autoload: true })

exports.getAll = queryString => {
  queryString = alterarValoresParaRegex(queryString)
  return datastore.find(queryString)
}

exports.getOne = id => {
  return datastore.findOne({ _id: id })
}

exports.getDadosDoUsuario = queryString => {
  return datastore.findOne(queryString)
}

exports.existeUsuario = async pesquisa => {
  return datastore.count(pesquisa)
}

exports.usuarioEhAdministrador = async ({ email, password }) => {
  const resultado = await datastore.find({ email, password })
  return JSON.parse(resultado[0].administrador)
}

exports.createUser = async body => {
  return datastore.insert(body)
}

exports.deleteById = async id => {
  return datastore.remove({ _id: id }, {})
}

exports.createOrUpdateById = async (idDoUsuarioQueSeraAlterado, body) => {
  return datastore.update({ _id: idDoUsuarioQueSeraAlterado }, body, { upsert: true, returnUpdatedDocs: true })
}
