'use strict'

const fs = require('fs')
const { join } = require('path')

const dirBackupDbJson = join(__dirname, '../../data/backup/db.json')
const dirBackupUsersJson = join(__dirname, '../../data/backup/users.json')
const dirDbJson = join(__dirname, '../../data/db.json')
const dirUsersJson = join(__dirname, '../../data/users.json')

function readAndOverwriteFile (readPath, writePath) {
  fs.readFile(readPath, (err, data) => {
    if (err) {
      console.log(err)
      return
    }
    fs.writeFile(writePath, data, err => {
      if (err) {
        console.log(err)
      }
    })
  })
}

function overwriteDataFilesWithbackupFiles () {
  readAndOverwriteFile(dirBackupDbJson, dirDbJson)
  readAndOverwriteFile(dirBackupUsersJson, dirUsersJson)
}

function readUserFile () {
  return JSON.parse(fs.readFileSync(dirUsersJson, 'UTF-8'))
}

module.exports = { overwriteDataFilesWithbackupFiles, readUserFile }
