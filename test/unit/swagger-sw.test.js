const { expect } = require('chai')
const { readFileSync } = require('fs')
const { join } = require('path')
const vm = require('vm')

// O worker roda no navegador; aqui ele roda num contexto com o mínimo que o código usa no carregamento.
function carregarWorker () {
  const codigo = readFileSync(join(__dirname, '../../src/swagger/swagger-sw.js'), 'utf8').replace(/__VERSION__/g, 'x')
  const contexto = { self: { location: { origin: 'http://localhost:3000' }, addEventListener () {} }, URL }
  vm.runInNewContext(codigo, contexto)
  return contexto
}

describe('Service worker do Swagger', () => {
  const { shouldCache } = carregarWorker()

  it('não guarda os arquivos da página inicial, que ficam com o cache do navegador', () => {
    ;['app.js', 'core.js', 'guia.js', 'lab.css', 'prefs-boot.js', 'legacy-links.js'].forEach(arquivo => {
      expect(shouldCache('http://localhost:3000/lab/assets/' + arquivo + '?v=3.3.0'), arquivo).to.equal(false)
    })
  })

  it('continua guardando os arquivos do Swagger e não guarda a página inicial nem outro domínio', () => {
    expect(shouldCache('http://localhost:3000/swagger-ui-bundle.js')).to.equal(true)
    expect(shouldCache('http://localhost:3000/swagger.json?lang=en')).to.equal(true)
    expect(shouldCache('http://localhost:3000/')).to.equal(false)
    expect(shouldCache('https://exemplo.com/swagger-ui-bundle.js')).to.equal(false)
  })
})
