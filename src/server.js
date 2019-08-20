const bodyParser = require("body-parser");
const colors = require("colors");
const fs = require("fs");
const jsonServer = require("json-server");

const createToken = require("./token.js").createToken;
const porta = require("../conf.js").porta;
const verifyToken = require("./token.js").verifyToken;
const zoeira = require("../conf.js").zoeira;

const server = jsonServer.create();
const router = jsonServer.router("./data/db.json");

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

function readUserFile() {
  return JSON.parse(fs.readFileSync("./data/users.json", "UTF-8"));
}

function isAuthenticated({ email, password }) {
  let userdb = readUserFile();
  return userdb.users.findIndex(user => user.email === email && user.password === password) !== -1;
}

function errorResponse(res, message) {
  res.status(401).json({ message });
}

server.post("/auth/registrar", (req, res) => {
  const { email, password } = req.body;

  let userdb = readUserFile();
  const emailAlreadyExist = userdb.users.findIndex(user => user.email === email) !== -1;

  if (emailAlreadyExist) {
    errorResponse(res, "Email já cadastrado");
    return;
  }

  fs.readFile("./data/users.json", (err, data) => {
    if (err) {
      errorResponse(res, err);
      return;
    }

    // Get current users data
    var data = JSON.parse(data.toString());

    let idOfLastItem = data.users[data.users.length - 1].id;

    // Add new user
    data.users.push({ id: idOfLastItem + 1, email: email, password: password });
    let writeData = fs.writeFile("./data/users.json", JSON.stringify(data), (err) => {
      // WRITE
      if (err) {
        errorResponse(res, err);
        return;
      }
    });
  });

  // Create token for new user
  const accessToken = createToken({ email, password });
  res.status(201).json({ accessToken });
});

server.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (isAuthenticated({ email, password }) === false) {
    errorResponse(res, "Email ou password incorreto");
    return;
  }
  const accessToken = createToken({ email, password });
  res.status(200).json({ accessToken });
});

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined) {
    errorResponse(res, "Autenticação necessária");
    return;
  }
  if (req.headers.authorization.split(" ")[0] !== "Bearer") {
    errorResponse(res, "Tipo de autenticação inválido");
    return;
  }
  const token = req.headers.authorization.split(" ")[1];
  if (token == undefined) {
    errorResponse(res, "Token de acesso vazio");
    return;
  }
  try {
    if (verifyToken(token) instanceof Error) {
      errorResponse(res, "Token de acesso não é válido");
      return;
    }
    next();
  } catch (err) {
    errorResponse(res, "Token de acesso revogado");
  }
});

server.use(router);

server.listen(porta, () => {
  console.log(
    "Servidor REST criado por Paulo Gonçalves <paulorochag@hotmail.com>.\nDúvidas? Acesse: https://github.com/PauloGoncalvesBH/fake-api-school/blob/master/README.md"
      .cyan
  );

  if (zoeira) console.log("\n✧*｡٩(ˊᗜˋ*)و✧*｡ BORA ESTUDAR (╯°□°）╯︵ ┻━┻".yellow);

  var jsonDb = JSON.parse(fs.readFileSync("./data/db.json", "UTF-8"));

  console.log(`\nEndpoints disponíveis que necessitam de autenticação:`.gray);

  for (var endpoint in jsonDb) {
    console.log(`  http://localhost:${porta}/${endpoint}`.gray);
  }
  console.log("\nEndpoints exclusivos de autenticação:".gray);
  console.log(`  http://localhost:${porta}/auth/login`.gray);
  console.log(`  http://localhost:${porta}/auth/registrar\n`.gray);
  console.log(`O servidor está de pé e em execução na porta ${porta}!`.green);
});
