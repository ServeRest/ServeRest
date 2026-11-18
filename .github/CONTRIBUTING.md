
# Como contribuir

[![Continuous Delivery](https://github.com/ServeRest/ServeRest/actions/workflows/continuous_delivery.yml/badge.svg)](https://github.com/ServeRest/ServeRest/actions/workflows/continuous_delivery.yml)
[![Deploy ServeRest on the web](https://github.com/ServeRest/ServeRest/actions/workflows/deploy-online-serverest.yml/badge.svg)](https://github.com/ServeRest/ServeRest/actions/workflows/deploy-online-serverest.yml)
[![Continuous Integration](https://github.com/ServeRest/ServeRest/actions/workflows/continuous_integration.yml/badge.svg)](https://github.com/ServeRest/ServeRest/actions/workflows/continuous_integration.yml)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=ServeRest&metric=alert_status)](https://sonarcloud.io/dashboard?id=ServeRest)
[![Pact Status](https://paulogoncalves.pactflow.io/pacts/provider/ServeRest%20-%20API%20Rest/consumer/Front/latest/badge.svg)](https://paulogoncalves.pactflow.io/)

[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ServeRest&metric=coverage)](https://sonarcloud.io/dashboard?id=ServeRest)
[![Mutation testing badge](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2FServeRest%2FServeRest%2Ftrunk)](https://dashboard.stryker-mutator.io/reports/github.com/ServeRest/ServeRest/trunk)

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

## Importante

1. Não tenha receio em contribuir se achar muito complexo as etapas para contribuir. **Basta pedir apoio em issue ou PR e receberá auxílio no que precisar.**
1. Se está fazendo algum ajuste e está com dificuldades (Ex.: teste quebrando, dificuldade de criar novos testes, falta de entendimento de alguma regra de negócio, etc) também não tenha receios em pedir auxílio.

## Sumário
- [Execução do projeto](#execução-do-projeto)
    - [Debug](#debug)
- [Etapas para contribuir](#etapas-para-contribuir)
- [Garantindo a qualidade do projeto](#garantindo-a-qualidade-do-projeto)
    - [Legenda](#legenda)
    - [💥💻 Testes](#-testes)
        - [💥💻 Cobertura de código](#-cobertura-de-código)
    - [💥 Testes de Mutação](#-testes-de-mutação)
    - [💥 Teste de infra](#-teste-de-infra)
    - [💥💻 Lint](#-lint)
    - [💥💻 Commit](#-commit)
    - [💥 Dockerfile lint](#-dockerfile-lint)
- [Entrega contínua](#entrega-contínua)
    - [Deploy em produção: revisão sem tráfego e vigia](#deploy-em-produção-revisão-sem-tráfego-e-vigia)
- [Documentação](#documentação)
- [Reconhecimento de contribuição](#reconhecimento-de-contribuição)

## Pré-requisitos

É preciso ter os seguintes programas instalados:

- [Git](https://git-scm.com/downloads)
- _(opcional)_ [Node.js](https://nodejs.org/en/download), preferencialmente versão LTS.
    - Se usar docker não será preciso instalar o Node
- [Docker](https://www.docker.com/get-started)
- [Docker compose](https://docs.docker.com/compose/install/)

> Docker e Docker-compose são utilizados para execução dos testes e do projeto

## Execução do projeto

Com intuito de facilitar o desenvolvimento o projeto está todo dentro de container e sua execução é feita utilizando o arquivo [Makefile](../Makefile).

Utilize o seguinte comando para executar o projeto enquanto desenvolve para utilizar a funcionalidade de reiniciar a aplicação a cada alteração:

```sh
make run-dev
```

### Debug

Para realizar o debug da aplicação com _VS Code_ há 2 maneiras:

1. **Debugando a aplicação em container Docker**: Utilize o comando `make run-debug` e na aba `Run and Debug` do VS Code selecione a opção `Docker: Attach to ServeRest container`.
2. **Debugando a aplicação localmente com NPM**: Na aba `Run and Debug` do VS Code selecione a opção `Launch via NPM`.

Escolha a forma de execução de acordo com o cenário que quer debugar.

Utilize a primeira opção se o erro ocorre em:
- Docker localmente.
- _serverest.dev_.

Utilize a segunda opção se o erro ocorre em:
- NPM localmente.

## Etapas para contribuir

1. [Fork](https://help.github.com/articles/fork-a-repo/) este repositório para sua própria conta GitHub, [clone](https://help.github.com/articles/cloning-a-repository/) no seu computador e, em seguida, acesse o diretório criado;
1. Faça as alterações necessárias;
1. Faça o seu commit usando `npm run commit` _(opcional)_
1. Envie um [pull request](https://help.github.com/articles/about-pull-requests/);
1. Aguarde o resultado das validações realizadas na integração contínua. Caso haja alguma quebra, analise e faça as correções necessárias.

## Garantindo a qualidade do projeto

Para o projeto manter a qualidade são feitas diversas validações, aonde é validado a estrutura do projeto, a imagem docker, teste das regras de negócio, contrato entre front e back, teste E2E em staging, teste de fumaça em produção, mensagem de commit, etc.

Todas essas etapas são muito importantes para que tenhamos confiança na qualidade das alterações com o mínimo de intervenção humana, permitindo rápida entrega do seu Pull Request para produção.

> Aqui amamos automação, basta mergear o seu PR para a branch principal que a release será criada e totalmente validada.

### Legenda
#### 💥 > Validação realizada na integração contínua e entrega contínua
#### 💻 > Validação realizada localmente

### 💥💻 Testes

Os testes são importantes para garantir a integridade do projeto a cada alteração realizada. É importante que atente de que a sua alteração necessite de novos testes ou adequação nos já existentes.

Os testes são executados com [mocha](https://www.npmjs.com/package/mocha), validados com [chai](https://www.npmjs.com/package/chai), mockados com [sinon.js](https://www.npmjs.com/package/sinon) e [nock](https://www.npmjs.com/package/nock) e as requests são feitas com [supertest](https://www.npmjs.com/package/supertest).

Para rodar os testes, execute:

1. `make test-integration` para os testes de integração.
1. `make test-e2e-localhost` para os testes E2E em cima da imagem docker que irá para produção.
1. `make test-unit` para os testes unitários.

_Execute o comando `make test` para rodar os testes unitários e de integração._

> O commit é abortado caso os testes unitários e de integração não resultem em sucesso

### 💥💻 Cobertura de código

[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ServeRest&metric=coverage)](https://sonarcloud.io/dashboard?id=ServeRest)

Usamos o [nyc](https://www.npmjs.com/package/nyc) para validar a cobertura de código.

É importante que todo o código esteja com 100% de cobertura para podermos ter segurança que toda alteração no código será validada.

Para validar a cobertura localmente execute os testes. É apresentado um report no terminal informando a cobertura de todos os arquivos em `/src`. Se algum dos arquivos não estiver com 100% em todas as métricas crie os testes necessários.

> Apenas os testes de integração e unitários possuem coleta de cobertura de código.

### 💥 Testes de Mutação

[![Mutation testing badge](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2FServeRest%2FServeRest%2Ftrunk)](https://dashboard.stryker-mutator.io/reports/github.com/ServeRest/ServeRest/trunk)

O teste de mutação garante que os testes de API são efetivos e complementa a [cobertura de código](#-cobertura-de-código).

A lib utilizada é a [Stryker](http://stryker-mutator.io/).

Para rodar os testes de mutação, execute o comando `make test-mutation`.

Para aprofundar sobre como funciona os testes de mutação, leia o meu texto '[Teste de mutação 👽: O que é e como fica a cobertura de código?](https://github.com/PauloGoncalvesBH/teste-de-mutacao)'.

> [Clique aqui para ver o dashboard do teste de mutação.](https://dashboard.stryker-mutator.io/reports/github.com/ServeRest/ServeRest/trunk)

### 💥 Teste de infra

[![Go Reference](https://pkg.go.dev/badge/github.com/gruntwork-io/terratest.svg)](https://pkg.go.dev/github.com/gruntwork-io/terratest)

É utilizado o [Terratest](https://terratest.gruntwork.io/) para realizar teste de infraestrutura, validando comportamento da imagem docker durante sua execução.

Para rodar o teste de infra e validar o `docker build` de produção, execute o comando `make test-infra`.

> Para saber mais sobre teste de infraestrutura recomendo o texto [What Is Infrastructure Testing And Why Is It Needed](https://www.softwaretestinghelp.com/infrastructure-testing-tutorial/).

### 💥💻 Lint

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Usamos o [standard](https://www.npmjs.com/package/standard) como linter e formatter do código e [lint-staged](https://www.npmjs.com/package/lint-staged) para forçar lint das alterações que estão em staged do git.

Execute `npm run lint` para padronizar os arquivos.

Execute `npm run lint:fix` para corrigir automaticamente os problemas encontrados pelo lint.

> O commit é abortado caso esse padrão não seja seguido

### 💥💻 Commit

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

As mensagens de commit devem seguir o padrão do _conventional commit_.

Para saber mais, acesse esses links:
- [Especificação do Conventional Commit](https://www.conventionalcommits.org/)
- [Regras do @commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional).

Execute `npm run commit` para ter um painel interativo que permite seguir o padrão de commit de forma fácil.

> O commit é abortado caso esse padrão não seja seguido

### 💥 Dockerfile lint

É utilizado o linter [Hadolint - Haskell Dockerfile Linter](https://github.com/hadolint/hadolint) para garantir que os Dockerfile de [produção,desenvolvimento](../Dockerfile), [teste](../test/Dockerfile.test) e de [teste de infra](../Dockerfile) seguem as melhores práticas em sua estrutura.

---

## Entrega contínua

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A publicação de novas versões no [NPM](https://www.npmjs.com/package/serverest), no [Docker](https://hub.docker.com/r/paulogoncalvesbh/serverest) e no [serverest.dev](https://serverest.dev/) é feita automaticamente após a execução com sucesso de todas as etapas da pipeline de [entrega contínua](./workflows/continuous_delivery.yml).

É utilizada a lib [Semantic-release](https://github.com/semantic-release/semantic-release) com personalizações no arquivo [.releaserc.js](../.releaserc.js).

| NPM dist-tag | branch |
|:---:|:---:
| @latest | trunk
| @beta | beta

Para ver todo o passo a passo da entrega contínua, como deploy em staging e produção, testes E2E em staging e produção e rollback automático se algum erro for detectado, acesse: https://github.com/ServeRest/ServeRest/actions/workflows/deploy-online-serverest.yml

Para aprofundar sobre como é feita a publicação do _ServeRest_, leia o texto '[Entrega contínua no ServeRest](https://github.com/PauloGoncalvesBH/entrega-continua-no-serverest)'. _(desatualizado)_

### Deploy em produção: revisão sem tráfego e vigia

A revisão nova é testada na infraestrutura de produção antes de receber tráfego e fica sob vigia por 60 minutos depois de recebê-lo.

Não é um canário por porcentagem de tráfego. Cada instância do Cloud Run tem o seu NeDB em memória: um `POST` numa revisão e o `GET` seguinte na outra responderiam 404, e a afinidade de sessão do Cloud Run usa cookie, que os clientes de API não enviam. Dividir por IP exigiria um Load Balancer, que custa mais do que o projeto economiza.

```
deploy-online-serverest.yml
  cancelamento da vigia anterior de produção, se ainda roda
  → deploy sem tráfego, com a tag canario
  → smoke test na URL da tag (falhou: issue, a produção não foi tocada)
  → promoção da revisão nova para 100% do tráfego (falhou: rollback e issue)
  → smoke test em https://serverest.dev (falhou: rollback e issue)
  → remoção da tag canario e disparo da vigia

vigiar-producao.yml, à parte
  → um ciclo a cada 5 min por 60 min
  → rollback para a revisão anterior, só por sinal forte
```

A vigia lê no Cloud Logging os logs da revisão nova desde a promoção e consulta `GET https://serverest.dev/version`. O rollback acontece com 1 linha de OOM, com 5 ou mais respostas 5xx ou com 2 sondas seguidas sem a versão do release. Reinício de container, memória e latência não revertem; os monitores do Datadog avisam deles. Quando a vigia não consegue ler os logs, o veredito é inconclusivo: abre issue e a revisão nova continua com o tráfego. A cada ciclo a vigia confere se a revisão ainda serve 100%: se um deploy mais novo ou uma mudança à mão trocou a revisão, ela termina como substituida e não reverte nada. A revisão anterior é a que servia 100% antes do deploy; ela está escalada a zero, então a primeira requisição depois do rollback espera de 10 a 12 segundos.

A vigia roda num workflow próprio, com um grupo de concorrência por serviço, e não prende a fila do deploy: o deploy demora o mesmo que antes. Cada deploy de produção começa cancelando a vigia que ainda roda, e espera ela terminar, para que um rollback antigo não troque o tráfego no meio do deploy novo; a vigia cancelada não reverte. O GitHub guarda só um run pendente por grupo de concorrência e cancela o pendente mais antigo; com a vigia dentro do deploy, um release beta poderia cancelar a promoção pendente de um release de trunk.

Efeito colateral do deploy sem tráfego: o serviço `app` deixa de seguir a última revisão. Uma revisão criada à mão ou por mudança de variável de ambiente no console não recebe tráfego sozinha; é preciso promovê-la com `update-traffic`.

Rollback manual, para um problema que apareça depois da vigia (as revisões estão na issue do deploy ou em `gcloud run revisions list --service app --region us-central1`):

```
gcloud run services update-traffic app --region us-central1 --to-revisions <revisão anterior>=100
```

## Documentação

A documentação, disponibilizada nas URLs <https://serverest.dev> e <http://localhost:3000>, é editada no arquivo [swagger.json](../docs/swagger.json).

Para atualizar:
1. Acesse o arquivo [swagger.json](../docs/swagger.json) e o edite de acordo com sua necessidade.
1. Execute o comando `make run-dev` para acompanhar o status da documentação alterada na URL <http://localhost:3000>.

## Reconhecimento de contribuição

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
![All Contributors](https://img.shields.io/badge/all_contributors-15-orange.svg?style=for-the-badge)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Todos aqueles que contribuíram com o projeto, independente do tipo de contribuição, devem ser reconhecidos.

Por isso, utilizamos o bot [@all-contributors](https://allcontributors.org/docs/en/bot/overview), que cria um Pull Request atualizando a seção de [contribuidores no README](../README.md/#contributors-).

Para entender como utilizar, basta acessar as [intruções de uso do bot](https://allcontributors.org/docs/en/bot/usage).
