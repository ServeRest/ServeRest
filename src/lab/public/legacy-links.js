/* eslint-env browser */
// Links antigos do Swagger (/#/Login/post_login) seguem para /swagger com a mesma query e o mesmo
// hash, onde a operação abre. Os hashes desta página (#post/carrinhos) nunca começam com "#/".
// Carregado sem defer, antes do CSS, para encaminhar antes de a página aparecer.
(function () {
  function encaminharLinkAntigo () {
    if (window.location.hash.indexOf('#/') === 0) {
      window.location.replace('/swagger' + window.location.search + window.location.hash)
    }
  }

  encaminharLinkAntigo()
  window.addEventListener('hashchange', encaminharLinkAntigo)
})()
