/** Configuração - REST SERVER
 * -- PARA A ALTERAÇÃO SER APLICADA É NECESSÁRIO REINICIAR O SERVIDOR. --
 */

/* Tempo de validade do token. (Default: "1h") */
const tokenTimeout = '1h'

/* Porta para acesso aos endpoints. (Default: 3000) */
const porta = 3000

/**
 * Reiniciar os dados quando subir o servidor.
 * Com essa opção como 'true', sempre que subir o servidor os dados
 * em 'db.json' e 'users.json' serão sobrepostos com os arquivos do diretório 'backup'.
 * (Default: true)
 */
const reiniciarDadosAoSubirServidor = true

/**
 * Informações das requisições serão impressas no console.
 * Debug ativado apenas se 'imprimirHeaderDaRequisicao: true' ou 'imprimirCorpoDaRequisicao: true'
 * Default:
 * imprimirHeaderDaRequisicao: false,
 * imprimirCorpoDaRequisicao: false,
 * imprimirHoraDaRequisicao: true,
 * imprimirIpQueEfetuouARequisicao: false
 */
const debug = {
  imprimirHeaderDaRequisicao: false,
  imprimirCorpoDaRequisicao: false,
  imprimirHoraDaRequisicao: true,
  imprimirIpQueEfetuouARequisicao: false
}

/* Uma pequena brincadeira em arte ASCII no console. (Default: false) */
const zoeira = false

module.exports = { tokenTimeout, porta, reiniciarDadosAoSubirServidor, debug, zoeira }
