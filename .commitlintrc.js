module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0, 'always', 'Infinity'],
    // Uma linha do corpo que cita uma issue ou um PR (#123) é lida como rodapé: sem isto, ela teria limite de
    // 100 caracteres, que o corpo não tem.
    'footer-max-line-length': [0, 'always', 'Infinity'],
  },
}
