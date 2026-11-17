'use strict'

const Datastore = require('nedb-promises')
const { join } = require('path')

const alterarValoresParaRegex = require('../utils/alterarValoresParaRegex')
const { doMaisNovoAoMaisAntigo, marcarAlteracao, semMarca } = require('../utils/ordemDeAlteracao')

const datastore = Datastore.create({ filename: join(__dirname, '../data/usuarios.db'), autoload: true })

// Index frequently searched fields for better query performance
/* istanbul ignore next */
datastore.ensureIndex({ fieldName: 'email', sparse: true })

exports.getAll = async queryString => {
  queryString = alterarValoresParaRegex(queryString)
  return doMaisNovoAoMaisAntigo(await datastore.find(queryString))
}

exports.getOne = async id => {
  return semMarca(await datastore.findOne({ _id: id }))
}

exports.getDadosDoUsuario = queryString => {
  return datastore.findOne(queryString)
}

exports.existeUsuario = async pesquisa => {
  return datastore.findOne(pesquisa)
}

exports.usuarioEhAdministrador = async ({ email, password }) => {
  const resultado = await datastore.findOne({ email, password })
  return JSON.parse(resultado.administrador)
}

exports.createUser = async body => {
  return datastore.insert({ ...body, alteradoEm: marcarAlteracao() })
}

exports.deleteById = async id => {
  return datastore.remove({ _id: id }, {})
}

exports.createOrUpdateById = async (idDoUsuarioQueSeraAlterado, body) => {
  return datastore.update({ _id: idDoUsuarioQueSeraAlterado }, { ...body, alteradoEm: marcarAlteracao() }, { upsert: true, returnUpdatedDocs: true })
}
