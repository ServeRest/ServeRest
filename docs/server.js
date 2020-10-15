const express = require('express')
const { join } = require('path')

const app = express()

app.get('/', function (req, res) {
  res.sendFile(join(__dirname, 'index.html'))
})

app.listen(process.env.PORT || 3000)
