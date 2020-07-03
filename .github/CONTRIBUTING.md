
# Como contribuir

[![Continuous Delivery](https://github.com/PauloGoncalvesBH/ServeRest/workflows/Continuous%20Delivery/badge.svg)](https://github.com/PauloGoncalvesBH/ServeRest/actions)
[![Continuous Integration](https://github.com/PauloGoncalvesBH/serverest/workflows/Continuous%20Integration/badge.svg)](https://github.com/PauloGoncalvesBH/ServeRest/actions)
[![codecov](https://codecov.io/gh/PauloGoncalvesBH/ServeRest/branch/master/graph/badge.svg)](https://codecov.io/gh/PauloGoncalvesBH/ServeRest)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

---

**Esse documento apresenta todas as informações necessárias para que possa colaborar com o projeto de forma independente.**

Você pode contribuir de várias maneiras, sendo as mais conhecidas as seguintes:

- Localizando e relatando bugs
- Sugerindo melhorias
- Tirando dúvidas dos outros usuários
- Corrigindo bugs ou implementando novos recursos
- Melhorando a documentação
- Traduzindo a documentação
- Melhorando a estrutura do código

# Etapas para contribuir

1. [Fork](https://help.github.com/articles/fork-a-repo/) este repositório para sua própria conta GitHub e, em seguida, [clone](https://help.github.com/articles/cloning-a-repository/) no seu computador;
2. Instale as dependências de desenvolvimento: `npm install`;
3. Faça as alterações necessárias;
4. Faça o seu commit usando `npm run commit`;
5. Envie um [pull request](https://help.github.com/articles/about-pull-requests/);
6. Aguarde o resultado das validações realizadas na integração contínua. Caso haja alguma quebra, analise e faça as correções necessárias.
### Pull Requests que não passarem nas validações da integração contínua não serão revisados.

### Legenda
#### 💥 > Validação realizada na integração contínua
#### 💻 > Validação realizada no pré-commit

## 💥 Testes

Os testes são importantes para garantir a integridade do projeto a cada alteração realizada. É importante que atente de que a sua alteração necessite de novos testes ou adequação nos já existentes.

Os testes são criados com [mocha](https://www.npmjs.com/package/mocha) e [supertest](https://www.npmjs.com/package/supertest) e validados com [chai](https://www.npmjs.com/package/chai).

Para executá-los, execute o comando `npm test`.

## 💥 Cobertura de código

[![codecov](https://codecov.io/gh/PauloGoncalvesBH/ServeRest/branch/master/graph/badge.svg)](https://codecov.io/gh/PauloGoncalvesBH/ServeRest)

Usamos o [nyc](https://www.npmjs.com/package/nyc) para validar a cobertura de código.

É importante que todo o código esteja com 100% de cobertura para podermos ter segurança que toda alteração no código será validada.

Para validar a cobertura localmente execute os testes. É apresentado um report no terminal informando a cobertura de todos os arquivos em `/src` (exceto `server.js`). Se algum dos arquivos não estiver com 100% em todas as métricas crie os testes necessários.

## 💥💻 Lint

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Usamos o [standard](https://www.npmjs.com/package/standard) como linter e formatter do código.

Execute `npm run lint` para padronizar os arquivos.

Execute `npm run lint:fix` para corrigir automaticamente os problemas encontrados pelo lint.

> O commit é abortado caso esse padrão não seja seguido

## 💥💻 Commit

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

As mensagens de commit devem seguir o padrão do _conventional commit_.

Para saber mais, acesse esses links:
- [Especificação do Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/)
- [Regras do @commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional).

Execute `npm run commit` para ter um painel interativo que permite seguir o padrão de commit de forma fácil.

> O commit é abortado caso esse padrão não seja seguido

## Documentação (api-doc)

A documentação, disponibilizada na url <https://serverest.js.org>, é editada no [apiary](https://apiary.io/home) e gerada a partir do [aglio](https://www.npmjs.com/package/aglio).

Para atualizar:
1. Acesse o [editor do ServeRest no Apiary](https://app.apiary.io/serverest/editor) e faça as alterações necessárias.
    - É preciso ter permissão de edição.
2. Realize o download do arquivo `serverest.apib` e salve esse arquivo na raiz do _ServeRest_.
3. Execute o comando `npm run generate-doc`

## Reconhecimento de contribuição

Todos aqueles que contribuíram com o projeto, independente do tipo de contribuição, devem ser reconhecidos.

Por isso, utilizamos o bot [@all-contributors](https://allcontributors.org/docs/en/bot/overview), que cria um Pull Request atualizando a seção de [contribuidores no README](./README.md/#contributors-).

Para entender como utilizar, basta acessar as [intruções de uso do bot](https://allcontributors.org/docs/en/bot/usage). 

## Execução do Projeto via Makefile

Com intuito de ajudar o desenvolvedor, criamos o arquivo Makefile para executar, buildar e parar o projeto usando o docker. Pode ser executados o seguintes comandos:

### Build 
Pra fazer o build da imagem Docker com o projeto local,  use o comando no terminal:
```sh
make build
```

### Build/run 
Pra fazer o build e executar a imagem Docker com o projeto local,  use o comando no terminal:
```sh
make build/run
```

### Run 
Pra executar a imagem Docker com o projeto local,  use o comando no terminal:
```sh
make run
```

### Stop 
Pra  parar a execução da imagem Docker com o projeto local,  use o comando no terminal:
```sh
make stop
```

### Clean
Pra apagar a imagem Docker com o projeto local,  use o comando no terminal:
```sh
make clean
```