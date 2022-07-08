'use strict'

module.exports = {
  INTERNAL_ERROR: 'Abra uma issue informando essa resposta. https://github.com/ServeRest/ServeRest/issues',
  TIMEOUT: 'Timeout da requisição atingido',
  POST_SUCCESS: 'Cadastro realizado com sucesso',
  DELETE_SUCCESS: 'Registro excluído com sucesso',
  DELETE_NONE: 'Nenhum registro excluído',
  PUT_SUCCESS: 'Registro alterado com sucesso',
  LOGIN_SUCCESS: 'Login realizado com sucesso',
  LOGIN_FAIL: 'Email e/ou senha inválidos',
  EMAIL_ALREADY_USED: 'Este email já está sendo usado',
  NAME_ALREADY_USED: 'Já existe produto com esse nome',
  REQUIRED_ADMIN: 'Rota exclusiva para administradores',
  INVALID_TOKEN: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais',
  LIMIT_JUST_ONE_CART: 'Não é permitido ter mais de 1 carrinho',
  INVALID_IDPRODUCT: 'Produto não encontrado',
  INSUFFICIENT_STOCK: 'Produto não possui quantidade suficiente',
  DELETE_USER_WITH_CART: 'Não é permitido excluir usuário com carrinho cadastrado',
  DELETE_PRODUCT_WITH_CART: 'Não é permitido excluir produto que faz parte de carrinho',
  CART_WITH_DUPLICATE_PRODUCT: 'Não é permitido possuir produto duplicado',
  NO_CART: 'Não foi encontrado carrinho para esse usuário',
  REPLENISHED_STOCK: 'Estoque dos produtos reabastecido',
  USER_NOT_FOUND: 'Usuário não encontrado',
  CART_NOT_FOUND: 'Carrinho não encontrado',
  PRODUCT_NOT_FOUND: 'Produto não encontrado'
}
