
module.exports = error => {
  const detalhesDoErro = error.details.body || error.details.query
  const objetoComMensagemDeErro = {}
  detalhesDoErro.forEach(erro => {
    const propriedade = erro.context.label
    switch (erro.type) {
      case 'any.required':
        objetoComMensagemDeErro[propriedade] = `${propriedade} é obrigatório`
        break
      case 'string.email':
        objetoComMensagemDeErro[propriedade] = `${propriedade} deve ser um email válido`
        break
      case 'string.base':
        objetoComMensagemDeErro[propriedade] = `${propriedade} deve ser uma string`
        break
      case 'object.unknown':
        objetoComMensagemDeErro[propriedade] = `${propriedade} não é permitido`
        break
      case 'array.includesRequiredUnknowns':
        objetoComMensagemDeErro[propriedade] = `${propriedade} não contém 1 valor obrigatório`
        break
      case 'array.base':
        objetoComMensagemDeErro[propriedade] = `${propriedade} deve ser um array`
        break
      case 'number.base':
        objetoComMensagemDeErro[propriedade] = `${propriedade} deve ser um número`
        break
      case 'number.integer':
        objetoComMensagemDeErro[propriedade] = `${propriedade} deve ser um inteiro`
        break
      case 'number.positive':
        objetoComMensagemDeErro[propriedade] = `${propriedade} deve ser um número positivo`
        break
      case 'number.min':
        objetoComMensagemDeErro[propriedade] = `${propriedade} deve ser maior ou igual a 0`
        break
      case 'any.only':
        objetoComMensagemDeErro[propriedade] = `${propriedade} deve ser 'true' ou 'false'`
        break
      /* istanbul ignore next */
      default:
        objetoComMensagemDeErro[propriedade] = erro.message
        break
    }
  })

  return objetoComMensagemDeErro
}
