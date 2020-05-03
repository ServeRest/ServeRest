'use strict'

const authService = require('../services/auth-service')
const constant = require('../utils/constants')
const usuariosService = require('../services/usuarios-service')
const { tokenValido } = require('../utils/authentication')

exports.checkAdm = async (req, res, next) => {
  try {
    if (!tokenValido(req.headers)) {
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
    if (!tokenValido(req.headers)) {
      return res.status(401).send({ message: constant.TOKEN_INVALID })
    }
    next()
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}
