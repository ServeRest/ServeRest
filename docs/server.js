const express = require('express')
const moesif = require('moesif-nodejs')
const { join } = require('path')

const app = express()

app.get('/favicon.ico', (req, res) => { res.sendStatus(204) })

app.use(moesif({
  applicationId: 'eyJhcHAiOiIxNTA6MTU1MCIsInZlciI6IjIuMCIsIm9yZyI6IjQ5MToxMTIxIiwiaWF0IjoxNTk4OTE4NDAwfQ.e0E6Qhz1o1Jjs5prulHDYEBlv0juruWs_btjq2mong8',
  identifyUser: (req, res) => { return 'serverest.dev' }
}))

app.get('*', function (req, res) {
  res.sendFile(join(__dirname, 'index.html'))
})

app.listen(3000)
