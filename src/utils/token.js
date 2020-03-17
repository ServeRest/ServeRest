'use strict'

const jwt = require('jsonwebtoken')

const { conf } = require('../conf.js')

const SECRET_KEY = '123456789'

function createToken (payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: conf.tokenTimeout })
}

function verifyToken (token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) => (decode !== undefined ? decode : err))
}

module.exports = { createToken, verifyToken }
