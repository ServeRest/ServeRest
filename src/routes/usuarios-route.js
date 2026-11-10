'use strict'

const express = require('express')

const controller = require('../controllers/usuarios-controller')
const model = require('../models/usuarios-model')
const validateSchema = require('../services/validateSchema-service')
const { etapa, plano } = require('../utils/etapas')

const router = express.Router()
router.get('/', plano('schema', 'read'), validateSchema(model.schemaGet), etapa('read', controller.get))
router.get('/:id', plano('schema', 'read'), validateSchema(model.schemaGetOne), etapa('read', controller.getOne))
router.post('/', plano('schema', 'rules'), validateSchema(model.schemaPost), etapa('rules', controller.post))
router.delete('/:id', plano('schema', 'rules'), validateSchema(model.schemaDelete), etapa('rules', controller.delete))
router.put('/:id', plano('schema', 'rules'), validateSchema(model.schemaPut), etapa('rules', controller.put))

module.exports = router
