'use strict'

const jwt = require('jsonwebtoken')

const { conf } = require('../conf')

const PRIVATE_KEY = 'f5b99242-6504-4ca3-90f2-05e78e5761ef'

function createToken (emailSenha) {
  return jwt.sign(emailSenha, PRIVATE_KEY, { expiresIn: `${conf.tokenTimeout}ms` })
}

function verifyToken (authorization) {
  return jwt.verify(authorization.split(' ')[1], PRIVATE_KEY, (err, decode) => (decode === undefined ? err : decode))
}

module.exports = {
  createToken,
  verifyToken
}
