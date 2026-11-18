'use strict'

const jwt = require('jsonwebtoken')
const { randomBytes } = require('crypto')

const { conf } = require('../utils/conf')

const configuredSecret = process.env.JWT_SECRET
// Reject the former public signing key when it is explicitly configured.
const legacySecret = 'f5b99242-6504-4ca3-90f2-05e78e5761ef'
if (configuredSecret !== undefined &&
    (!configuredSecret.trim() || Buffer.byteLength(configuredSecret, 'utf8') < 32 || configuredSecret === legacySecret)) {
  throw new Error('JWT_SECRET must be at least 32 bytes and must not be the former public key')
}
const signingKey = configuredSecret === undefined ? randomBytes(32) : configuredSecret
if (configuredSecret === undefined) {
  console.warn('JWT_SECRET is not set; tokens will not be shared across restarts or instances.')
}

function createToken (emailSenha) {
  return jwt.sign(emailSenha, signingKey, { expiresIn: `${conf.tokenTimeout}s` })
}

function verifyToken (authorization) {
  /* istanbul ignore next */
  return jwt.verify(authorization.split(' ')[1], signingKey, (err, decode) => (decode === undefined ? err : decode))
}

module.exports = {
  createToken,
  verifyToken
}
