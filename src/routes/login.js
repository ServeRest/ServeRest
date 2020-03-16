'use strict'

const printDebugInfoOnConsole = require('../utils/debug')
const { readUserFile } = require('../utils/readWriteFiles.js')
const { createToken } = require('../utils/token.js')

module.exports = function login (req, res) {
  printDebugInfoOnConsole(req)
  const { email, password } = req.body
  const existEmailAndPassword =
    readUserFile().users.findIndex(user => user.email === email && user.password === password) !== -1
  if (!existEmailAndPassword) {
    res.status(400).json({ message: 'Email ou password incorreto' })
    return
  }
  const token = createToken({ email, password })
  res.status(200).json({ token })
}
