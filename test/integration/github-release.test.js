const axios = require('axios')
const chai = require('chai')
const sinon = require('sinon')

const { fetchLatestRelease, normalizeVersion } = require('../../src/utils/github-release')

const sandbox = sinon.createSandbox()

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
