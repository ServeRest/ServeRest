/** Configuração - REST SERVER
 * -- PARA A ALTERAÇÃO SER APLICADA É NECESSÁRIO REINICIAR O SERVIDOR. --
 */
module.exports = {
  /* Tempo de validade do token. (Default: "1h") */
  tokenTimeout: "1h",

  /* Porta para acesso aos endpoints. (Default: 3000) */
  porta: 3000,

  /**
   * Reiniciar os dados quando subir o servidor.
   * Com essa opção como 'true', sempre que subir o servidor os dados
   * em 'db.json' e 'users.json' serão sobrepostos com os arquivos do diretório 'backup'.
   * (Default: true)
   */
  reiniciarDadosAoSubirServidor: true,

  /**
   * Informações das requisições serão impressas no console.
   * Debug ativado apenas se 'imprimirHeaderDaRequisicao: true' ou 'imprimirCorpoDaRequisicao: true'
   * Default:
   * imprimirHeaderDaRequisicao: false,
   * imprimirCorpoDaRequisicao: false,
   * imprimirHoraDaRequisicao: true,
   * imprimirIpQueEfetuouARequisicao: true
   */
  debug: {
    imprimirHeaderDaRequisicao: false,
    imprimirCorpoDaRequisicao: false,
    imprimirHoraDaRequisicao: true,
    imprimirIpQueEfetuouARequisicao: true
  },

  /* Uma pequena brincadeira em arte ASCII no console. (Default: false) */
  zoeira: false
};
