const faker = require('faker')

async function login (email, password) {
  const { body } = await request.post('/login').send({
    email,
    password
  })
  return body
}

async function cadastrarCarrinho ({ idProduto, quantidade = 1, authorization }) {
  if (idProduto === undefined) {
    const { body: bodyProdutos } = await request.get('/produtos')
    idProduto = bodyProdutos.produtos[0]._id
  }
  const { body } = await request.post('/carrinhos').set('authorization', authorization).send({
    produtos: [{
      idProduto,
      quantidade
    }]
  }).expect(201)
  return body
}

async function cadastrarProduto ({
  nome = faker.commerce.productName(),
  preco = faker.random.number(),
  descricao = faker.random.words(),
  quantidade = faker.random.number(),
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
  nome = faker.name.firstName(),
  email = faker.internet.email(),
  password = faker.internet.password(),
  administrador = `${faker.random.boolean()}`
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

async function excluirUsuario (id) {
  const { body } = await request.del('/usuarios/' + id).expect(200)
  return body
}

module.exports = {
  cadastrarCarrinho,
  cadastrarProduto,
  cadastrarUsuario,
  excluirUsuario,
  login
}
