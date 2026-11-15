/* eslint-env browser */
// Tema e tamanho do texto antes da primeira pintura, para a página não piscar no esquema errado.
// Carregado sem defer, antes do CSS. As chaves são as mesmas de app.js, que grava as escolhas dos botões
// da barra do topo (um teste de unidade confere que as duas cópias são iguais). O tema guardado é claro ou
// escuro depois do primeiro clique no sol ou na lua; antes disso vale o do sistema.
(function () {
  'use strict'

  const THEME_KEY = 'serverestTheme'
  const TEXT_KEY = 'serverestTextSize'
  const THEMES = ['system', 'light', 'dark']
  const TEXT_SIZES = ['normal', 'grande', 'maior']

  function read (key, allowed, fallback) {
    try {
      const value = window.localStorage.getItem(key)
      return allowed.includes(value) ? value : fallback
    } catch (e) {
      return fallback
    }
  }

  function systemDark () {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch (e) {
      return false
    }
  }

  const theme = read(THEME_KEY, THEMES, 'system')
  const dark = theme === 'dark' || (theme === 'system' && systemDark())
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  document.documentElement.setAttribute('data-text', read(TEXT_KEY, TEXT_SIZES, 'normal'))
})()
