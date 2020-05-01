'use strict'

const express = require('express')

const validateSchema = require('../services/validateSchema-service')
const model = require('../models/login-model')

const router = express.Router()

const controller = require('../controllers/login-controller')

router.post('/', validateSchema(model.schemaPost), controller.post)

module.exports = router
