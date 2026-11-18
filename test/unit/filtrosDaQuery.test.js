const { expect } = require('chai')

const alterarValoresParaRegex = require('../../src/utils/alterarValoresParaRegex')
const { converterFiltrosNumericos, FILTROS_CONVERTIDOS } = require('../../src/utils/filtrosDaQuery')

function converter (query) {
  const req = { query }
  converterFiltrosNumericos(req, {}, () => {})
  return req.query
}

describe('filtrosDaQuery', () => {
  it('converte os campos que os schemas de GET declaram como número, e o email', () => {
    expect([...FILTROS_CONVERTIDOS].sort()).to.deep.equal(['email', 'preco', 'precoTotal', 'quantidade', 'quantidadeTotal'])
  })

  it('não converte os campos de texto', () => {
    const query = converter({ quantidade: '007', nome: '007', _id: '0000000000000000' })

    expect(query).to.deep.equal({ quantidade: 7, nome: '007', _id: '0000000000000000' })
  })

  it('o campo numérico em branco chega ao schema como 0 e não filtra a busca', () => {
    const query = converter({ quantidade: ' ', preco: '', precoTotal: '0' })

    expect(query).to.deep.equal({ quantidade: 0, preco: 0, precoTotal: 0 })
    expect(alterarValoresParaRegex(query)).to.deep.equal({ precoTotal: 0 })
  })

  it('o campo de texto em branco não filtra a busca', () => {
    const query = converter({ nome: ' ', _id: '\t', descricao: '0' })

    expect(alterarValoresParaRegex(query)).to.deep.equal({ descricao: /0/i })
  })
})
