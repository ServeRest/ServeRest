'use strict'

const axios = require('axios')

const logger = require('../utils/logger')

module.exports = async () => {
  try {
    const { data: users } = await axios.get('https://opencollective.com/serverest/members/all.json')
    const filteredUsers = removeAdminAndHostUser(users)
    const uniqueUserNames = getUniqueUserNames(filteredUsers)
    const randomFinancialContributor = getRandomElement(uniqueUserNames)
    return randomFinancialContributor
  } catch (error) {
    logger.log({ level: 'error', message: 'Failed to get financial contributor.' })
  }
}

const removeAdminAndHostUser = userArray => {
  return userArray.filter((user) => user.role !== 'ADMIN' && user.role !== 'HOST' && user.name !== 'Paulo Gonçalves')
}

const getUniqueUserNames = userArray => {
  const names = userArray.map(user => user.name)
  return [...new Set(names)]
}

const getRandomElement = array => {
  return array[Math.floor(Math.random() * array.length)]
}
