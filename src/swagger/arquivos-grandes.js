'use strict'

// Sem dependências do servidor: o build da imagem roda isto antes de copiar o resto do código.
const { readFileSync, writeFileSync } = require('fs')
const { createRequire } = require('module')
const { join } = require('path')
const zlib = require('zlib')

// A pasta que o swagger-ui-express serve: o swagger-ui-dist é dependência dele, não nossa.
const pastaDoSwaggerUi = createRequire(require.resolve('swagger-ui-express'))(
  'swagger-ui-dist/absolute-path'
)()

// Os três maiores arquivos do Swagger UI; o bundle tem 1,5 MB sem compressão.
const ARQUIVOS_GRANDES = [
  'swagger-ui-bundle.js',
  'swagger-ui-standalone-preset.js',
  'swagger-ui.css'
]

// Grava o .br (qualidade 11) e o .gz ao lado de cada arquivo. Roda no build, onde o tempo da
// qualidade máxima não pesa em nenhuma requisição.
function precomprimir (pasta, arquivos) {
  for (const arquivo of arquivos) {
    const caminho = join(pasta, arquivo)
    const corpo = readFileSync(caminho)
    writeFileSync(caminho + '.br', zlib.brotliCompressSync(corpo, {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: corpo.length
      }
    }))
    writeFileSync(caminho + '.gz', zlib.gzipSync(corpo, { level: 9 }))
  }
}

module.exports = { ARQUIVOS_GRANDES, pastaDoSwaggerUi, precomprimir }
