'use strict'

const { readFileSync } = require('fs')
const { join } = require('path')

const { version } = require('../../package.json')
const { enderecosDaPagina } = require('./buscadores')
const { prepararResposta } = require('./entrega')
const { urlDoAmbiente } = require('../utils/ambiente')
const ptBr = require('../swagger/translations/pt-BR')
const en = require('../swagger/translations/en')
const es = require('../swagger/translations/es')

const LAB_ASSETS_DIR = join(__dirname, 'public')
const template = readFileSync(join(__dirname, 'page.html'), 'utf8')

// Os dois scripts que rodam antes da primeira pintura vão dentro da página: são pequenos, e cada um custava
// um pedido a mais. Os arquivos continuam em public/, onde os testes de unidade os leem.
const inlineScripts = {
  'script.legacy-links': readFileSync(join(LAB_ASSETS_DIR, 'legacy-links.js'), 'utf8'),
  'script.prefs-boot': readFileSync(join(LAB_ASSETS_DIR, 'prefs-boot.js'), 'utf8')
}

function escapeHtml (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Função de substituição em vez de string: um texto com "$&" precisa sair sem alteração.
function renderTemplate (source, values) {
  return source.replace(/\{\{([A-Za-z0-9_.-]+)\}\}/g, (placeholder, name) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new Error(`Template do lab com marcador sem valor: ${placeholder}`)
    }
    return values[name]
  })
}

// O "<" vira < para que nenhum texto feche o elemento <script> que guarda o JSON.
function textsJson (translations) {
  const keys = Object.keys(translations)
    .filter(key => key.startsWith('lab.') || key.startsWith('ui.flow.') || key === 'ui.response')
  const texts = keys.reduce((output, key) => ({ ...output, [key]: translations[key] }), {})
  return JSON.stringify(texts).replace(/</g, '\\u003c')
}

// Canonical, hreflang e Open Graph pedem endereços absolutos. Com a URL do próprio ambiente, o staging e as
// instâncias das parceiras não se anunciam como a produção.
const BASE = urlDoAmbiente()
const ENDERECOS = enderecosDaPagina(BASE)
// O og:locale pede idioma_PAÍS: o país é o da bandeira de cada idioma no seletor.
const OG_LOCALE = { 'pt-BR': 'pt_BR', en: 'en_GB', es: 'es_PE' }

function headValues (language) {
  return {
    'head.canonical': escapeHtml(ENDERECOS[language]),
    'head.url.pt-BR': escapeHtml(ENDERECOS['pt-BR']),
    'head.url.en': escapeHtml(ENDERECOS.en),
    'head.url.es': escapeHtml(ENDERECOS.es),
    'head.og_locale': OG_LOCALE[language],
    'head.image': escapeHtml(`${BASE}/lab/assets/img/serverest-og.png`)
  }
}

// O idioma da página sai marcado do servidor: o botão do menu de idiomas mostra a bandeira e a sigla dele, e o
// link dele na lista leva aria-current. Os valores são fixos, nunca vêm de fora.
const IDIOMAS_DA_BARRA = {
  'pt-BR': { flag: 'flag_brazil.svg', code: 'PT', name: 'lab.lang.pt_br' },
  en: { flag: 'flag_uk.svg', code: 'EN', name: 'lab.lang.en' },
  es: { flag: 'flag_peru.svg', code: 'ES', name: 'lab.lang.es' }
}

function flagValues (language, translations) {
  const atual = IDIOMAS_DA_BARRA[language]
  return Object.keys(IDIOMAS_DA_BARRA).reduce((output, code) => ({
    ...output,
    [`flag.${code}.current`]: code === language ? ' aria-current="true"' : ''
  }), { 'lang.flag': atual.flag, 'lang.code': atual.code, 'lang.name': escapeHtml(translations[atual.name]) })
}

function pageValues (language, translations) {
  const values = Object.keys(translations)
    .filter(key => key.startsWith('lab.'))
    .reduce((output, key) => ({ ...output, [key]: escapeHtml(translations[key]) }), {})
  return { ...values, ...flagValues(language, translations), ...headValues(language), ...inlineScripts, lang: language, texts: textsJson(translations) }
}

const valuesByLanguage = {
  'pt-BR': pageValues('pt-BR', ptBr),
  en: pageValues('en', en),
  es: pageValues('es', es)
}

// notice: { version, url } ou nada. Os dois atributos ficam vazios sem aviso; com aviso, a url
// nunca é vazia, e a versão vazia quer dizer aviso sem número de versão.
function renderLabPage (language, pageVersion, notice) {
  const aviso = notice || { version: '', url: '' }
  const valores = valuesByLanguage[language]
  return renderTemplate(template, {
    ...valores,
    version: escapeHtml(pageVersion),
    // "versão 3.4.0": o nome da etiqueta da versão para o leitor de tela e o texto dela no menu do telefone.
    'topbar.version': valores['lab.topbar.version'].replace('{version}', () => escapeHtml(pageVersion)),
    noticeVersion: escapeHtml(aviso.version),
    noticeUrl: escapeHtml(aviso.url)
  })
}

// Renderiza os três idiomas ao carregar: um texto faltando derruba o servidor e os testes, não o aluno.
Object.keys(valuesByLanguage).forEach(language => renderLabPage(language, version))

const paginasProntas = new Map()

// A página só muda com o idioma e com o aviso de versão nova; a versão é a do processo. Cada combinação é
// montada na primeira visita que a pede e guardada, já com o ETag.
function paginaPronta (language, notice) {
  const aviso = notice || { version: '', url: '' }
  const chave = JSON.stringify([language, aviso.version, aviso.url])
  if (!paginasProntas.has(chave)) {
    paginasProntas.set(chave, prepararResposta(renderLabPage(language, version, notice), 'html'))
  }
  return paginasProntas.get(chave)
}

module.exports = {
  LAB_ASSETS_DIR,
  paginaPronta,
  renderLabPage,
  renderTemplate
}
