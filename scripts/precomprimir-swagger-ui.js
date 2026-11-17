/* istanbul ignore file */
'use strict'

// Roda no build da imagem do Cloud Run (Dockerfile.gcloud). Se o swagger-ui-dist renomear um dos
// arquivos, o build falha aqui, e a revisão que está no ar continua servindo.
const { ARQUIVOS_GRANDES, pastaDoSwaggerUi, precomprimir } = require('../src/swagger/arquivos-grandes')

precomprimir(pastaDoSwaggerUi, ARQUIVOS_GRANDES)
console.log(`Swagger UI pré-comprimido em ${pastaDoSwaggerUi}: ${ARQUIVOS_GRANDES.join(', ')}`)
