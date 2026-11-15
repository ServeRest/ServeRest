const axios = require('axios')
const chai = require('chai')
const sinon = require('sinon')

const { fetchLatestRelease, isNewerVersion, normalizeVersion } = require('../../src/utils/github-release')

const sandbox = sinon.createSandbox()

// Ordem crescente de precedência do exemplo da seção 11 da SemVer 2.0.0.
const ordemDaSemVer = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0']

function esperarMaisNova (maisNova, maisVelha) {
  chai.expect(isNewerVersion(maisNova, maisVelha), `${maisNova} > ${maisVelha}`).to.equal(true)
  chai.expect(isNewerVersion(maisVelha, maisNova), `${maisVelha} < ${maisNova}`).to.equal(false)
}

describe('isNewerVersion', () => {
  it('compara major, minor e patch como números', () => {
    esperarMaisNova('3.3.0', '3.2.2')
    esperarMaisNova('10.0.0', '9.0.0')
    esperarMaisNova('1.10.0', '1.9.0')
    esperarMaisNova('1.0.10', '1.0.9')
    esperarMaisNova('2.0.0', '1.99.99')
  })

  it('a mesma versão não é mais nova', () => {
    chai.expect(isNewerVersion('3.3.0', '3.3.0')).to.equal(false)
    chai.expect(isNewerVersion('3.3.0-beta.6', '3.3.0-beta.6')).to.equal(false)
  })

  it('tira o prefixo v e os espaços das duas versões', () => {
    esperarMaisNova('v3.3.0', '3.2.2')
    esperarMaisNova('3.3.0', 'V3.2.2')
    esperarMaisNova(' v3.3.0-beta.7 ', 'v3.3.0-beta.6')
    chai.expect(isNewerVersion('v3.3.0', '3.3.0')).to.equal(false)
  })

  it('compara identificadores numéricos do prerelease como números', () => {
    esperarMaisNova('3.3.0-beta.10', '3.3.0-beta.9')
    esperarMaisNova('1.0.0-beta.99999999999999999999', '1.0.0-beta.99999999999999999998')
  })

  it('o prerelease é mais velho que a sua release e mais novo que a release anterior', () => {
    esperarMaisNova('3.3.0', '3.3.0-beta.6')
    esperarMaisNova('3.3.0-beta.6', '3.2.2')
  })

  it('com os identificadores comuns iguais, o prerelease com menos identificadores é mais velho', () => {
    esperarMaisNova('1.0.0-alpha.1', '1.0.0-alpha')
    esperarMaisNova('1.0.0-beta.1.1', '1.0.0-beta.1')
  })

  it('identificador numérico é mais velho que alfanumérico', () => {
    esperarMaisNova('1.0.0-alpha.beta', '1.0.0-alpha.1')
    esperarMaisNova('1.0.0-a', '1.0.0-999')
  })

  it('compara identificadores alfanuméricos pela ordem ASCII', () => {
    esperarMaisNova('1.0.0-beta', '1.0.0-alpha')
    esperarMaisNova('1.0.0-rc.1', '1.0.0-beta.11')
    esperarMaisNova('1.0.0-beta', '1.0.0-Beta')
    esperarMaisNova('1.0.0-rc-2', '1.0.0-rc-1')
  })

  it('segue a ordem do exemplo da especificação SemVer', () => {
    ordemDaSemVer.forEach((versao, indice) => {
      ordemDaSemVer.slice(indice + 1).forEach(maisNova => esperarMaisNova(maisNova, versao))
    })
  })

  it('ignora o metadado de build', () => {
    chai.expect(isNewerVersion('1.0.0+build.2', '1.0.0+build.1')).to.equal(false)
    chai.expect(isNewerVersion('1.0.0+build.1', '1.0.0')).to.equal(false)
    chai.expect(isNewerVersion('1.0.0-beta.1+exp.sha.5114f85', '1.0.0-beta.1')).to.equal(false)
    esperarMaisNova('1.0.1+build.1', '1.0.0+build.9')
    esperarMaisNova('1.0.0', '1.0.0-rc.1+build.1')
  })

  it('valor fora do formato nunca é mais novo, nem serve de base, e nunca lança exceção', () => {
    const invalidas = ['', 'latest', '1.0', '1.0.0.0', '1.0.0-', '1.0.0-beta..1', '1.0.0+', '1.0.0 beta', 'vv1.0.0', '-1.0.0', '1.0.0-beta_1',
      null, undefined, 42, 1.5, {}, [], Object.create(null), { toString () { throw new Error('toString') } }]
    // O rótulo é o índice: String() lançaria exceção com os dois últimos valores.
    invalidas.forEach((invalida, indice) => {
      chai.expect(() => isNewerVersion(invalida, '1.0.0'), `candidata #${indice}`).to.not.throw()
      chai.expect(isNewerVersion(invalida, '1.0.0'), `candidata #${indice}`).to.equal(false)
      chai.expect(() => isNewerVersion('999.0.0', invalida), `atual #${indice}`).to.not.throw()
      chai.expect(isNewerVersion('999.0.0', invalida), `atual #${indice}`).to.equal(false)
    })
  })
})

describe('github-release', () => {
  afterEach(() => sandbox.restore())

  it('fetchLatestRelease deve retornar dados normalizados quando existe release', async () => {
    const axiosStub = sandbox.stub(axios, 'get').resolves({
      data: {
        tag_name: 'v1.2.3',
        html_url: 'https://github.com/ServeRest/ServeRest/releases/tag/v1.2.3',
        published_at: '2024-01-01T00:00:00Z'
      }
    })

    const result = await fetchLatestRelease()

    sinon.assert.calledWith(axiosStub, 'https://api.github.com/repos/ServeRest/ServeRest/releases/latest', sinon.match({
      timeout: 4000,
      headers: {
        'User-Agent': 'ServeRest'
      }
    }))

    chai.expect(result).to.deep.equal({
      tag: 'v1.2.3',
      version: '1.2.3',
      url: 'https://github.com/ServeRest/ServeRest/releases/tag/v1.2.3',
      publishedAt: '2024-01-01T00:00:00Z'
    })
  })

  it('normalizeVersion deve retornar vazio quando versão não existe', () => {
    chai.expect(normalizeVersion('')).to.equal('')
  })

  it('fetchLatestRelease deve retornar publishedAt nulo quando ausente', async () => {
    sandbox.stub(axios, 'get').resolves({
      data: {
        tag_name: 'v1.2.3',
        html_url: 'https://github.com/ServeRest/ServeRest/releases/tag/v1.2.3'
      }
    })

    const result = await fetchLatestRelease()

    chai.expect(result.publishedAt).to.equal(null)
  })

  it('fetchLatestRelease deve retornar null quando html_url estiver ausente', async () => {
    sandbox.stub(axios, 'get').resolves({
      data: {
        tag_name: 'v1.2.3'
      }
    })

    const result = await fetchLatestRelease()

    chai.expect(result).to.equal(null)
  })

  it('fetchLatestRelease deve retornar null quando response não possui data', async () => {
    sandbox.stub(axios, 'get').resolves(undefined)

    const result = await fetchLatestRelease()

    chai.expect(result).to.equal(null)
  })
})
