'use strict'

const { TokenExpiredError } = require('jsonwebtoken')

const authService = require('../services/auth-service')
const constant = require('../utils/constants')
const usuariosService = require('../services/usuarios-service')
const { etapa } = require('../utils/etapas')

exports.checkAdm = etapa('auth', async (req, res, next) => {
  const motivo = await motivoDoTokenInvalido(req.headers)
  if (motivo) {
    res.locals.etapas.detalhar({ reason: motivo })
    return res.status(401).send({ message: constant.INVALID_TOKEN })
  }
  const tokenDecodificado = authService.verifyToken(req.headers.authorization)
  if (!await usuariosService.usuarioEhAdministrador(tokenDecodificado)) {
    res.locals.etapas.detalhar({ reason: 'not_admin' })
    return res.status(403).send({ message: constant.REQUIRED_ADMIN })
  }
  next()
})

exports.checkToken = etapa('auth', async (req, res, next) => {
  const motivo = await motivoDoTokenInvalido(req.headers)
  if (motivo) {
    res.locals.etapas.detalhar({ reason: motivo })
    return res.status(401).send({ message: constant.INVALID_TOKEN })
  }
  next()
})

async function motivoDoTokenInvalido ({ authorization }) {
  if (authorization === undefined) return 'token_missing'

  const [tipo, token] = authorization.split(' ')
  if (tipo !== 'Bearer' || !token) return 'bad_format'

  const tokenDecodificado = authService.verifyToken(authorization)
  if (tokenDecodificado instanceof TokenExpiredError) return 'token_expired'
  if (tokenDecodificado.email === undefined) return 'token_invalid'

  const usuario = await usuariosService.existeUsuario({ email: tokenDecodificado.email, password: tokenDecodificado.password })
  if (!usuario) return 'user_not_found'
}
