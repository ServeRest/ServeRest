const { faker } = require('@faker-js/faker')

// Tetos baixos de propósito. O carrinho multiplica preço por quantidade, e com os inteiros até 2^53 que o
// faker gera por padrão o precoTotal passava de Number.MAX_SAFE_INTEGER: o carrinho ficava no banco e o
// contrato de /carrinhos GET reprovava na execução seguinte. Com estes tetos o precoTotal de um item não
// passa de 10 milhões. A quantidade começa em 11 porque testes de carrinho compram quantidade - 10.
const precoAleatorio = () => faker.number.int({ min: 1, max: 10000 })
const quantidadeAleatoria = () => faker.number.int({ min: 11, max: 1000 })

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
  nome = faker.commerce.productName() + faker.number.int() + faker.number.int(),
  preco = precoAleatorio(),
  descricao = faker.lorem.words(),
  quantidade = quantidadeAleatoria(),
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
  nome = faker.person.firstName() + ' ' + faker.person.lastName(),
  email = faker.internet.email(),
  password = faker.internet.password(),
  administrador = `${faker.helpers.arrayElement([true, false])}`
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
    nome: faker.commerce.productName() + faker.number.int() + faker.number.int(),
    preco: precoAleatorio(),
    descricao: faker.lorem.words(),
    quantidade: quantidadeAleatoria(),
    imagem: faker.lorem.words()
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
  login,
  quantidadeAleatoria
}
