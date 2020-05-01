'use strict'

const express = require('express')

const validateSchema = require('../services/validateSchema-service')
const model = require('../models/usuarios-model')

const router = express.Router()

// const authService = require('../services/auth-service')
const controller = require('../controllers/usuarios-controller')

router.get('/', validateSchema(model.schemaGet), controller.get)
router.post('/', validateSchema(model.schemaPost), controller.post)
router.delete('/:id', validateSchema(model.schemaDelete), controller.delete)
router.put('/:id', validateSchema(model.schemaPut), controller.put)

module.exports = router
