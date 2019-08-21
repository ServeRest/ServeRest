const getHour = require("./utils.js");
let printRequestHeader = require("../conf.js").debug.imprimirHeaderDaRequisicao;
let printRequestBody = require("../conf.js").debug.imprimirCorpoDaRequisicao;
let printHour = require("../conf.js").debug.imprimirHoraDaRequisicao;
let printRequestIP = require("../conf.js").debug.imprimirIpQueEfetuouARequisicao;

module.exports = function printDebugInfoOnConsole(req) {
  if (printRequestBody || printRequestHeader) {
    const hour = printHour ? `[${getHour()}]` : "";
    console.log(`\nDEBUG REQUISIÇÃO ${hour}\n${req.method} ${req.hostname} ${req.originalUrl}`.magenta);

    if (printRequestIP) console.log(`IP: ${req.ip}`.magenta);

    if (printRequestHeader) {
      console.log("Header >>>".magenta);
      console.log(req.headers);
      console.log("<<< Fim do header".magenta);
    }

    if (printRequestBody) {
      console.log("Corpo >>>".magenta);
      console.log(req.body);
      console.log("<<< Fim do corpo".magenta);
    }
  }
};
