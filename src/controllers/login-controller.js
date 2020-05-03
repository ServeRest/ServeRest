'use strict'

const authService = require('../services/auth-service')
const usuariosService = require('../services/usuarios-service')
const constant = require('../utils/constants')

exports.post = async (req, res) => {
  try {
    if (await usuariosService.existeUsuario(req.body)) {
      const token = authService.createToken(req.body)
      return res.status(200).send({ message: constant.LOGIN_SUCESS, authorization: `Bearer ${token}` })
    }
    res.status(401).send({ message: constant.LOGIN_FAIL })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}
