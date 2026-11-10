'use strict'

const express = require('express')

const authentication = require('../middlewares/authentication-middleware')
const controller = require('../controllers/carrinhos-controller')
const model = require('../models/carrinhos-model')
const validateSchema = require('../services/validateSchema-service')
const { etapa, plano } = require('../utils/etapas')

const router = express.Router()
router.get('/', plano('schema', 'read'), validateSchema(model.schemaGet), etapa('read', controller.get))
router.get('/:id', plano('schema', 'read'), validateSchema(model.schemaGetOne), etapa('read', controller.getOne))
router.post('/', plano('auth', 'schema', 'rules', 'write'), authentication.checkToken, validateSchema(model.schemaPost), etapa('rules', controller.post))
router.delete('/concluir-compra', plano('auth', 'rules'), authentication.checkToken, etapa('rules', controller.concluirCompra))
router.delete('/cancelar-compra', plano('auth', 'rules'), authentication.checkToken, etapa('rules', controller.cancelarCompra))

module.exports = router
