
module.exports = error => {
  const detalhesDoErro = error.details.body || error.details.query
  const mensagemDeErro = {}

  detalhesDoErro.forEach(erro => {
    const propriedade = erro.context.label
    const mapeamentoDoErro = {
      'any.only': `${propriedade} deve ser 'true' ou 'false'`,
      'any.required': `${propriedade} é obrigatório`,
      'array.base': `${propriedade} deve ser um array`,
      'array.includesRequiredUnknowns': `${propriedade} não contém 1 valor obrigatório`,
      'number.base': `${propriedade} deve ser um número`,
      'number.integer': `${propriedade} deve ser um inteiro`,
      'number.min': `${propriedade} deve ser maior ou igual a 0`,
      'number.positive': `${propriedade} deve ser um número positivo`,
      'object.base': `${propriedade} deve ser um objeto`,
      'object.unknown': `${propriedade} não é permitido`,
      'string.base': `${propriedade} deve ser uma string`,
      'string.email': `${propriedade} deve ser um email válido`,
      'string.empty': `${propriedade} não pode ficar em branco`,
      default: `${erro.message} - Erro ${erro.type} - Abra uma issue informando essa resposta. https://github.com/ServeRest/ServeRest/issues`
    }
    /* istanbul ignore next */
    mensagemDeErro[propriedade] = mapeamentoDoErro[erro.type] || mapeamentoDoErro.default
  })

  return mensagemDeErro
}
