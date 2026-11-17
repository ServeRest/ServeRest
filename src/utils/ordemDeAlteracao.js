'use strict'

let ultimo = 0

// Sempre crescente: duas gravações no mesmo milissegundo mantêm a ordem em que aconteceram.
exports.marcarAlteracao = () => {
  ultimo = Math.max(Date.now(), ultimo + 1)
  return ultimo
}

const tirarMarca = ({ alteradoEm, ...documento }) => documento

exports.semMarca = documento => documento ? tirarMarca(documento) : documento

// Registros da semente não têm marca: vão para o fim, na ordem do _id.
const marca = documento => documento.alteradoEm || 0

// Parte da maior marca já gravada, para um relógio que voltou após reiniciar não pôr gravações novas abaixo das antigas.
exports.continuarDaMaiorMarca = async datastore => {
  const documentos = await datastore.find({})
  ultimo = documentos.reduce((maior, documento) => Math.max(maior, marca(documento)), ultimo)
}

// Comparação nativa do _id, a mesma ordem que o NeDB usava.
const compararId = (a, b) => (a._id > b._id) - (a._id < b._id)

exports.doMaisNovoAoMaisAntigo = documentos => documentos
  .sort((a, b) => marca(b) - marca(a) || compararId(a, b))
  .map(tirarMarca)
