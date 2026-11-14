/* global MutationObserver */
// Mesmo motivo de FIELD_ASSISTS_OFF em src/lab/public/core.js, com a mesma lista: o Swagger mostra /login e
// os parâmetros email e password, e os gerenciadores de senha ofereciam salvar e preencher credenciais. Os
// campos nascem a cada "Try it out", por isso o observador marca cada um que entra na página. O ponto e
// vírgula inicial é obrigatório pelo mesmo motivo de 08-flow-panel.js: os scripts são concatenados.
;(function () {
  const FIELD_ASSISTS_OFF = {
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
  }
  const FIELDS = 'input, textarea'

  function markField (field) {
    Object.keys(FIELD_ASSISTS_OFF).forEach(name => field.setAttribute(name, FIELD_ASSISTS_OFF[name]))
  }

  function markFieldsIn (node) {
    if (node.nodeType !== 1) return
    if (node.matches(FIELDS)) markField(node)
    node.querySelectorAll(FIELDS).forEach(markField)
  }

  document.body.setAttribute('data-1p-ignore', '')
  markFieldsIn(document.body)
  new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(markFieldsIn))
  }).observe(document.body, { childList: true, subtree: true })
})()
