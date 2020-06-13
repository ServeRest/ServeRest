'use strict'

const authService = require('../services/auth-service')
const constant = require('../utils/constants')
const { conf } = require('../utils/conf')
const usuariosService = require('../services/usuarios-service')

exports.post = async (req, res) => {
  try {
    if (await usuariosService.existeUsuario(req.body)) {
      const token = authService.createToken(req.body)
      /* istanbul ignore next */
      const authorization = conf.semBearer ? token : `Bearer ${token}`
      return res.status(200).send({ message: constant.LOGIN_SUCESS, authorization })
    }
    res.status(401).send({ message: constant.LOGIN_FAIL })
  } catch (error) {
    /* istanbul ignore next */
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}
