// O E2E remoto passa pelo rate limiter do servidor (src/middlewares/rate-limiter.js), que aceita 300
// requisições por IP a cada 30 s. A suíte inteira manda mais que isso em menos de 30 s e recebia 429.
const JANELA_MS = 30000
// Margem abaixo das 300 para a variação de latência entre o envio aqui e a chegada no servidor.
const MAXIMO_POR_JANELA = 250
const INTERVALO_MS = JANELA_MS / MAXIMO_POR_JANELA
const NOVAS_TENTATIVAS_APOS_429 = 2

const esperarMs = ms => new Promise(resolve => setTimeout(resolve, ms))

function criarLimitador ({ agora = Date.now, esperar = esperarMs } = {}) {
  let proximaVez = 0

  // Espaçamento fixo em vez de contar as requisições dos últimos 30 s. Com a contagem a suíte mandaria
  // 250 de uma vez e depois pararia até a mais antiga sair da janela, quase 30 s parados dentro de um
  // único teste. Com o espaçamento cada envio espera no máximo um intervalo e nenhuma janela de 30 s
  // recebe mais de 251. Requisições simultâneas entram na fila pela ordem em que pedem a vez.
  function aguardarVez () {
    const vez = Math.max(agora(), proximaVez)
    proximaVez = vez + INTERVALO_MS
    return esperar(vez - agora())
  }

  return function limitar (test) {
    // A requisição só sai quando o end roda, e o await do teste chega nele pelo then do superagent.
    const end = test.end
    test.end = function (fn) {
      aguardarVez().then(() => end.call(this, fn))
      return this
    }

    // O retry do superagent reenvia a mesma requisição antes de a resposta chegar às asserções, mas
    // reenvia na hora. O servidor não informa quando a janela vira, então a espera é a janela inteira.
    const retry = test._retry
    test._retry = function () {
      // O superagent ignora erro de rede quando já existe resposta, e a do 429 ficaria aqui. Sem limpar,
      // uma falha de rede no reenvio deixaria o teste parado até o timeout.
      this.response = undefined
      esperar(JANELA_MS).then(aguardarVez).then(() => retry.call(this))
      return this
    }

    // Só o 429 volta a ser enviado. Os demais casos devolvem false para não cair nos padrões do
    // superagent, que repetiriam também 5xx e erros de rede.
    return test.retry(NOVAS_TENTATIVAS_APOS_429, (erro, res) => res?.status === 429)
  }
}

module.exports = { criarLimitador, INTERVALO_MS, JANELA_MS }
