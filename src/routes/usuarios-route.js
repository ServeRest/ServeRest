'use strict'

const express = require('express')

const controller = require('../controllers/usuarios-controller')
const model = require('../models/usuarios-model')
const validateSchema = require('../services/validateSchema-service')

const router = express.Router()
router.get('/', validateSchema(model.schemaGet), controller.get)
router.get('/:id', validateSchema(model.schemaGetOne), controller.getOne)
router.post('/', validateSchema(model.schemaPost), controller.post)
router.delete('/:id', validateSchema(model.schemaDelete), controller.delete)
router.put('/:id', validateSchema(model.schemaPut), controller.put)

module.exports = router
