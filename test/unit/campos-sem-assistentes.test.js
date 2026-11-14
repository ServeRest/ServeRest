const { expect } = require('chai')
const { readFileSync } = require('fs')
const { join } = require('path')
const vm = require('vm')

const { FIELD_ASSISTS_OFF } = require('../../src/lab/public/core')

const scriptSource = readFileSync(join(__dirname, '../../src/swagger/scripts/09-campos-sem-assistentes.js'), 'utf8')

// DOM mínimo: só o que o script usa (nodeType, matches, querySelectorAll e setAttribute).
function elemento (tag, filhos = []) {
  return {
    nodeType: 1,
    tag,
    filhos,
    atributos: {},
    setAttribute (nome, valor) { this.atributos[nome] = String(valor) },
    matches (seletor) { return seletor.split(',').map(parte => parte.trim()).includes(this.tag) },
    querySelectorAll (seletor) {
      const encontrados = []
      const visitar = no => no.filhos.forEach(filho => {
        if (filho.nodeType !== 1) return
        if (filho.matches(seletor)) encontrados.push(filho)
        visitar(filho)
      })
      visitar(this)
      return encontrados
    }
  }
}

function carregar (body, prefixo = '') {
  const observador = {}
  class MutationObserver {
    constructor (callback) { observador.callback = callback }
    observe (alvo, opcoes) { Object.assign(observador, { alvo, opcoes }) }
  }
  vm.runInNewContext(prefixo + scriptSource, { document: { body }, MutationObserver })
  return observador
}

describe('Campos do Swagger sem gerenciador de senha e sem corretor', () => {
  it('usa a mesma lista de atributos da página do lab', () => {
    const campo = elemento('input')
    carregar(elemento('body', [campo]))
    expect(campo.atributos).to.deep.equal(FIELD_ASSISTS_OFF)
  })

  it('a lista pede silêncio ao 1Password, LastPass, Bitwarden, Dashlane, Grammarly e ao corretor do navegador', () => {
    expect(FIELD_ASSISTS_OFF).to.deep.equal({
      autocomplete: 'off',
      'data-1p-ignore': '',
      'data-lpignore': 'true',
      'data-bwignore': '',
      'data-form-type': 'other',
      spellcheck: 'false',
      autocorrect: 'off',
      autocapitalize: 'off',
      'data-gramm': 'false',
      'data-gramm_editor': 'false',
      'data-enable-grammarly': 'false'
    })
  })

  it('marca o body para o 1Password ignorar a página inteira', () => {
    const body = elemento('body')
    carregar(body)
    expect(body.atributos).to.deep.equal({ 'data-1p-ignore': '' })
  })

  it('marca os campos que já estão na página e deixa o resto como está', () => {
    const campo = elemento('textarea')
    const botao = elemento('button')
    carregar(elemento('body', [elemento('div', [campo, botao])]))
    expect(campo.atributos).to.deep.equal(FIELD_ASSISTS_OFF)
    expect(botao.atributos).to.deep.equal({})
  })

  it('marca os campos que entram depois, inclusive dentro de um bloco novo, e ignora nós de texto', () => {
    const body = elemento('body')
    const observador = carregar(body)
    expect(observador.alvo).to.equal(body)
    expect(observador.opcoes).to.deep.equal({ childList: true, subtree: true })

    const solto = elemento('input')
    const dentro = elemento('input')
    const bloco = elemento('div', [elemento('label'), dentro])
    observador.callback([{ addedNodes: [{ nodeType: 3 }, solto, bloco] }])

    expect(solto.atributos).to.deep.equal(FIELD_ASSISTS_OFF)
    expect(dentro.atributos).to.deep.equal(FIELD_ASSISTS_OFF)
    expect(bloco.atributos).to.deep.equal({})
  })

  it('funciona concatenado depois de outro script autoexecutável, como na página do Swagger', () => {
    const body = elemento('body')
    expect(() => carregar(body, '(function () {})()\n')).to.not.throw()
    expect(body.atributos).to.deep.equal({ 'data-1p-ignore': '' })
  })
})
