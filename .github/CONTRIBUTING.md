
# Como contribuir

[![Continuous Delivery](https://github.com/PauloGoncalvesBH/ServeRest/workflows/Continuous%20Delivery/badge.svg)](https://github.com/PauloGoncalvesBH/ServeRest/actions)
[![Continuous Integration](https://github.com/PauloGoncalvesBH/serverest/workflows/Continuous%20Integration/badge.svg)](https://github.com/PauloGoncalvesBH/ServeRest/actions)
[![codecov](https://codecov.io/gh/PauloGoncalvesBH/ServeRest/branch/trunk/graph/badge.svg)](https://codecov.io/gh/PauloGoncalvesBH/ServeRest)
[![Mutation testing badge](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2FPauloGoncalvesBH%2FServeRest%2Ftrunk)](https://dashboard.stryker-mutator.io/reports/github.com/PauloGoncalvesBH/ServeRest/trunk)
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

> Não tenha receio em contribuir se achar muito complexo as etapas para contribuir. **Basta pedir apoio em issue ou PR e receberá auxílio no que precisar.**

## Sumário
- [Etapas para contribuir](#etapas-para-contribuir)
    - [Legenda](#legenda)
    - [💥💻 Testes de API](#-testes-de-api)
        - [💥💻 Cobertura de código](#-cobertura-de-código)
    - [💥 Testes de Mutação](#-testes-de-mutação)
    - [💥💻 Lint](#-lint)
    - [💥💻 Commit](#-commit)
- [Publicação das releases](#publicação-das-releases)
- [Documentação (serverest.dev)](#documentação-serverestdev)
- [Reconhecimento de contribuição](#reconhecimento-de-contribuição)
- [Execução do projeto via Makefile](#execução-do-projeto-via-makefile)
    - [Build](#build)
    - [Build/run](#buildrun)
    - [Run](#run)
    - [Stop](#stop)
    - [Clean](#clean)

## Pré-requisitos

É preciso ter os seguintes programas instalados:

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/pt-br/download/)

## Etapas para contribuir

1. [Fork](https://help.github.com/articles/fork-a-repo/) este repositório para sua própria conta GitHub, [clone](https://help.github.com/articles/cloning-a-repository/) no seu computador e, em seguida, acesse o diretório criado;
2. Instale as dependências de desenvolvimento: `npm ci`
3. Faça as alterações necessárias;
4. Faça o seu commit usando `npm run commit`
5. Envie um [pull request](https://help.github.com/articles/about-pull-requests/);
6. Aguarde o resultado das validações realizadas na integração contínua. Caso haja alguma quebra, analise e faça as correções necessárias.

**Etapa extra e opcional:** Caso possua docker e alterou código dentro de `src/`, suba uma imagem docker e faça alguns testes manuais. Para saber como consulte a seção [Execução do projeto via Makefile](#execução-do-projeto-via-makefile).

### Legenda
#### 💥 > Validação realizada na integração contínua e entrega contínua
#### 💻 > Validação realizada localmente

## 💥💻 Testes de API

Os testes são importantes para garantir a integridade do projeto a cada alteração realizada. É importante que atente de que a sua alteração necessite de novos testes ou adequação nos já existentes.

Os testes são criados com [mocha](https://www.npmjs.com/package/mocha) e [supertest](https://www.npmjs.com/package/supertest) e validados com [chai](https://www.npmjs.com/package/chai).

Para executá-los, execute o comando `npm test`.

> O commit é abortado caso esse padrão não seja seguido

### 💥💻 Cobertura de código

[![codecov](https://codecov.io/gh/PauloGoncalvesBH/ServeRest/branch/trunk/graph/badge.svg)](https://codecov.io/gh/PauloGoncalvesBH/ServeRest)

Usamos o [nyc](https://www.npmjs.com/package/nyc) para validar a cobertura de código.

É importante que todo o código esteja com 100% de cobertura para podermos ter segurança que toda alteração no código será validada.

Para validar a cobertura localmente execute os testes. É apresentado um report no terminal informando a cobertura de todos os arquivos em `/src` (exceto `server.js`). Se algum dos arquivos não estiver com 100% em todas as métricas crie os testes necessários.

## 💥 Testes de Mutação

[![Mutation testing badge](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2FPauloGoncalvesBH%2FServeRest%2Ftrunk)](https://dashboard.stryker-mutator.io/reports/github.com/PauloGoncalvesBH/ServeRest/trunk)

O teste de mutação garante que os testes de API são efetivos e complementa a [cobertura de código](#-cobertura-de-código).

A lib utilizada é a [Stryker](http://stryker-mutator.io/).

Para rodar os testes de mutação, execute o comando `npm run test:mutation`.

Para aprofundar sobre como funciona os testes de mutação, leia o meu texto '[Teste de mutação 👽: O que é e como fica a cobertura de código?](https://github.com/PauloGoncalvesBH/teste-de-mutacao)'.

## 💥💻 Lint

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Usamos o [standard](https://www.npmjs.com/package/standard) como linter e formatter do código e [lint-staged](https://www.npmjs.com/package/lint-staged) para forçar lint das alterações que estão em staged do git.

Execute `npm run lint` para padronizar os arquivos.

Execute `npm run lint:fix` para corrigir automaticamente os problemas encontrados pelo lint.

> O commit é abortado caso esse padrão não seja seguido

## 💥💻 Commit

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

As mensagens de commit devem seguir o padrão do _conventional commit_.

Para saber mais, acesse esses links:
- [Especificação do Conventional Commit](https://www.conventionalcommits.org/)
- [Regras do @commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional).

Execute `npm run commit` para ter um painel interativo que permite seguir o padrão de commit de forma fácil.

> O commit é abortado caso esse padrão não seja seguido

---

## Publicação das releases

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A publicação de novas versões no [NPM](https://www.npmjs.com/package/serverest) e no [Docker](https://hub.docker.com/r/paulogoncalvesbh/serverest) é feita automaticamente após a execução com sucesso de todas as etapas da pipeline de [entrega contínua](./workflows/continuous_delivery.yml).

É utilizada a lib [Semantic-release](https://github.com/semantic-release/semantic-release) com personalizações no arquivo [.releaserc.js](../.releaserc.js).

| NPM dist-tag | branch |
|:---:|:---:
| @latest | master
| @beta | beta

Para aprofundar sobre como é feita a publicação do _ServeRest_, leia o texto '[Entrega contínua no ServeRest](https://github.com/PauloGoncalvesBH/entrega-continua-no-serverest)'.

## Documentação (serverest.dev)

A documentação, disponibilizada na url <https://serverest.dev>, é editada no [apiary](https://apiary.io/home) e gerada a partir do [aglio](https://www.npmjs.com/package/aglio).

Para atualizar:
1. Acesse o [editor do ServeRest no Apiary](https://app.apiary.io/serverest/editor) e faça as alterações necessárias.
    - É preciso ter permissão de edição.
2. Realize o download do arquivo `serverest.apib` e salve esse arquivo na raiz do _ServeRest_.
3. Execute o comando `npm run generate-doc`

## Reconhecimento de contribuição

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
![All Contributors](https://img.shields.io/badge/all_contributors-9-orange.svg?style=for-the-badge)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Todos aqueles que contribuíram com o projeto, independente do tipo de contribuição, devem ser reconhecidos.

Por isso, utilizamos o bot [@all-contributors](https://allcontributors.org/docs/en/bot/overview), que cria um Pull Request atualizando a seção de [contribuidores no README](../README.md/#contributors-).

Para entender como utilizar, basta acessar as [intruções de uso do bot](https://allcontributors.org/docs/en/bot/usage).

## Execução do Projeto via Makefile

Com intuito de ajudar o desenvolvedor, criamos o arquivo Makefile para executar, buildar e parar o projeto usando o docker. Os seguintes comandos estão disponíveis:

### Build 
Pra fazer o build da imagem Docker com o projeto local,  use o comando no terminal:
```sh
make build
```

### Run 
Pra executar a imagem Docker com o projeto local,  use o comando no terminal:
```sh
make run
```

### Build/run 
Pra fazer o build e executar a imagem Docker com o projeto local,  use o comando no terminal:
```sh
make build/run
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
