'use strict'

const express = require('express')

const authController = require('../controllers/auth-controller')
const controller = require('../controllers/produtos-controller')
const model = require('../models/produtos-model')
const validateSchema = require('../services/validateSchema-service')

const router = express.Router()
router.get('/', validateSchema(model.schemaGet), controller.get)
router.post('/', authController.checkAdm, validateSchema(model.schemaPost), controller.post)
router.delete('/:id', authController.checkAdm, validateSchema(model.schemaDelete), controller.delete)
router.put('/:id', authController.checkAdm, validateSchema(model.schemaPut), controller.put)

module.exports = router
