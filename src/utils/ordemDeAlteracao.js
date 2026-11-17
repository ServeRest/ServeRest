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

exports.doMaisNovoAoMaisAntigo = documentos => documentos
  .sort((a, b) => marca(b) - marca(a) || a._id.localeCompare(b._id))
  .map(tirarMarca)
