'use strict'

const jwt = require('jsonwebtoken')

const { conf } = require('../conf.js')

const SECRET_KEY = 'f5b99242-6504-4ca3-90f2-05e78e5761ef'

function createToken (payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: `${conf.tokenTimeout}ms` })
}

function verifyToken (token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) => (decode !== undefined ? decode : err))
}

module.exports = { createToken, verifyToken }
