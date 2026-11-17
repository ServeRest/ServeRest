'use strict'

// Sem dependências do servidor: o build da imagem roda isto antes de copiar o resto do código.
const { mkdirSync, readFileSync, writeFileSync } = require('fs')
const { createRequire } = require('module')
const { join } = require('path')
const zlib = require('zlib')

const { brotli } = require('../utils/brotli')

// O swagger-ui-dist é dependência do swagger-ui-express, não nossa: resolvido a partir dele, é a
// pasta que ele serve.
const doSwaggerUiExpress = createRequire(require.resolve('swagger-ui-express'))
const pastaDoSwaggerUi = doSwaggerUiExpress('swagger-ui-dist/absolute-path')()

// Fora da pasta que o express.static serve, para o .br e o .gz não virarem URLs; a versão no
// caminho impede servir a compressão de outra versão depois de atualizar as dependências. A
// SWAGGER_UI_PRECOMPRESSED_DIR troca a pasta nos testes, que assim não dependem da do repositório
// nem gravam nela; lida a cada chamada, vale para o app carregado depois de mudá-la.
function pastaPrecomprimida () {
  return process.env.SWAGGER_UI_PRECOMPRESSED_DIR || join(__dirname, '../../swagger-ui-precomprimido',
    doSwaggerUiExpress('swagger-ui-dist/package.json').version)
}

// Os três maiores arquivos do Swagger UI; o bundle tem 1,5 MB sem compressão.
const ARQUIVOS_GRANDES = [
  'swagger-ui-bundle.js',
  'swagger-ui-standalone-preset.js',
  'swagger-ui.css'
]

// Grava em destino o .br (qualidade 11) e o .gz de cada arquivo de origem. Roda no build, onde o
// tempo da qualidade máxima não pesa em nenhuma requisição.
function precomprimir (origem, destino, arquivos) {
  mkdirSync(destino, { recursive: true })
  for (const arquivo of arquivos) {
    const corpo = readFileSync(join(origem, arquivo))
    writeFileSync(join(destino, arquivo + '.br'), brotli(corpo, 11))
    writeFileSync(join(destino, arquivo + '.gz'), zlib.gzipSync(corpo, { level: 9 }))
  }
}

module.exports = { ARQUIVOS_GRANDES, pastaDoSwaggerUi, pastaPrecomprimida, precomprimir }
