'use strict'

const express = require('express')

const authentication = require('../middlewares/authentication-middleware')
const controller = require('../controllers/produtos-controller')
const model = require('../models/produtos-model')
const validateSchema = require('../services/validateSchema-service')
const { etapa, plano } = require('../utils/etapas')

const router = express.Router()
router.get('/', plano('schema', 'read'), validateSchema(model.schemaGet), etapa('read', controller.get))
router.get('/:id', plano('schema', 'read'), validateSchema(model.schemaGetOne), etapa('read', controller.getOne))
router.post('/', plano('auth', 'schema', 'rules'), authentication.checkAdm, validateSchema(model.schemaPost), etapa('rules', controller.post))
router.delete('/:id', plano('auth', 'schema', 'rules'), authentication.checkAdm, validateSchema(model.schemaDelete), etapa('rules', controller.delete))
router.put('/:id', plano('auth', 'schema', 'rules'), authentication.checkAdm, validateSchema(model.schemaPut), etapa('rules', controller.put))

module.exports = router
