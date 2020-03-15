const fs = require("fs");

const colors = require("colors");
const { porta, zoeira } = require("../conf.js");

module.exports = function printStartServerMessage() {
  console.log(
    "Servidor REST para estudo de testes de API.\nDúvidas? Acesse: https://github.com/PauloGoncalvesBH/rest-server".cyan
  );

  if (zoeira) console.log("\n✧*｡٩(ˊᗜˋ*)و✧*｡ BORA ESTUDAR (╯°□°）╯︵ ┻━┻".yellow);

  const objectDb = JSON.parse(fs.readFileSync("./data/db.json", "UTF-8"));

  console.log(`\nEndpoints disponíveis que necessitam de autenticação:`.gray);

  for (let endpoint in objectDb) {
    console.log(`  http://localhost:${porta}/${endpoint}`.gray);
  }
  console.log("\nEndpoints exclusivos de autenticação:".gray);
  console.log(`  http://localhost:${porta}/auth/login`.gray);
  console.log(`  http://localhost:${porta}/auth/registrar\n`.gray);
  console.log(`O servidor está de pé e em execução na porta ${porta}!`.green);
};
