'use strict'

const fs = require('fs')

const printDebugInfoOnConsole = require('../utils/debug.js')
const { readUserFile } = require('../utils/readWriteFiles.js')
const { createToken } = require('../utils/token.js')

module.exports = function registrar (req, res) {
  printDebugInfoOnConsole(req)
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ message: 'Email ou password em branco' })
    return
  }

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  if (!emailIsValid) {
    res.status(400).json({ message: 'Email inválido' })
    return
  }

  const emailAlreadyExist = readUserFile().users.findIndex(user => user.email === email) !== -1

  if (emailAlreadyExist) {
    res.status(400).json({ message: 'Email já cadastrado' })
    return
  }

  fs.readFile('./data/users.json', 'utf-8', (err, data) => {
    if (err) {
      res.status(500).json({ err })
      return
    }
    data = JSON.parse(data.toString())
    data.users.push({ id: data.users.length + 1, email: email, password: password })
    fs.writeFile('./data/users.json', JSON.stringify(data, null, '  '), 'utf-8', err => {
      if (err) {
        res.status(500).json({ err })
      }
    })
  })

  const token = createToken({ email, password })
  res.status(201).json({ token })
}
