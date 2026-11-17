'use strict'

// Sem dependências do servidor: o build da imagem usa isto antes de copiar o resto do código.
const zlib = require('zlib')

function brotli (corpo, qualidade) {
  return zlib.brotliCompressSync(corpo, {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: qualidade,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: corpo.length
    }
  })
}

module.exports = { brotli }
