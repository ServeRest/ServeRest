
module.exports = error => {
  const detalhesDoErro = error.details.body || error.details.query
  const mensagemDeErro = {}

  detalhesDoErro.forEach(erro => {
    const propriedade = erro.context.label
    const mapeamentoDoErro = {
      'any.required': `${propriedade} é obrigatório`,
      'string.email': `${propriedade} deve ser um email válido`,
      'string.empty': `${propriedade} não pode ficar em branco`,
      'string.base': `${propriedade} deve ser uma string`,
      'object.unknown': `${propriedade} não é permitido`,
      'array.includesRequiredUnknowns': `${propriedade} não contém 1 valor obrigatório`,
      'array.base': `${propriedade} deve ser um array`,
      'number.base': `${propriedade} deve ser um número`,
      'number.integer': `${propriedade} deve ser um inteiro`,
      'number.positive': `${propriedade} deve ser um número positivo`,
      'number.min': `${propriedade} deve ser maior ou igual a 0`,
      'any.only': `${propriedade} deve ser 'true' ou 'false'`,
      default: `${erro.message} - Erro ${erro.type} - Abra uma issue informando essa resposta. https://github.com/PauloGoncalvesBH/ServeRest/issues`
    }
    /* istanbul ignore next */
    mensagemDeErro[propriedade] = mapeamentoDoErro[erro.type] || mapeamentoDoErro.default
  })

  return mensagemDeErro
}
