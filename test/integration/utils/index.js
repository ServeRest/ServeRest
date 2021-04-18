const faker = require('faker')

async function cadastrarCarrinho ({
  idProduto,
  quantidade = 1,
  authorization
}) {
  const { body } = await request.post('/carrinhos').set('authorization', authorization).send({
    produtos: [{
      idProduto,
      quantidade
    }]
  }).expect(201)
  return {
    idProduto,
    quantidade,
    _id: body._id
  }
}

async function cadastrarProduto ({
  nome = faker.commerce.productName() + faker.datatype.number() + faker.datatype.number(),
  preco = faker.datatype.number(),
  descricao = faker.random.words(),
  quantidade = faker.datatype.number(),
  authorization
} = {}) {
  const { body } = await request.post('/produtos').send({
    nome,
    preco,
    descricao,
    quantidade
  }).set('authorization', authorization).expect(201)
  return {
    nome,
    preco,
    descricao,
    quantidade,
    _id: body._id
  }
}

async function cadastrarUsuario ({
  nome = faker.name.firstName() + ' ' + faker.name.lastName(),
  email = faker.internet.email(),
  password = faker.internet.password(),
  administrador = `${faker.datatype.boolean()}`
} = {}) {
  const { body } = await request.post('/usuarios').send({
    nome,
    email,
    password,
    administrador
  }).expect(201)
  return {
    nome,
    email,
    password,
    administrador,
    _id: body._id
  }
}

function dadosProduto () {
  return {
    nome: faker.commerce.productName() + faker.datatype.number() + faker.datatype.number(),
    preco: faker.datatype.number(),
    descricao: faker.random.words(),
    quantidade: faker.datatype.number(),
    imagem: faker.random.words()
  }
}

async function login (email, password) {
  const { body } = await request.post('/login').send({
    email,
    password
  }).expect(200)
  return body
}

module.exports = {
  cadastrarCarrinho,
  cadastrarProduto,
  cadastrarUsuario,
  dadosProduto,
  login
}
