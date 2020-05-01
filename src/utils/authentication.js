'use strict'

const { verifyToken } = require('./utils/token.js')

function autenticacao (req, res) {
  if (req.headers.authorization === undefined) {
    res.status(401).json({ message: 'Autenticação necessária' })
    return
  }
  if (req.headers.authorization.split(' ')[0] !== 'Bearer') {
    res.status(401).json({ message: 'Tipo de autenticação deve ser Bearer' })
    return
  }
  const token = req.headers.authorization.split(' ')[1]
  if (token === undefined) {
    res.status(401).json({ message: 'Token de acesso vazio' })
    return
  }
  if (verifyToken(token) instanceof Error) {
    res.status(401).json({ message: 'Token de acesso não é válido' })
  }
}

module.exports = {
  autenticacao
}
