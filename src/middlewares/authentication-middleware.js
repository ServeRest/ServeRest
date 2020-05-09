'use strict'

const authService = require('../services/auth-service')
const constant = require('../utils/constants')
const usuariosService = require('../services/usuarios-service')

exports.checkAdm = async (req, res, next) => {
  try {
    if (!await tokenValido(req.headers)) {
      return res.status(401).send({ message: constant.TOKEN_INVALID })
    }
    const tokenDecodificado = authService.verifyToken(req.headers.authorization)
    if (!await usuariosService.usuarioEhAdministrador(tokenDecodificado)) {
      return res.status(403).send({ message: constant.NECESSARIO_ADM })
    }
    next()
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}

exports.checkToken = async (req, res, next) => {
  try {
    if (!await tokenValido(req.headers)) {
      return res.status(401).send({ message: constant.TOKEN_INVALID })
    }
    next()
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}

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

  return usuariosService.existeUsuario({ email: tokenDecodificado.email, password: tokenDecodificado.password })
}
