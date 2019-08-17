


# Fake API School

[![library: json-server](https://img.shields.io/badge/library-json--server-blue)](https://www.npmjs.com/package/json-server)

### Esse simples material tem a finalidade de fornecer um servidor REST com dados de uma escola fictícia para estudo de testes de API.

É composto apenas por 1 arquivo contendo os endpoints e 1 arquivo com scripts de como subir o servidor local.

Caso queira utilizar os endpoints criados sem ter seguir os passos abaixos,
acesse essa [URL](https://my-json-server.typicode.com/paulogoncalvesbh/fake-api-school). Tem o porém de que os **dados não são persistidos** e as requisições ficam cacheadas por 1 minuto, o que é um dificultor para o estudo.

Mais baixo detalho como subir um servidor local com os endpoints listados no arquivo [db.json](/db.json).

## Recursos existentes 

  <details><p><summary>Abra para ver os recursos existentes</summary>

1. turmas
    1. id
    2. descricao
    3. idHorario
    4. alunos
        1. idAluno

2. horarios
    1. id
    2. turno
    3. segunda
    4. terca
    5. quarta
    6. quinta
    7. sexta

3. alunos
    1. id
    2. nome
    3. anoNascimento

4. professores
    1. id
    2. idDisciplina
    3. nome

5. locais
    1. id
    2. nome

6. disciplinas
    1. id
    2. idLocal
    3. nome
</p> </details>

## Instalação
### Pré-requisitos

- [Git](https://git-scm.com/download/) e [Node.js](https://nodejs.org/en/download/) instalados.

### Clonando e instalando a dependência

Todos os comandos abaixo são feitos no _terminal_.

**1** - Faça um clone do repositório e acesse o diretório criado pelo clone:

```sh
git clone https://github.com/PauloGoncalvesBH/fake-api-school.git && cd fake-api-school
```

**2** - Execute o comando para instalar o [json-server](https://www.npmjs.com/package/json-server) globalmente.

```sh
npm install
```

## Subindo o servidor local

Há dois modos de subir o servidor local, e dependem da sua necessidade:

1. Caso queira ver, após uma requisição de alteração de dados, o arquivo [db.json](/db.json) alterado:

```sh
npm run server-local-data
```
Com esse script será iniciado o servidor apontando pro arquivo [db.json](/db.json).

2. Caso queira que o arquivo [db.json](/db.json) não seja alterado, sendo preciso apenas reiniciar o servidor para que os dados voltem ao seu estado inicial:

```sh
npm run server-remote-data
```
Com esse script será iniciado o servidor apontando pro schema da página [https://my-json-server.typicode.com/paulogoncalvesbh/fake-api-school](https://my-json-server.typicode.com/paulogoncalvesbh/fake-api-school).

## Aprofundando na criação de um server para testes de API
Sugiro a leitura dos seguintes materiais:
1. [Repositório da lib Json-server](https://github.com/typicode/json-server)
2. [Como criar um fake REST server online](https://my-json-server.typicode.com)
