'use strict'

const queryParser = require('express-query-int')

const carrinhos = require('../models/carrinhos-model')
const produtos = require('../models/produtos-model')
const usuarios = require('../models/usuarios-model')

// Só os filtros que o schema de GET declara como número viram número. Sem isso o express-query-int converte
// todo valor que o Number aceita, e um _id como 0000000000000000 ou um nome 007 chegavam à busca como 0 e 7.
const camposNumericos = [carrinhos, produtos, usuarios].flatMap(({ schemaGet }) =>
  Object.entries(schemaGet.query.describe().keys)
    .filter(([, { type }]) => type === 'number')
    .map(([campo]) => campo))
// O email fica só para manter a resposta de hoje a ?email=123 ("email deve ser uma string"), até ela mudar.
const FILTROS_CONVERTIDOS = new Set([...camposNumericos, 'email'])

const converter = queryParser({ parser: (valor, base, campo) => FILTROS_CONVERTIDOS.has(campo) ? Number(valor) : NaN })

// O valor em branco (?quantidade=, ?quantidade=%20) vira 0 nos campos convertidos, e é esse 0 que o schema
// valida, como sempre foi: ?preco= responde que preco deve ser positivo. Depois da validação ele precisa sair da
// busca como sai o vazio dos campos de texto, mas já não dá para distinguir esse 0 de um ?quantidade=0. Por isso
// os campos que chegaram em branco ficam guardados, presos ao objeto da query.
const emBranco = new WeakMap()

exports.converterFiltrosNumericos = (req, res, next) => {
  const campos = Object.keys(req.query).filter(campo =>
    FILTROS_CONVERTIDOS.has(campo) && typeof req.query[campo] === 'string' && req.query[campo].trim() === '')
  converter(req, res, () => {
    emBranco.set(req.query, new Set(campos))
    next()
  })
}

exports.chegouEmBranco = (query, campo) => Boolean(emBranco.get(query)?.has(campo))

exports.FILTROS_CONVERTIDOS = FILTROS_CONVERTIDOS
