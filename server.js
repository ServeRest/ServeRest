const fs = require('fs')
const colors = require('colors')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
const router = jsonServer.router('./db.json')

server.use(bodyParser.urlencoded({ extended: true }))
server.use(bodyParser.json())
server.use(jsonServer.defaults());

const SECRET_KEY = '123456789'

const expiresIn = '1h'

function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn })
}

function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ? decode : err)
}

function readUserFile() {
  return JSON.parse(fs.readFileSync('./users.json', 'UTF-8'));
}

function isAuthenticated({ email, password }) {
  let userdb = readUserFile()
  return userdb.users.findIndex(user => user.email === email && user.password === password) !== -1
}

function returnErrorResponse(res, message) {
  res.status(401).json({ message });
}

server.post('/auth/register', (req, res) => {
  const { email, password } = req.body;

  let userdb = readUserFile()
  const emailAlreadyExist = userdb.users.findIndex(user => user.email === email) !== -1;

  if (emailAlreadyExist) {
    returnErrorResponse(res, 'Email já cadastrado')
    return
  }

  fs.readFile("./users.json", (err, data) => {
    if (err) {
      returnErrorResponse(res, err)
      return
    };

    // Get current users data
    var data = JSON.parse(data.toString());

    let idOfLastItem = data.users[data.users.length - 1].id;

    // Add new user
    data.users.push({ id: idOfLastItem + 1, email: email, password: password });
    let writeData = fs.writeFile("./users.json", JSON.stringify(data), (err, result) => {  // WRITE
      if (err) {
        returnErrorResponse(res, err)
        return
      }
    });
  });

  // Create token for new user
  const accessToken = createToken({ email, password })
  res.status(201).json({ accessToken })
})

server.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (isAuthenticated({ email, password }) === false) {
    returnErrorResponse(res, 'Email ou password incorreto')
    return
  }
  const accessToken = createToken({ email, password })
  res.status(200).json({ accessToken })
})

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined) {
    returnErrorResponse(res, 'Autenticação necessária')
    return
  }
  if (req.headers.authorization.split(' ')[0] !== 'Bearer') {
    returnErrorResponse(res, 'Tipo de autenticação inválido')
    return
  }
  const token = req.headers.authorization.split(' ')[1];
  if (token == undefined) {
    returnErrorResponse(res, 'Token de acesso vazio')
    return
  }
  try {
    if (verifyToken(token) instanceof Error) {
      returnErrorResponse(res, 'Token de acesso não é válido')
      return
    }
    next()
  } catch (err) {
    returnErrorResponse(res, 'Token de acesso revogado')
  }
})

server.use(router)

server.listen(3000, () => {
  console.log('O servidor está sendo executado na porta 3000, bom proveito!'.green)
  console.log('\n✧*｡٩(ˊᗜˋ*)و✧*｡\n'.gray)
  console.log('https://github.com/PauloGoncalvesBH/fake-api-school'.blue)
})