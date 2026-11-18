const chai = require('chai')
const { faker } = require('@faker-js/faker')

const rotaUsuarios = '/usuarios'
const utils = require('../utils')

describe(rotaUsuarios + ' ORDEM DA LISTA', () => {
  it('Usuário cadastrado por último vem primeiro', async () => {
    const nome = faker.string.alphanumeric(24)
    const primeiro = await utils.cadastrarUsuario({ nome })
    const segundo = await utils.cadastrarUsuario({ nome })

    const { body } = await request.get(rotaUsuarios).query({ nome }).expect(200)

    chai.assert.deepEqual(body, { quantidade: 2, usuarios: [segundo, primeiro] })
  })

  it('Usuário alterado volta para o topo', async () => {
    const nome = faker.string.alphanumeric(24)
    const primeiro = await utils.cadastrarUsuario({ nome })
    const segundo = await utils.cadastrarUsuario({ nome })
    const { _id, ...dados } = primeiro
    const alterado = { ...dados, password: faker.internet.password() }

    await request.put(`${rotaUsuarios}/${_id}`).send(alterado).expect(200)
    const { body } = await request.get(rotaUsuarios).query({ nome }).expect(200)

    chai.assert.deepEqual(body, { quantidade: 2, usuarios: [{ ...alterado, _id }, segundo] })
  })

  it('Usuário cadastrado vem antes do usuário da semente - @skipE2E', async () => {
    const usuario = await utils.cadastrarUsuario()

    const { body } = await request.get(rotaUsuarios).expect(200)
    const ids = body.usuarios.map(({ _id }) => _id)

    chai.assert.isBelow(ids.indexOf(usuario._id), ids.indexOf('0uxuPY0cbmQhpEz1'))
  })

  it('Lista e busca por id não mostram o campo interno de ordenação', async () => {
    const usuario = await utils.cadastrarUsuario()

    const { body: lista } = await request.get(rotaUsuarios).query({ _id: usuario._id }).expect(200)
    const { body: porId } = await request.get(`${rotaUsuarios}/${usuario._id}`).expect(200)

    chai.assert.deepEqual(lista.usuarios, [usuario])
    chai.assert.deepEqual(porId, usuario)
    chai.assert.notProperty(porId, 'alteradoEm')
  })
})
