const bodyParser = require("body-parser");
const colors = require("colors");
const fs = require("fs");
const jsonServer = require("json-server");

const createToken = require("./token.js").createToken;
const overwriteDataFilesWithbackupFiles = require("./readWriteFiles.js").overwriteDataFilesWithbackupFiles;
const porta = require("../conf.js").porta;
const readUserFile = require("./readWriteFiles.js").readUserFile;
const verifyToken = require("./token.js").verifyToken;
const zoeira = require("../conf.js").zoeira;

const server = jsonServer.create();
const router = jsonServer.router("./data/db.json");

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

server.post("/auth/registrar", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email ou password em branco" });
    return;
  }

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailIsValid) {
    res.status(400).json({ message: "Email inválido" });
    return;
  }

  const emailAlreadyExist = readUserFile().users.findIndex(user => user.email === email) !== -1;

  if (emailAlreadyExist) {
    res.status(400).json({ message: "Email já cadastrado" });
    return;
  }

  fs.readFile("./data/users.json", (err, data) => {
    if (err) {
      res.status(500).json({ err });
      return;
    }

    var data = JSON.parse(data.toString());

    const idOfLastItem = data.users[data.users.length - 1].id;

    data.users.push({ id: idOfLastItem + 1, email: email, password: password });
    fs.writeFile("./data/users.json", JSON.stringify(data), err => {
      if (err) {
        res.status(500).json({ err });
        return;
      }
    });
  });

  const token = createToken({ email, password });
  res.status(201).json({ token });
});

server.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  const existEmailAndPassword =
    readUserFile().users.findIndex(user => user.email === email && user.password === password) !== -1;
  if (!existEmailAndPassword) {
    res.status(400).json({ message: "Email ou password incorreto" });
    return;
  }
  const token = createToken({ email, password });
  res.status(200).json({ token });
});

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined) {
    res.status(401).json({ message: "Autenticação necessária" });
    return;
  }
  if (req.headers.authorization.split(" ")[0] !== "Bearer") {
    res.status(401).json({ message: "Tipo de autenticação deve ser Bearer" });
    return;
  }
  const token = req.headers.authorization.split(" ")[1];
  if (token == undefined) {
    res.status(401).json({ message: "Token de acesso vazio" });
    return;
  }
  if (verifyToken(token) instanceof Error) {
    res.status(401).json({ message: "Token de acesso não é válido" });
    return;
  }
  next();
});

server.use(router);

server.listen(porta, () => {
  overwriteDataFilesWithbackupFiles();
  console.log(
    "Servidor REST para estudo de testes de API.\nDúvidas? Acesse: https://github.com/PauloGoncalvesBH/fake-api-school"
      .cyan
  );

  if (zoeira) console.log("\n✧*｡٩(ˊᗜˋ*)و✧*｡ BORA ESTUDAR (╯°□°）╯︵ ┻━┻".yellow);

  const jsonDb = JSON.parse(fs.readFileSync("./data/db.json", "UTF-8"));

  console.log(`\nEndpoints disponíveis que necessitam de autenticação:`.gray);

  for (let endpoint in jsonDb) {
    console.log(`  http://localhost:${porta}/${endpoint}`.gray);
  }
  console.log("\nEndpoints exclusivos de autenticação:".gray);
  console.log(`  http://localhost:${porta}/auth/login`.gray);
  console.log(`  http://localhost:${porta}/auth/registrar\n`.gray);
  console.log(`O servidor está de pé e em execução na porta ${porta}!`.green);
});
