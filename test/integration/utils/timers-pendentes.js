// Sem --exit, como no pre-push local, o mocha só encerra quando o event loop esvazia, e um timer com ref
// que sobra da suíte deixa o processo vivo para sempre. No CI o --exit esconde isso. Estes hooks rodam
// depois de todos os testes e falham a suíte quando sobra um timer assim.

// Um timer sem ref não segura o processo, mas pode criar um com ref quando dispara, como o amostrador de
// 1 s do express-status-monitor faz com o pidusage. A espera dá a ele a chance de disparar antes da contagem.
const ESPERA_MS = 1500
// Guardado ao carregar, antes que algum teste instale fake timers.
const esperar = global.setTimeout

module.exports = {
  afterAll: [
    function esperarTimersSemRef () {
      return new Promise(resolve => esperar(resolve, ESPERA_MS))
    },
    // Síncrono de propósito: o mocha só arma o timer de timeout de um hook que devolve promise, e esse
    // timer entraria na contagem. getActiveResourcesInfo lista um 'Timeout' por timer com ref.
    function falharSeSobrouTimerComRef () {
      const timers = process.getActiveResourcesInfo().filter(recurso => recurso === 'Timeout').length
      if (timers > 0) {
        throw new Error(`${timers} timer(s) com ref seguem ativos depois da suíte e impedem o mocha de encerrar sem --exit`)
      }
    }
  ]
}
