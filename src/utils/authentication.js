'use strict'

const authService = require('../services/auth-service')

function tokenValido ({ authorization }) {
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

  return true
}

module.exports = {
  tokenValido
}
