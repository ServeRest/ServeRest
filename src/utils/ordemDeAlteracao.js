'use strict'

const logger = require('./logger')

let ultimo = 0

// Sempre crescente: duas gravações no mesmo milissegundo mantêm a ordem em que aconteceram.
exports.marcarAlteracao = () => {
  ultimo = Math.max(Date.now(), ultimo + 1)
  return ultimo
}

// O find do NeDB já devolve cópias. Com undefined o JSON da resposta omite o campo sem copiar o
// documento de novo; o delete deixaria cada objeto maior e mais lento.
const tirarMarca = documento => { documento.alteradoEm = undefined }

exports.semMarca = documento => {
  if (documento) tirarMarca(documento)
  return documento
}

// Registros da semente não têm marca: vão para o fim, na ordem do _id.
const marca = documento => documento.alteradoEm || 0

// Parte da maior marca já gravada, para um relógio que voltou após reiniciar não pôr gravações novas abaixo das antigas.
// Se a leitura falhar, o contador segue do relógio e o servidor continua de pé.
exports.continuarDaMaiorMarca = async datastore => {
  try {
    const marcas = await datastore.find({}, { alteradoEm: 1, _id: 0 })
    ultimo = marcas.reduce((maior, documento) => Math.max(maior, marca(documento)), ultimo)
  } catch (erro) {
    /* istanbul ignore next */
    logger.log({ level: 'error', message: `Não foi possível ler a maior marca de alteração: ${erro.message}` })
  }
}

// Comparação nativa do _id, como o NeDB compara textos.
const compararId = (a, b) => (a._id > b._id) - (a._id < b._id)

exports.doMaisNovoAoMaisAntigo = documentos => {
  documentos.sort((a, b) => marca(b) - marca(a) || compararId(a, b))
  documentos.forEach(tirarMarca)
  return documentos
}
