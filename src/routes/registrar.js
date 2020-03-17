'use strict'

const fs = require('fs')
const { join } = require('path')

const { readUserFile } = require('../utils/readWriteFiles.js')
const { createToken } = require('../utils/token.js')

const dirUsersJson = join(__dirname, '../../data/users.json')

module.exports = function registrar (req, res) {
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

  fs.readFile(dirUsersJson, 'utf-8', (err, data) => {
    if (err) {
      res.status(500).json({ err })
      return
    }
    data = JSON.parse(data.toString())
    data.users.push({ id: data.users.length + 1, email: email, password: password })
    fs.writeFile(dirUsersJson, JSON.stringify(data, null, '  '), 'utf-8', err => {
      if (err) {
        res.status(500).json({ err })
      }
    })
  })

  const token = createToken({ email, password })
  res.status(201).json({ token })
}
