'use strict'

const express = require('express')

const authController = require('../controllers/auth-controller')
const controller = require('../controllers/carrinhos-controller')
const model = require('../models/carrinhos-model')
const validateSchema = require('../services/validateSchema-service')

const router = express.Router()
router.get('/', validateSchema(model.schemaGet), controller.get)
router.post('/', authController.checkToken, validateSchema(model.schemaPost), controller.post)
router.delete('/concluir-compra', authController.checkToken, controller.concluirCompra)
router.delete('/cancelar-compra', authController.checkToken, controller.cancelarCompra)

module.exports = router
