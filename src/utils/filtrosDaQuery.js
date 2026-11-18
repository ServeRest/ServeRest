'use strict'

const validateSchema = require('../services/validateSchema-service')
const estaEmBranco = require('./estaEmBranco')

// Só os filtros que o schema de GET da rota declara como número viram número, com Number, como o
// express-query-int fazia (inclusive 0x10 e 0b11, que a produção converte hoje). Os outros chegam à busca
// como foram enviados: um _id 0000000000000000 ou um nome 007 não viram 0 nem 7.
//
// O valor em branco de um campo numérico vira 0, como sempre virou, e é esse 0 que o schema valida (?preco=
// responde que preco deve ser positivo). Depois da validação ele sai da busca, como o branco dos campos de
// texto; por isso os campos que chegaram em branco ficam anotados na requisição.
const converterFiltrosNumericos = campos => (req, res, next) => {
  req.filtrosEmBranco = Object.fromEntries(campos.filter(campo => estaEmBranco(req.query[campo])).map(campo => [campo, true]))
  for (const campo of campos) {
    const numero = Number(req.query[campo])
    if (typeof req.query[campo] === 'string' && !Number.isNaN(numero)) req.query[campo] = numero
  }
  next()
}

// for...in sobre undefined não itera: o passo tolera uma requisição que não passou pela conversão.
const tirarFiltrosEmBranco = (req, res, next) => {
  for (const campo in req.filtrosEmBranco) delete req.query[campo]
  next()
}

// Os três passos de um GET de lista: converter, validar e tirar o branco da busca.
exports.filtrosDaLista = (schemaGet, outrosCampos = []) => {
  const campos = Object.entries(schemaGet.query.describe().keys)
    .filter(([, { type }]) => type === 'number')
    .map(([campo]) => campo)
    .concat(outrosCampos)
  return [converterFiltrosNumericos(campos), validateSchema(schemaGet), tirarFiltrosEmBranco]
}

exports.tirarFiltrosEmBranco = tirarFiltrosEmBranco
