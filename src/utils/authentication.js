'use strict'

const authService = require('../services/auth-service')
const { existeUsuario } = require('../services/usuarios-service')

async function tokenValido ({ authorization }) {
  if (authorization === undefined) return false

  const semBearer = authorization.split(' ')[0] !== 'Bearer'
  const semToken = authorization.split(' ')[1] === undefined

  if (semBearer || semToken) {
    return false
  }

  const tokenDecodificado = authService.verifyToken(authorization)
  if (tokenDecodificado.email === undefined || tokenDecodificado.password === undefined) {
    return false
  }

  return existeUsuario({ email: tokenDecodificado.email, password: tokenDecodificado.password })
}

module.exports = {
  tokenValido
}
