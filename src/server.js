import bodyParser from "body-parser";
import fs from "fs";
import jsonServer from "json-server";

import { porta } from "../conf.js";
import printStartServerMessage from "./consoleMessage.js";
import printDebugInfoOnConsole from "./debug.js";
import { overwriteDataFilesWithbackupFiles, readUserFile } from "./readWriteFiles.js";
import { createToken, verifyToken } from "./token.js";

const server = jsonServer.create();
const router = jsonServer.router("./data/db.json");

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

server.post("/auth/registrar", (req, res) => {
  printDebugInfoOnConsole(req);
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

  fs.readFile("./data/users.json", "utf-8", (err, data) => {
    if (err) {
      res.status(500).json({ err });
      return;
    }
    var data = JSON.parse(data.toString());
    data.users.push({ id: data.users.length + 1, email: email, password: password });
    fs.writeFile("./data/users.json", JSON.stringify(data, null, "  "), "utf-8", err => {
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
  printDebugInfoOnConsole(req);
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
  printDebugInfoOnConsole(req);
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
  printStartServerMessage();
});
