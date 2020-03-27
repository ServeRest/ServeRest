'use strict'

const fs = require('fs')
const { join } = require('path')

const { readUserFile } = require('../utils/readWriteFiles.js')
const { createToken } = require('../utils/token.js')

const dirUsersJson = join(__dirname, '../../data/users.json')

function emailIsValid (email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function emailAlreadyExist (email) {
  return readUserFile().users.findIndex(user => user.email === email) !== -1
}

function validarEmailESenha (email, password) {
  if (!email || !password) {
    return 'Email ou password em branco'
  }

  if (!emailIsValid(email)) {
    return 'Email inválido'
  }

  if (emailAlreadyExist(email)) {
    return 'Email já cadastrado'
  }

  return false
}

function cadastrarUsuario (email, password) {
  fs.readFile(dirUsersJson, 'utf-8', (err, data) => {
    if (err) {
      throw new Error(err)
    }
    data = JSON.parse(data.toString())
    data.users.push({ id: data.users.length + 1, email, password })
    fs.writeFile(dirUsersJson, JSON.stringify(data, null, '  '), 'utf-8', err => {
      if (err) {
        throw new Error(err)
      }
    })
  })
}

module.exports = function registrar (request, response) {
  const { email, password } = request.body

  const emailESenhaValido = validarEmailESenha(email, password)
  if (emailESenhaValido) {
    response.status(400).json({ message: emailESenhaValido })
    return
  }

  cadastrarUsuario(email, password)

  response.status(201).json({ token: createToken({ email, password }) })
}
