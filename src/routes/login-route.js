'use strict'

const express = require('express')

const controller = require('../controllers/login-controller')
const model = require('../models/login-model')
const validateSchema = require('../services/validateSchema-service')

const router = express.Router()
router.post('/', validateSchema(model.schemaPost), controller.post)

module.exports = router
