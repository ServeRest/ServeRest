'use strict'

const express = require('express')

const controller = require('../controllers/login-controller')
const model = require('../models/login-model')
const validateSchema = require('../services/validateSchema-service')
const { etapa, plano } = require('../utils/etapas')

const router = express.Router()
router.post('/', plano('schema', 'rules'), validateSchema(model.schemaPost), etapa('rules', controller.post))

module.exports = router
