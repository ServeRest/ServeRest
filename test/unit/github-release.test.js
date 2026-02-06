const axios = require('axios')
const chai = require('chai')
const sinon = require('sinon')

const { fetchLatestRelease, normalizeVersion } = require('../../src/utils/github-release')

const sandbox = sinon.createSandbox()

describe('github-release', () => {
  afterEach(() => sandbox.restore())

  describe('normalizeVersion', () => {
    it('deve normalizar versões com prefixo v e espaços', () => {
      chai.expect(normalizeVersion(' v2.10.3 ')).to.equal('2.10.3')
      chai.expect(normalizeVersion('V1.0.0')).to.equal('1.0.0')
    })

    it('deve lidar com entradas vazias ou numéricas', () => {
      chai.expect(normalizeVersion('')).to.equal('')
      chai.expect(normalizeVersion(null)).to.equal('')
      chai.expect(normalizeVersion(3)).to.equal('3')
    })
  })

  describe('fetchLatestRelease', () => {
    it('deve retornar dados normalizados da release mais recente', async () => {
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

    it('deve retornar null quando tag_name estiver ausente', async () => {
      sandbox.stub(axios, 'get').resolves({
        data: {
          html_url: 'https://github.com/ServeRest/ServeRest/releases'
        }
      })

      const result = await fetchLatestRelease()

      chai.expect(result).to.equal(null)
    })

    it('deve retornar null quando html_url estiver ausente', async () => {
      sandbox.stub(axios, 'get').resolves({
        data: {
          tag_name: 'v1.2.3'
        }
      })

      const result = await fetchLatestRelease()

      chai.expect(result).to.equal(null)
    })
  })
})
