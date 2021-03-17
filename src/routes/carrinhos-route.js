'use strict'

const express = require('express')

const authentication = require('../middlewares/authentication-middleware')
const controller = require('../controllers/carrinhos-controller')
const model = require('../models/carrinhos-model')
const validateSchema = require('../services/validateSchema-service')

const router = express.Router()
router.get('/', validateSchema(model.schemaGet), controller.get)
router.get('/:id', validateSchema(model.schemaGetOne), controller.getOne)
router.post('/', authentication.checkToken, validateSchema(model.schemaPost), controller.post)
router.delete('/concluir-compra', authentication.checkToken, controller.concluirCompra)
router.delete('/cancelar-compra', authentication.checkToken, controller.cancelarCompra)

module.exports = router
