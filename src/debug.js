import getHour from "./utils.js";
import { debug } from "../conf.js";

const printRequestHeader = debug.imprimirHeaderDaRequisicao;
const printRequestBody = debug.imprimirCorpoDaRequisicao;
const printHour = debug.imprimirHoraDaRequisicao;
const printRequestIP = debug.imprimirIpQueEfetuouARequisicao;

export default function printDebugInfoOnConsole(req) {
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
}
