'use strict'

const jwt = require('jsonwebtoken')

const PRIVATE_KEY = 'f5b99242-6504-4ca3-90f2-05e78e5761ef'

function createToken (emailSenha) {
  return jwt.sign(emailSenha, PRIVATE_KEY, { noTimestamp: true }, { expiresIn: '1000ms' })
}

function verifyToken (token) {
  return jwt.verify(token, PRIVATE_KEY, (err, decode) => (decode !== undefined ? decode : err))
}

module.exports = {
  createToken,
  verifyToken
}
