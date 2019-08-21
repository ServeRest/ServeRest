import fs from "fs";

import { reiniciarDadosAoSubirServidor as restartFilesBeforeUpServer } from "../conf.js";

function readAndOverwriteFile(readPath, writePath) {
  fs.readFile(readPath, (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    fs.writeFile(writePath, data, err => {
      if (err) {
        console.log(err);
      }
    });
  });
}

function overwriteDataFilesWithbackupFiles() {
  if (restartFilesBeforeUpServer) {
    readAndOverwriteFile("./data/backup/db.json", "./data/db.json");
    readAndOverwriteFile("./data/backup/users.json", "./data/users.json");
  }
}

function readUserFile() {
  return JSON.parse(fs.readFileSync("./data/users.json", "UTF-8"));
}

export { overwriteDataFilesWithbackupFiles, readUserFile };
