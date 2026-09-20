'use strict'

const { Joi } = require('express-validation')

// Allowlist de caracteres textuais: ASCII imprimível mais letras, acentos e dígitos
// de qualquer idioma, para que "José" e "Ação" continuem válidos. Ficam de fora os
// emojis e pictogramas, as marcas que compõem emojis de bandeira e de tecla, o
// seletor de variação e os caracteres de controle e invisíveis.
const CARACTERES_TEXTUAIS = /^(?:(?![\p{Extended_Pictographic}\p{Me}\uFE0F])[ -~\p{L}\p{M}\p{N}])*$/u

// A mensagem devolvida ao usuário é montada em montarMensagemDeErroDeSchema a partir
// do tipo do erro. Esse template existe só para o Joi reconhecer o código customizado.
const MENSAGEM_DE_EMOJI = { 'string.emoji': '{{#label}} não deve conter emojis ou caracteres não textuais' }

const recusarEmoji = (valor, helpers) =>
  CARACTERES_TEXTUAIS.test(valor) ? valor : helpers.error('string.emoji')

// Campos de texto do body, onde o valor sempre chega como string.
exports.texto = () => Joi.string().custom(recusarEmoji).messages(MENSAGEM_DE_EMOJI)

// Campos de texto usados como filtro na query, que chegam como número quando só têm
// dígitos por causa do express-query-int.
exports.filtroDeTexto = () => Joi.any().custom(
  (valor, helpers) => typeof valor === 'string' ? recusarEmoji(valor, helpers) : valor
).messages(MENSAGEM_DE_EMOJI)

// O Joi aceita emoji no email mesmo com a validação de formato, então a recusa é somada.
exports.email = () => Joi.string().email().custom(recusarEmoji).messages(MENSAGEM_DE_EMOJI)
