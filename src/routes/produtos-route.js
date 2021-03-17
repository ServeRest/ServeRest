'use strict'

const express = require('express')

const authentication = require('../middlewares/authentication-middleware')
const controller = require('../controllers/produtos-controller')
const model = require('../models/produtos-model')
const validateSchema = require('../services/validateSchema-service')

const router = express.Router()
router.get('/', validateSchema(model.schemaGet), controller.get)
router.get('/:id', validateSchema(model.schemaGetOne), controller.getOne)
router.post('/', authentication.checkAdm, validateSchema(model.schemaPost), controller.post)
router.delete('/:id', authentication.checkAdm, validateSchema(model.schemaDelete), controller.delete)
router.put('/:id', authentication.checkAdm, validateSchema(model.schemaPut), controller.put)

module.exports = router
