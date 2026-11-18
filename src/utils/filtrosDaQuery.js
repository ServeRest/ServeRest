'use strict'

const estaEmBranco = require('./estaEmBranco')

// Só os filtros que o schema de GET da rota declara como número viram número, com Number. Os outros chegam
// à busca como foram enviados: um _id 0000000000000000 ou um nome 007 não viram 0 nem 7.
//
// O valor em branco de um campo numérico vira 0, como sempre virou, e é esse 0 que o schema valida (?preco=
// responde que preco deve ser positivo). Depois da validação ele sai da busca, como o branco dos campos de
// texto; por isso os campos que chegaram em branco ficam anotados na requisição.
exports.converterFiltrosNumericos = (schemaGet, outrosCampos = []) => {
  const campos = Object.entries(schemaGet.query.describe().keys)
    .filter(([, { type }]) => type === 'number')
    .map(([campo]) => campo)
    .concat(outrosCampos)

  return (req, res, next) => {
    req.filtrosEmBranco = campos.filter(campo => estaEmBranco(req.query[campo]))
    for (const campo of campos) {
      const numero = Number(req.query[campo])
      if (typeof req.query[campo] === 'string' && !Number.isNaN(numero)) req.query[campo] = numero
    }
    next()
  }
}

exports.tirarFiltrosEmBranco = (req, res, next) => {
  req.filtrosEmBranco.forEach(campo => delete req.query[campo])
  next()
}
