const chai = require('chai')
const { faker } = require('@faker-js/faker')

const rotaCarrinhos = '/carrinhos'
const utils = require('../utils')

describe(rotaCarrinhos + ' GET', () => {
  let usuarioAdministrador
  beforeEach(async () => {
    const { email, password, _id: idUsuario } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    usuarioAdministrador = {
      authorization,
      idUsuario
    }
  })

  it('Query string - Busca por todos as chaves', async () => {
    const { authorization, idUsuario } = usuarioAdministrador
    const { _id: idProduto, preco } = await utils.cadastrarProduto({ authorization })
    const { _id: idCarrinho, quantidade } = await utils.cadastrarCarrinho({ idProduto, authorization })

    const { body } = await request.get(rotaCarrinhos).query({
      precoTotal: preco,
      quantidadeTotal: quantidade,
      idUsuario,
      _id: idCarrinho
    })

    chai.assert.deepEqual(body, {
      quantidade: 1,
      carrinhos: [{
        produtos: [{
          idProduto,
          quantidade,
          precoUnitario: preco
        }],
        precoTotal: preco,
        quantidadeTotal: quantidade,
        idUsuario,
        _id: idCarrinho
      }]
    })
  })

  // A query chega como texto, e os filtros numéricos são convertidos antes do schema e da busca no banco.
  it('Query string - quantidadeTotal chega como número e encontra o carrinho cadastrado', async () => {
    const { authorization } = usuarioAdministrador
    const quantidade = faker.number.int({ min: 1000, max: 100000 })
    const { _id: idProduto } = await utils.cadastrarProduto({ authorization, quantidade })
    const { _id: idCarrinho } = await utils.cadastrarCarrinho({ idProduto, quantidade, authorization })

    const { body } = await request.get(rotaCarrinhos).query({ quantidadeTotal: quantidade }).expect(200)

    chai.assert.include(body.carrinhos.map(carrinho => carrinho._id), idCarrinho)
  })

  it('Query string - Nenhum produto encontrado', async () => {
    const { body } = await request.get(rotaCarrinhos).query({ _id: 'a' }).expect(200)
    chai.assert.deepEqual(body, { quantidade: 0, carrinhos: [] })
  })

  // Objeto na query chegava à busca do NeDB como operador: ?_id[$ne]=x devolvia a lista inteira e
  // ?_id[$where]=x respondia 500 com o stack. Nos campos com regex virava o texto "[object Object]".
  ;[
    ['_id[$ne]=x', '_id'],
    ['idUsuario[$ne]=x', 'idUsuario']
  ].forEach(([query, campo]) => {
    it(`Query string - ${query} responde que ${campo} deve ser uma string`, async () => {
      const { body } = await request.get(rotaCarrinhos).query(query).expect(400)

      chai.assert.deepEqual(body, { [campo]: `${campo} deve ser uma string` })
    })
  })

  // O parâmetro repetido chega como array e segue como em produção: 200, sem encontrar nada.
  ;['_id', 'idUsuario'].forEach(campo => {
    it(`Query string - ${campo} repetido continua respondendo 200`, async () => {
      const valores = [faker.string.alphanumeric(16), faker.string.alphanumeric(16)]
      const { body } = await request.get(rotaCarrinhos).query({ [campo]: valores }).expect(200)

      chai.assert.deepEqual(body, { quantidade: 0, carrinhos: [] })
    })
  })

  it('Query string - Chave inexistente', async () => {
    const { body } = await request.get(rotaCarrinhos).query({ inexistente: 'a' }).expect(400)

    chai.assert.deepEqual(body, {
      inexistente: 'inexistente não é permitido'
    })
  })

  it('Query string - preco e quantidade devem ser número', async () => {
    const { body } = await request.get(rotaCarrinhos).query({ precoTotal: 'a', quantidadeTotal: 'a' }).expect(400)

    chai.assert.deepEqual(body, {
      precoTotal: 'precoTotal deve ser um número',
      quantidadeTotal: 'quantidadeTotal deve ser um número'
    })
  })

  it('Query string - preco e quantidade devem ser número positivo', async () => {
    const { body } = await request.get(rotaCarrinhos).query({ precoTotal: 0, quantidadeTotal: 0 }).expect(400)

    chai.assert.deepEqual(body, {
      precoTotal: 'precoTotal deve ser um número positivo',
      quantidadeTotal: 'quantidadeTotal deve ser um número positivo'
    })
  })

  it('Query string - preco e quantidade devem ser inteiro', async () => {
    const { body } = await request.get(rotaCarrinhos).query({ precoTotal: 0.1, quantidadeTotal: 0.1 }).expect(400)

    chai.assert.deepEqual(body, {
      precoTotal: 'precoTotal deve ser um inteiro',
      quantidadeTotal: 'quantidadeTotal deve ser um inteiro'
    })
  })

  describe('Filtro com valor que parece número', () => {
    // Como em produção: o branco vira 0 para o schema, que recusa o 0 nestes campos.
    utils.VALORES_EM_BRANCO.forEach(valor => {
      [
        ['precoTotal', 'precoTotal deve ser um número positivo'],
        ['quantidadeTotal', 'quantidadeTotal deve ser um número positivo']
      ].forEach(([campo, mensagem]) => {
        it(`Query string - ${campo} ${JSON.stringify(valor)} responde 400 como em produção`, async () => {
          const { body } = await request.get(rotaCarrinhos).query({ [campo]: valor }).expect(400)

          chai.assert.deepEqual(body, { [campo]: mensagem })
        })
      })
    })

    utils.VALORES_QUE_VIRAVAM_ZERO.forEach(valor => {
      ['_id', 'idUsuario'].forEach(campo => {
        it(`Query string - ${campo} ${JSON.stringify(valor)} não encontra carrinho`, async () => {
          const { body } = await request.get(rotaCarrinhos).query({ [campo]: valor }).expect(200)

          chai.assert.deepEqual(body, { quantidade: 0, carrinhos: [] })
        })
      })
    })
  })
})
