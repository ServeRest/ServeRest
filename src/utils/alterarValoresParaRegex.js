module.exports = queryString => {
  Object.keys(queryString).forEach(key => {
    if (['nome', 'password', 'descricao'].includes(key)) {
      try {
        queryString[key] = new RegExp(queryString[key])
      } catch (error) {}
    }
  })
  return queryString
}
