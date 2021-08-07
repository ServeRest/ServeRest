'use strict'

const axios = require('axios')

module.exports = async () => {
  const { data } = await axios.get('https://opencollective.com/serverest/members/all.json')
  const userArray = removeAdminAndHostUser(data)
  let arrayNameUsers = getOnlyNameFromAllUsers(userArray)
  arrayNameUsers = removeDuplicatedValuesFromArray(arrayNameUsers)
  const randomFinancialContributor = arrayNameUsers[Math.floor(Math.random() * arrayNameUsers.length)]
  return randomFinancialContributor
}

const removeAdminAndHostUser = userArray => {
  return userArray.filter((user) => user.role !== 'ADMIN' && user.role !== 'HOST' && user.name !== 'Paulo Gonçalves')
}

const getOnlyNameFromAllUsers = userArray => {
  return Object.keys(userArray).map((key) => userArray[key].name)
}

const removeDuplicatedValuesFromArray = array => {
  return [...new Set(array)]
}
