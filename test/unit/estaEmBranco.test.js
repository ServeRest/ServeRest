const { expect } = require('chai')

const alterarValoresParaRegex = require('../../src/utils/alterarValoresParaRegex')
const estaEmBranco = require('../../src/utils/estaEmBranco')
const { filtrosDaLista, tirarFiltrosEmBranco } = require('../../src/utils/filtrosDaQuery')
const produtos = require('../../src/models/produtos-model')

// Todo filtro em branco, em qualquer campo, deixa de filtrar, como em produção.
describe('Filtro em branco', () => {
  it('estaEmBranco só aceita texto vazio ou com espaços', () => {
    expect(['', ' ', '\t\n'].map(estaEmBranco)).to.deep.equal([true, true, true])
    expect(['0', 'a', 0, undefined, ['']].map(estaEmBranco)).to.deep.equal([false, false, false, false, false])
  })

  it('o campo de texto em branco sai da busca', () => {
    expect(alterarValoresParaRegex({ nome: 'test', password: '', _id: ' ', descricao: '0' }))
      .to.deep.equal({ nome: /test/i, descricao: /0/i })
  })

  it('o campo numérico em branco chega ao schema como 0 e sai da busca depois', () => {
    const req = { query: { quantidade: ' ', preco: '', descricao: 'a' } }

    filtrosDaLista(produtos.schemaGet)[0](req, {}, () => {})
    expect(req.query).to.deep.equal({ quantidade: 0, preco: 0, descricao: 'a' })

    tirarFiltrosEmBranco(req, {}, () => {})
    expect(req.query).to.deep.equal({ descricao: 'a' })
  })

  it('tirarFiltrosEmBranco tolera a requisição que não passou pela conversão', () => {
    const req = { query: { quantidade: 0 } }

    tirarFiltrosEmBranco(req, {}, () => {})

    expect(req.query).to.deep.equal({ quantidade: 0 })
  })
})
