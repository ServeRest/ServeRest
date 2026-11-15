'use strict'

// O endereço de cada idioma da página inicial. O pt-BR é a raiz e não /?lang=pt-BR: é a página que a raiz serve,
// e um lang que o servidor não conhece também cai nela, então os dois apontam para o mesmo endereço.
function enderecosDaPagina (base) {
  return { 'pt-BR': `${base}/`, en: `${base}/?lang=en`, es: `${base}/?lang=es` }
}

// Só a produção é indexada. O staging e as instâncias das parceiras servem a mesma página com outro domínio, e
// os buscadores as tratariam como cópias da produção.
function robotsTxt (base, indexavel) {
  if (!indexavel) return 'User-agent: *\nDisallow: /\n'
  return `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`
}

function sitemapXml (base) {
  const enderecos = [...Object.values(enderecosDaPagina(base)), `${base}/swagger`]
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    enderecos.map(endereco => `  <url><loc>${endereco}</loc></url>\n`).join('') +
    '</urlset>\n'
}

module.exports = {
  enderecosDaPagina,
  robotsTxt,
  sitemapXml
}
