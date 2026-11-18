/* istanbul ignore file */
'use strict'

// Roda no build da imagem do Cloud Run (Dockerfile.gcloud). Se o swagger-ui-dist renomear um dos
// arquivos, o build falha aqui, e a revisão que está no ar continua servindo.
const {
  ARQUIVOS_GRANDES,
  pastaDoSwaggerUi,
  pastaPrecomprimida,
  precomprimir
} = require('../src/swagger/arquivos-grandes')

const destino = pastaPrecomprimida()
precomprimir(pastaDoSwaggerUi, destino, ARQUIVOS_GRANDES)
console.log(`Swagger UI pré-comprimido em ${destino}: ${ARQUIVOS_GRANDES.join(', ')}`)
