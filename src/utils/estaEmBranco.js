// Valor que não filtra: o vazio (?nome=) ou só espaços (?nome=%20), como sai de um formulário em branco.
module.exports = valor => typeof valor === 'string' && valor.trim() === ''
