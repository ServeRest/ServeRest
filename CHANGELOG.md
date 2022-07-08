# Changelog

## [2.26.1](https://github.com/ServeRest/ServeRest/compare/v2.26.0...v2.26.1) (2022-07-08)


### Bug Fixes

* show user that request ended with timeout ([1f432c4](https://github.com/ServeRest/ServeRest/commit/1f432c429647c871b2075dc8a4259ab52e714e04))

# [2.26.0](https://github.com/ServeRest/ServeRest/compare/v2.25.4...v2.26.0) (2022-06-19)


### Chores

* avoid action unpublished version ([15fab7f](https://github.com/ServeRest/ServeRest/commit/15fab7f4565ef46350cc8959669e1430f02aec03)), closes [#310](https://github.com/ServeRest/ServeRest/issues/310)


### Continuous Integration

* run mutation test only when files in src/ dir change ([0ed60ad](https://github.com/ServeRest/ServeRest/commit/0ed60ad04bf0db573c7ba23c1ba8826708f29711))


### Features

* allow load test and route /status to get infos ([7098bff](https://github.com/ServeRest/ServeRest/commit/7098bffed401ec001a1d5eef0406a406a6fd6e97))

## [2.25.4](https://github.com/ServeRest/ServeRest/compare/v2.25.3...v2.25.4) (2022-06-19)


### Chores

* **terratest:** remove specific version that prevents docker build ([7e18f99](https://github.com/ServeRest/ServeRest/commit/7e18f994acd306eb31bbd37c9f6efe80a231f440))


### Code Refactoring

* **dockerfile:** split multi-stage docker on 2 files to improve docker build time ([0971a56](https://github.com/ServeRest/ServeRest/commit/0971a56ccb5360770c511374b2fe83e84b6d7096))


### Continuous Integration

* automatic deploy to staging and prod, e2e test and rollback ([10948da](https://github.com/ServeRest/ServeRest/commit/10948dab55428981a425502a7db0f2a02fac4167))
* cancelar execução anterior em um novo git push ([461eba0](https://github.com/ServeRest/ServeRest/commit/461eba0af5ff5ee43855b396b88e579971e64e95))
* **e2e:** e2e test must be mandatory for guarantee the release quality ([f239f6d](https://github.com/ServeRest/ServeRest/commit/f239f6d0960b78d564689963161d79bf170238d3))


### Documentation

* **contributing:** info about continous delivery and about validations ([14d12b5](https://github.com/ServeRest/ServeRest/commit/14d12b5a77af1de14148f364fb39e5515e421c7a))
* **serverest:** allow import collection to postman ([c5e9bc8](https://github.com/ServeRest/ServeRest/commit/c5e9bc8779f4d20a152fed50cac2ebbee99cb149))
* **serverest:** show correct version on swagger instead 2.x.x ([75cf178](https://github.com/ServeRest/ServeRest/commit/75cf178c884825d9bb5d215261039ad604efb554))


### Tests

* **docs:** validate that documentation is accessible - [#202](https://github.com/ServeRest/ServeRest/issues/202) ([7ba01cf](https://github.com/ServeRest/ServeRest/commit/7ba01cf654e0c7d0e138655d7df1b435246213bb))
* **e2e:** allow E2E testing of production application ([f8c28cf](https://github.com/ServeRest/ServeRest/commit/f8c28cf54eeaf2e8452a474453e45822fcc5c9c7))

## [2.25.3](https://github.com/ServeRest/ServeRest/compare/v2.25.2...v2.25.3) (2022-03-18)


### Bug Fixes

* **agilizei:** fix swagger routes on agilizei.serverest.dev ([19a3a9b](https://github.com/ServeRest/ServeRest/commit/19a3a9bd6afaba2bd98ae74cc9bf29883eb4193f))
* remove 'performance test' info and /status route ([c675d38](https://github.com/ServeRest/ServeRest/commit/c675d38a12045645c9bd155aaab540afebb8225c))


### Chores

* **docker:** remove specific version that prevents docker build ([1b60df3](https://github.com/ServeRest/ServeRest/commit/1b60df33124a449abfded1bdba22ba9ef5a7aae3))
* **makefile:** run 'build run' as default to easier execution ([9d10991](https://github.com/ServeRest/ServeRest/commit/9d10991a7e56fa6ba6d80e3428ca1005ae482ac7))


### Documentation

* remove companys section because they don't support the project ([7293b8b](https://github.com/ServeRest/ServeRest/commit/7293b8b2a28e333adf0ece3ade697e06d184c85b))
* remove info about 'uptime' page ([1e8b20a](https://github.com/ServeRest/ServeRest/commit/1e8b20adb77c5d6c6b28fe99ba0c340c1f13196e))

## [2.25.2](https://github.com/ServeRest/ServeRest/compare/v2.25.1...v2.25.2) (2021-12-08)


### Miscellaneous

* Revert "chore(patch): desabilitar monitoramento enquanto ajusto rate limit" ([36f69ce](https://github.com/ServeRest/ServeRest/commit/36f69ceca224a3f90e47a9a950dc5bc376f9e468))

## [2.25.1](https://github.com/ServeRest/ServeRest/compare/v2.25.0...v2.25.1) (2021-11-23)


### Chores

* **patch:** desabilitar monitoramento enquanto ajusto rate limit ([fb5098b](https://github.com/ServeRest/ServeRest/commit/fb5098bea9253e7606d8d5c66f252bf9a6870a3c))


### Continuous Integration

* **environment:** limit prod secrets to trunk and beta branch ([56fb980](https://github.com/ServeRest/ServeRest/commit/56fb980d9d6add7cc92e96277421ff3a1db3a2c2))


### Documentation

* **readme:** include playwright automation repo ([492400c](https://github.com/ServeRest/ServeRest/commit/492400c6bbdf3ce48b092e38c1eadc6ac8a0e410))

# [2.25.0](https://github.com/ServeRest/ServeRest/compare/v2.24.4...v2.25.0) (2021-11-22)


### Chores

* criar multi-stage build para execução do projeto com nodemon ([9b8bca5](https://github.com/ServeRest/ServeRest/commit/9b8bca520a67eeaa0d08b3f1323a4cc515d38dd3))
* **docker:** avoid using 'prepare' on prod image ([bc4a9c7](https://github.com/ServeRest/ServeRest/commit/bc4a9c710fe7a91f27bd991dcfd31a260cbad6c8))
* **dockerfile:** incluir labels com informações do projeto ([7cbdd6c](https://github.com/ServeRest/ServeRest/commit/7cbdd6c0c60a7907941d1fd5dd2ea30a6d823f17))
* generate package-lock with newer version of npm ([e7b28a0](https://github.com/ServeRest/ServeRest/commit/e7b28a028c6d9ac547e58c4f12774a211578655a))
* guarantee that pipeline will break when test fail ([22a9629](https://github.com/ServeRest/ServeRest/commit/22a962982096b40fb7420beca3241161b7aa7f4c))
* **infra-test:** containerize infra test to easier run ([ad9529d](https://github.com/ServeRest/ServeRest/commit/ad9529dfeda47eacf487b947eec6b4bec7d28fe1))
* renomear test de api para teste de integração ([1368f38](https://github.com/ServeRest/ServeRest/commit/1368f38c186212d2307884dc0ee434c5ae8996a1))
* set specific version of base images ([ca4c152](https://github.com/ServeRest/ServeRest/commit/ca4c152ae3174376912977ade20119047f60b8fc))
* **sonar:** remover análise de coverage de arquivos que não necessitam ter testes ([9f5ae1f](https://github.com/ServeRest/ServeRest/commit/9f5ae1f3e28d71d860b8a58d68b4c3a030cde83b))
* **test:** exibir cor na execução de teste de integração para facilitar leitura ([44ef82d](https://github.com/ServeRest/ServeRest/commit/44ef82d6e2ea4a1f130d767f40e0341a8489a256))


### Continuous Integration

* explicitar o nome da imagem docker ([a2eb8c2](https://github.com/ServeRest/ServeRest/commit/a2eb8c238e55acffc7de3b5149120b2627505090))
* remover execução de teste que não está containerizado ([123eb10](https://github.com/ServeRest/ServeRest/commit/123eb106101bc56201e188c3a925182fce0dc7e1))


### Documentation

* **contributing:** detalhar a seção de testes com os pacotes utilizados e informação de coverage ([687395e](https://github.com/ServeRest/ServeRest/commit/687395e6e145384c4ac93af096b95bc01f480f2e))
* **readme:** adicionar repositório de automação em ruby ([bd828af](https://github.com/ServeRest/ServeRest/commit/bd828af2b993e3ef4558e130ed5252a287d52c9c))


### Features

* **rate-limit:** interceptar requests de testes de carga para não enviar os dados para o moesif ([7683cd0](https://github.com/ServeRest/ServeRest/commit/7683cd0060b3312c17305496d580729f3a71a687))


### Tests

* fix infra test error ([6345210](https://github.com/ServeRest/ServeRest/commit/634521029dadc92ba3e0b52775b008c7c80bf37f))
* **infra:** avoid test caching ([befbf6e](https://github.com/ServeRest/ServeRest/commit/befbf6e7d7318964d86f94cb4f12dcdb9b3ff407))
* **unitario:** garantir comportamento do método getRandomFinancialContributor ([d4debd7](https://github.com/ServeRest/ServeRest/commit/d4debd7691255e307dcef61c986d7486cfc51d30))
* utilizar multi-stage build ([ed69b62](https://github.com/ServeRest/ServeRest/commit/ed69b6269178ec13382f643a22226fc4dcfe2fe4))

## [2.24.4](https://github.com/ServeRest/ServeRest/compare/v2.24.3...v2.24.4) (2021-10-13)


### Chores

* **makefile:** executar as imagens utilizando 'docker-compose up' ao invés de run ([d8f3885](https://github.com/ServeRest/ServeRest/commit/d8f3885f6ec9c5d43ca51ddd32f46c6a42940991))
* bump stryker-mutator and stryker-diff-runner to latest ([e9fa90d](https://github.com/ServeRest/ServeRest/commit/e9fa90d5d04f70ecb07d08142b6e48fa02a747ed))


### Code Refactoring

* **database:** alterar o banco de dados para um fork atualizado e com promise implementado ([ee2eca3](https://github.com/ServeRest/ServeRest/commit/ee2eca33ee38b4b51f32c0b9d88876bf0a761ce7))


### Continuous Integration

* executar webhook encima de commit deployado ([da7c099](https://github.com/ServeRest/ServeRest/commit/da7c099b42e79e033e823b230e58d928386b1df5))
* fixar versão do semantic-release ([bc37107](https://github.com/ServeRest/ServeRest/commit/bc37107683771ca4e0103f35bef2908f2e9b9a4f))


### Documentation

* **patch:** detalhar sobre como usar para teste de carga ([c676d7a](https://github.com/ServeRest/ServeRest/commit/c676d7acd96f4d5d4c0d70479aef9cd455beb862))

## [2.24.3](https://github.com/ServeRest/ServeRest/compare/v2.24.2...v2.24.3) (2021-08-07)


### Chores

* **patch:** exibir nome de apoiador financeiro de forma randômica no terminal em agradecimento ([0cdf51a](https://github.com/ServeRest/ServeRest/commit/0cdf51a17df5e6424be108cc5e045dc4ad19b8aa))
* **sonar:** remove scan fron server.js ([6ab2188](https://github.com/ServeRest/ServeRest/commit/6ab21880267a18fab341e04b1c5e27f727bc262c))
* containerize contract test ([70f596b](https://github.com/ServeRest/ServeRest/commit/70f596b22acd64d56bfda59a3eeb862944fd81a4))
* containerize integration test ([003951d](https://github.com/ServeRest/ServeRest/commit/003951d88a387b170c1f27966890787c970136db))
* containerize mutation test ([7448051](https://github.com/ServeRest/ServeRest/commit/74480512a65f70b616829fafba9ebacf4d5e136c))
* containerize mutation test diff ([6adee62](https://github.com/ServeRest/ServeRest/commit/6adee62563d1a0a17415a1b5e55184b0a128f4e8))
* create docker-compose base ([d7089e9](https://github.com/ServeRest/ServeRest/commit/d7089e91c58c3d57ff343d9809809d881400d77a))


### Continuous Integration

* **test-contract:** remove unused env variable ([69337d0](https://github.com/ServeRest/ServeRest/commit/69337d0208573e557ac983ef4b323926c6725a09))
* remove global environment ([f400b89](https://github.com/ServeRest/ServeRest/commit/f400b8918801483a42a57c02d5ff2f36a2e0423e))


### Documentation

* **contributing:** update with info about 'make' ([eef85c9](https://github.com/ServeRest/ServeRest/commit/eef85c9ef2fb73346a34a583248bc951c14c118b))


### Tests

* **contract:** refatorar o teste para permitir alteração de contrato ([286a413](https://github.com/ServeRest/ServeRest/commit/286a413f0bb8d62ca20bcfbd84354577fea74b83))

## [2.24.2](https://github.com/ServeRest/ServeRest/compare/v2.24.1...v2.24.2) (2021-05-18)


### Bug Fixes

* **logger:** ignorar apenas as requests para as rotas apontadas ([57bbb90](https://github.com/ServeRest/ServeRest/commit/57bbb9026b518892e8c41b59f388218ce82a37ad))


### Continuous Integration

* **contract-test:** executar teste de contrato no commit gerado pela release ([42bd082](https://github.com/ServeRest/ServeRest/commit/42bd0827412f2a743d0b04f623a42bba951874a7))

## [2.24.1](https://github.com/ServeRest/ServeRest/compare/v2.24.0...v2.24.1) (2021-05-16)


### Chores

* **mergify:** habilitar merge automático de PR do dependabot ([23a9fba](https://github.com/ServeRest/ServeRest/commit/23a9fbac73d2ed10038e934732a7d8ed766d0d4c))


### Continuous Integration

* executar teste de contrato via webhooks do pactflow ([c18eec5](https://github.com/ServeRest/ServeRest/commit/c18eec53b021c1c0bb828e60b0632ac08872927c))
* **contrato:** gerar tag após deploy ([44041e4](https://github.com/ServeRest/ServeRest/commit/44041e476d9e58bc641e7a5d24730f337dd3f891))
* **contrato:** possibilitar trigger de pipeline pelo consumer ([cd5fbc6](https://github.com/ServeRest/ServeRest/commit/cd5fbc6782dd727828c38f32bd08553f979944bd))
* **sonar:** implementar análise estática com SonarCloud ([cca3980](https://github.com/ServeRest/ServeRest/commit/cca39807ae89ad5f6a2cee159fee2f9e341a1e21))
* executar teste apenas em versão node LTS e em diversos OS ([165f9ac](https://github.com/ServeRest/ServeRest/commit/165f9ac9da39d657d6f9fa67ea5ee4f3d4fd37f3))


### Documentation

* **contributing:** corrigir URL de texto sobre teste de infra ([027fb5a](https://github.com/ServeRest/ServeRest/commit/027fb5adb9609e20d5aab8658fadd3378918b33c))
* **serverest:** implementar nova documentação com swagger ([8b8cd4f](https://github.com/ServeRest/ServeRest/commit/8b8cd4fe9dd1e8e19bdf6ea0397d1d4371492e16)), closes [#165](https://github.com/ServeRest/ServeRest/issues/165) [#235](https://github.com/ServeRest/ServeRest/issues/235)


### Tests

* **contrato:** corrigir para que pegue a branch e hash correta ([#244](https://github.com/ServeRest/ServeRest/issues/244)) ([445df86](https://github.com/ServeRest/ServeRest/commit/445df86bc3efae1a552f025ae5129292904d9e98))
* **contrato:** validar integração entre front e back ([6c5f863](https://github.com/ServeRest/ServeRest/commit/6c5f863d6381c419fbdea6701564e7802c2566f7))

# [2.24.0](https://github.com/ServeRest/ServeRest/compare/v2.23.2...v2.24.0) (2021-04-21)


### Continuous Integration

* **ssh:** voltar para versão estável da action ssh-key ([bec776f](https://github.com/ServeRest/ServeRest/commit/bec776fdef8c62b34bc854989b37a6d29fc198d5))


### Features

* busca por dados de usuário e produtos com dados equivalentes ([dffdd7b](https://github.com/ServeRest/ServeRest/commit/dffdd7b7973cb603b967df854adcf56d9698273a))

## [2.23.2](https://github.com/ServeRest/ServeRest/compare/v2.23.1...v2.23.2) (2021-04-18)


### Chores

* bump dependencies ([6c8cad4](https://github.com/ServeRest/ServeRest/commit/6c8cad4b61acb22e6cfff7efe9ee6afd90d7387f))
* **husky:** bump husky da v4 para a v5 ([d87f635](https://github.com/ServeRest/ServeRest/commit/d87f6351abb055a1d14e6a3bc8a2eb60e586d994))


### Code Refactoring

* mover os testes de integração para respectivo diretório ([dcb55b8](https://github.com/ServeRest/ServeRest/commit/dcb55b87f14db658d51ce29972aea6e03a16a030))


### Documentation

* **serverest:** incluir logo no README e favicon na documentação ([a0ec748](https://github.com/ServeRest/ServeRest/commit/a0ec748d494554ce6181a8e2fdd89bb73fda9792))
* possibilitar a alteração da documentação para todos os colaboradores ([43e2f9c](https://github.com/ServeRest/ServeRest/commit/43e2f9cf3a525420edb9de1965e92d0f46ff6ed0))


### Styles

* **docker:** execute dockerfile lint on CI ([6368483](https://github.com/ServeRest/ServeRest/commit/63684838701b69b0fb36a4d8fb5d174b23c5ce68))


### Tests

* **docker:** implementar teste de infra, validando mensagem retornada ([3486c9a](https://github.com/ServeRest/ServeRest/commit/3486c9a21a57ef2227a121e4b28d8f79482374bf))

## [2.23.1](https://github.com/ServeRest/ServeRest/compare/v2.23.0...v2.23.1) (2021-03-20)


### Bug Fixes

* **docker:** informar o usuário, ao iniciar o ServeRest via docker, da existência da opção de --help ([5e284d0](https://github.com/ServeRest/ServeRest/commit/5e284d0f82aebf0f0a1d0c5f1def88d5bc24368c))

# [2.23.0](https://github.com/ServeRest/ServeRest/compare/v2.22.1...v2.23.0) (2021-03-20)


### Bug Fixes

* estava abrindo URL incorreta ao iniciar o ServeRest utilizando porta diferente da padrão ([95ea7ae](https://github.com/ServeRest/ServeRest/commit/95ea7aee0110ac6e6533ae6f837aa28ecdb2f378))


### Chores

* **monitor:** mapear as configurações utilizadas pelos usuários do ServeRest que usam NPM e Docker ([9d31551](https://github.com/ServeRest/ServeRest/commit/9d315518ad8fea9a5e0da385fce84764ae8e450a))


### Continuous Integration

* **check-link:** reduzir periodicidade de validação dos links em arquivos .md ([2f6971d](https://github.com/ServeRest/ServeRest/commit/2f6971d6db71727b9423cb6f9d17ceb82972a626))


### Features

* **docker:** habilitar a exibição das saídas da imagem com cor ([5365bfe](https://github.com/ServeRest/ServeRest/commit/5365bfe2b10f55a3a909abd32c3d5289dc4b69e7))
* **docker:** possibilitar configuração de porta, timeout, ajuda, etc. na execução da imagem ([6f8d416](https://github.com/ServeRest/ServeRest/commit/6f8d416e477307ebf8499922ba6f4ec6ec9bfc24))

## [2.22.1](https://github.com/ServeRest/ServeRest/compare/v2.22.0...v2.22.1) (2021-03-18)


### Chores

* **patch:** não monitorar acesso à documentação do ServeRest em Agilizei ([ac2ed32](https://github.com/ServeRest/ServeRest/commit/ac2ed3229427cc9840e8bb2ad44d4bfe97300e39))


### Continuous Integration

* **check-link:** remover configuração de URLs inexistentes ([f17b9d2](https://github.com/ServeRest/ServeRest/commit/f17b9d2d7a6abf3fbe893b751cba22e2e4c86fbd))


### Documentation

* migrar dashboard do resultado do teste de mutação para a referente ao novo repositório ([a45c00e](https://github.com/ServeRest/ServeRest/commit/a45c00ea3d0861888155a5188a5d57df1a45a684))

# [2.22.0](https://github.com/ServeRest/ServeRest/compare/v2.21.0...v2.22.0) (2021-03-18)


### Bug Fixes

* **docs:** ajustar mensagem de erro quando usuario nao e encontrado ([cea7576](https://github.com/ServeRest/ServeRest/commit/cea75763bf06c4636bc61b2357b0ac67a77afb49))


### Chores

* **monitor:** não monitorar requests específicas realizadas pelo Cypress ao executar testes de API ([8f2632d](https://github.com/ServeRest/ServeRest/commit/8f2632d77842fec2f5993fc07414705d1426ba37))


### Features

* **carrinhos:** criar rota de busca de carrinho por ID ([fcd3a49](https://github.com/ServeRest/ServeRest/commit/fcd3a49f42bf359df888111767eb8003a973f1d4)), closes [#211](https://github.com/ServeRest/ServeRest/issues/211)
* **produtos:** criar rota de busca de produto por ID ([938da13](https://github.com/ServeRest/ServeRest/commit/938da133e3ef7132fcc0c7b2d824e7e9b8a6456e)), closes [#211](https://github.com/ServeRest/ServeRest/issues/211)

# [2.21.0](https://github.com/ServeRest/ServeRest/compare/v2.20.7...v2.21.0) (2021-03-17)


### Chores

* **agilizei:** ajustar agilizei para outro subdomínio ([ce9f44d](https://github.com/ServeRest/ServeRest/commit/ce9f44dd642f0e5fe57b52de33473353c38bc4b8))
* **agilizei:** configurar uso do ServeRest pela org Agilizei ([#233](https://github.com/ServeRest/ServeRest/issues/233)) ([eba9081](https://github.com/ServeRest/ServeRest/commit/eba90814b9c1b44daa917c781fae68f95bcac2cf))
* **agilizei:** monitorar os acessos na documentaçao ([63818ce](https://github.com/ServeRest/ServeRest/commit/63818ce6c7bd67f8a6c395063113de03bd361e84))
* **monitor:** não monitorar as requests de status de uso de recurso da máquina ([bbe9975](https://github.com/ServeRest/ServeRest/commit/bbe9975ec3f8f1333a95beeeba4ed922c09eb63d))


### Code Refactoring

* renomear para nomenclatura que faz mais sentido com a sua atuação ([741485e](https://github.com/ServeRest/ServeRest/commit/741485e335cf83e4dfe107fda01d77762308b3e3))


### Continuous Integration

* **deploy:** ao realizar deploy manual, fornecer opção para não atualizar o serverest.dev ([6e936f4](https://github.com/ServeRest/ServeRest/commit/6e936f472d9c277c0f5db7abaa36f9925b76f842))
* **deploy:** não fazer deploy do ServeRest.dev quando pulado ([1622cb8](https://github.com/ServeRest/ServeRest/commit/1622cb8124d5bcee2d6cc9b38dc484a644d01c07))


### Features

* **usuarios:** busca de usuario por id ([#230](https://github.com/ServeRest/ServeRest/issues/230)) ([5de9dba](https://github.com/ServeRest/ServeRest/commit/5de9dba7a56340347da2d665274728e54718f1f3))

## [2.20.7](https://github.com/ServeRest/ServeRest/compare/v2.20.6...v2.20.7) (2021-03-13)


### Chores

* **patch:** migrar ServeRest de conta pessoal pra org ([#232](https://github.com/ServeRest/ServeRest/issues/232)) ([7247187](https://github.com/ServeRest/ServeRest/commit/7247187f1cf4b2341e820dd7b8d6361cabe187cf))


### Documentation

* add murilomaiaa as a contributor ([#231](https://github.com/ServeRest/ServeRest/issues/231)) ([f66d7bc](https://github.com/ServeRest/ServeRest/commit/f66d7bc183ef1c1e58d22f63f95620b98b630adc))

## [2.20.6](https://github.com/ServeRest/ServeRest/compare/v2.20.5...v2.20.6) (2021-03-07)


### Bug Fixes

* informar o usuário sobre como lidar com o erro 'entity.parse.failed' enquanto investigo solução ([06ae564](https://github.com/ServeRest/ServeRest/commit/06ae564cb2951f067562b7481379bd26611f2e6a)), closes [#225](https://github.com/ServeRest/ServeRest/issues/225)

## [2.20.5](https://github.com/ServeRest/ServeRest/compare/v2.20.4...v2.20.5) (2021-03-01)


### Chores

* **patch:** não ofuscar password no monitoramento de log ([39e2ecb](https://github.com/ServeRest/ServeRest/commit/39e2ecbfe7082e25f090f785bed5e0a27e0ebe98))
* impedir que o teste executado em pre-push altere os arquivos .db ([1804b3f](https://github.com/ServeRest/ServeRest/commit/1804b3fcc497b0b5bdb0d035971d3dd39db1a03c))


### Continuous Integration

* unificar as pipelines de deploy no serverest.dev ([9a5fcef](https://github.com/ServeRest/ServeRest/commit/9a5fcef51018391c3fa732ae66636fcb265aac9a))

## [2.20.4](https://github.com/ServeRest/ServeRest/compare/v2.20.3...v2.20.4) (2021-02-25)


### Chores

* **patch:** não coletar log das requests de uptime ([e25c63d](https://github.com/ServeRest/ServeRest/commit/e25c63d8e3799769e70f2c8b6c55b32bd495b56c))


### Code Refactoring

* **monitor:** deixar de monitorar algumas rotas a partir de configuração do moesif ([d364db4](https://github.com/ServeRest/ServeRest/commit/d364db467794c54070b48872582c9c478c5097e7))


### Continuous Integration

* **check-link:** triggar validação de links apenas ao alterar arquivos .md em PR e push ([a529930](https://github.com/ServeRest/ServeRest/commit/a529930feb5a35c5b71980664b53c0bbf305db4d))
* **deploy:** realizar deploy em serverest.dev ao criar nova release ([f4576f5](https://github.com/ServeRest/ServeRest/commit/f4576f585d3d984f74886ea470d6b5008c20910f))
* **mutation test:** tornar teste de mutação um gate da entrega contínua ([43b9e79](https://github.com/ServeRest/ServeRest/commit/43b9e79de1dfb987009226eab81bd8f1e209b4e9))

## [2.20.3](https://github.com/ServeRest/ServeRest/compare/v2.20.2...v2.20.3) (2021-02-08)


### Chores

* **patch:** remover artefato do NPM do container docker ([2e126fb](https://github.com/ServeRest/ServeRest/commit/2e126fb7d8a3bb89fff371771b7c6a8b9460bca9))


### Continuous Integration

* criar commit vazio para triggar deploy na Umbler ([2e58cda](https://github.com/ServeRest/ServeRest/commit/2e58cda3a7ba64054625cedc9e844d4f72df80ac))


### Documentation

* **readme:** incluir logo de empresas que adotaram o serverest ([db0d75c](https://github.com/ServeRest/ServeRest/commit/db0d75c7268c367251d8af2eca1a3eb2b2761e35)), closes [#201](https://github.com/ServeRest/ServeRest/issues/201)
* **readme:** referenciar exemplo de automação de API com Robot Framework ([5918c89](https://github.com/ServeRest/ServeRest/commit/5918c8943696864fa31b17f67a98d94a2fc6a83f)), closes [#203](https://github.com/ServeRest/ServeRest/issues/203)

## [2.20.2](https://github.com/ServeRest/ServeRest/compare/v2.20.1...v2.20.2) (2021-01-22)


### Bug Fixes

* **docker:** habilitar acesso à documentação das rotas ([#204](https://github.com/ServeRest/ServeRest/issues/204)) ([181a182](https://github.com/ServeRest/ServeRest/commit/181a182c1566052e5342f17814e490b0905a8dbd)), closes [#202](https://github.com/ServeRest/ServeRest/issues/202)


### Chores

* bump @stryker-mutator/core from 4.1.2 to 4.3.1 ([dd7b1d3](https://github.com/ServeRest/ServeRest/commit/dd7b1d322a43dd0ebabfc06305de3b4b1b419552))
* bump commitlint-github-action from v2.1.3 to v2.1.6 ([6b44866](https://github.com/ServeRest/ServeRest/commit/6b44866c519cd5617b9d44e50a34b48612d928d3))
* bump husky from 4.3.5 to 4.3.6 ([6a2f66b](https://github.com/ServeRest/ServeRest/commit/6a2f66bc8619fcd51bdd713a2063b1bf7532488c))
* bump setup-node from v1 to v2.1.4 ([a3c77b7](https://github.com/ServeRest/ServeRest/commit/a3c77b73124d33710dad92cc1814e795c427e911))
* bump sinon from 9.2.1 to 9.2.3 ([9f1cbdf](https://github.com/ServeRest/ServeRest/commit/9f1cbdf4fc0a2046671d595517df9c2ecfce02cd))


### Continuous Integration

* **mutation test:** executar no pull request o teste de mutação apenas dos arquivos alterados ([#172](https://github.com/ServeRest/ServeRest/issues/172)) ([d2760b8](https://github.com/ServeRest/ServeRest/commit/d2760b8055a8bd16713e6325c2f518d0e5bd7d0b))


### Documentation

* **uptime:** informar sobre o monitoramento da disponibilidade do ambiente online ([#194](https://github.com/ServeRest/ServeRest/issues/194)) ([f40d609](https://github.com/ServeRest/ServeRest/commit/f40d609aa581dea12157eb75a2d32db0c0298d4d))

## [2.20.1](https://github.com/ServeRest/ServeRest/compare/v2.20.0...v2.20.1) (2020-12-16)


### Chores

* **patch:** bump ini from 1.3.5 to 1.3.7 ([#190](https://github.com/ServeRest/ServeRest/issues/190)) ([dc0439a](https://github.com/ServeRest/ServeRest/commit/dc0439ac9aeb6689abf694c16ec3289482cf0de2))


### Continuous Integration

* limpar base de dados do serverest.dev diariamente às 3h ([33e5a1c](https://github.com/ServeRest/ServeRest/commit/33e5a1ce26ed5a420d9cc0f963cd265136c7e3db))


### Documentation

* add maximilianoalves as a contributor ([#193](https://github.com/ServeRest/ServeRest/issues/193)) ([e95bb58](https://github.com/ServeRest/ServeRest/commit/e95bb58b5cdd1c2f95f8bdb0c861eeaf509dbd16))
* **readme:** informar sobre backup da base de serverest.dev ([8a02ce1](https://github.com/ServeRest/ServeRest/commit/8a02ce1c9a4d4a496ac9ce3b3cfaa99762c3478d))

# [2.20.0](https://github.com/ServeRest/ServeRest/compare/v2.19.1...v2.20.0) (2020-12-08)


### Chores

* **deps:** atualizar @semantic-release/github de v7.0.7 para v7.2.0 ([dc3b854](https://github.com/ServeRest/ServeRest/commit/dc3b854419b4ebc694580865a93c311500914868))
* **deps:** atualizar @semantic-release/npm de v7.0.5 para v7.0.9 ([912c7e0](https://github.com/ServeRest/ServeRest/commit/912c7e0349aaa63ddc915aa3db8d0e8074b6d6e7))
* **deps:** atualizar commitizen de v4.2.1 para v4.2.2 ([763df54](https://github.com/ServeRest/ServeRest/commit/763df54e1d0344735d34ce78db4ee3643b71cf1e))
* **deps:** atualizar cross-env de v7.0.2 para v7.0.3 ([cb7ce06](https://github.com/ServeRest/ServeRest/commit/cb7ce06da0e3989b2096afdb9ebc4fe77a9b0f1f))
* **deps:** atualizar cz-conventional-changelog de v3.1.0 para v3.3.0 ([01680f2](https://github.com/ServeRest/ServeRest/commit/01680f2f81da69049c6ea5d8823cffe753d48c37))
* **deps:** atualizar express-validation de v3.0.2 para v3.0.6 ([dc4556f](https://github.com/ServeRest/ServeRest/commit/dc4556f1445750088f174f0a91b4018474201f5a))
* **deps:** atualizar husky de v4.2.5 para v4.3.5 ([45a671e](https://github.com/ServeRest/ServeRest/commit/45a671e4aacfa63016e1d84f63c24eb5d2a5c0ed))
* **deps:** atualizar lint-staged de v10.2.11 para v10.5.3 ([03c5591](https://github.com/ServeRest/ServeRest/commit/03c5591ed37e70e59c90edcc39cc84c3d7d57966))
* **deps:** atualizar mocha de v8.1.3 para v8.2.1 ([057d0d8](https://github.com/ServeRest/ServeRest/commit/057d0d8a4fd3ab8cf1d9c5dd1843e7489ff9b7bc))
* **deps:** atualizar moesif-nodejs de v3.0.0 para v3.1.5 ([895f315](https://github.com/ServeRest/ServeRest/commit/895f315b080d448e7e04e5655c447fe2b7227460))
* **deps:** atualizar nodemon de v2.0.3 para v2.0.6 ([7a546ee](https://github.com/ServeRest/ServeRest/commit/7a546eec6bd4023ed5120f0e9a6f355329b933af))
* **deps:** atualizar open de v7.0.3 para v7.3.0 ([ccd4818](https://github.com/ServeRest/ServeRest/commit/ccd481898e53f85cd845f4e854c9c9ccc3fe48fb))
* **deps:** atualizar standard de v14.3.3 para v16.0.3 ([a39f146](https://github.com/ServeRest/ServeRest/commit/a39f14606d0839ade70f0971243dae222a825e51))
* **deps:** atualizar supertest de v5.0.0 para v6.0.1 ([52b175c](https://github.com/ServeRest/ServeRest/commit/52b175c6e07aa3ab5fdf94f567335283ae785664))
* **deps:** atualizar wagoid/commitlint-github-action de v2.0.2 para v2.1.3 ([2d40acb](https://github.com/ServeRest/ServeRest/commit/2d40acb74da4acb5573c68be5578cf641163109b))
* **deps:** atualizar yargs de v15.3.1 para v16.2.0 ([11f83e2](https://github.com/ServeRest/ServeRest/commit/11f83e2a08ed3d4278257ca7bc3fc867d3feeada))
* remover o uso de codecov.io por ser spam nos PRs ([fd3f2aa](https://github.com/ServeRest/ServeRest/commit/fd3f2aa7721684952c30d984bd3315a58c3481b7))


### Continuous Integration

* **action-node:** versão 2.1.1 da action setup-node está com erro de execução na pipeline ([614eca2](https://github.com/ServeRest/ServeRest/commit/614eca2747f75709e23013cdb0f54257f45d7886))


### Documentation

* incluir seção de empresas que utilizam o projeto ([934f1a1](https://github.com/ServeRest/ServeRest/commit/934f1a1dea414c1c5c8d3a89d74af0d604506e15))
* **contributing:** informar que a entrega contínua também afeta o ambiente serverest.dev ([e95668d](https://github.com/ServeRest/ServeRest/commit/e95668d94ccd2a723911377a0e0b64fc821dd1ce))
* adicionar exemplo de automação com pytest ([0b646a6](https://github.com/ServeRest/ServeRest/commit/0b646a68e0f70dfd33304827285883e580ae5a87))
* código do badge a ser copiado estava com estilo incorreto ([e8b28fc](https://github.com/ServeRest/ServeRest/commit/e8b28fc32e50603d2f6c06535769b3e498d116ef))


### Features

* **monitor:** monitorar acesso à documentação do projeto ([56248b2](https://github.com/ServeRest/ServeRest/commit/56248b2abf6da0e3d65afe455207f96b964f9cf4))


### Tests

* **mutation:** atualizar dependência de mutação e retirar configurações que estão em desuso ([3559189](https://github.com/ServeRest/ServeRest/commit/3559189167669da148e9de396834515407df1168))
* reduzir a complexidade e quantidade de chamadas do teste utilizando stub ([1fd5a1e](https://github.com/ServeRest/ServeRest/commit/1fd5a1e68ff2c4ae2c06be45886f7d1383d7be0e))
* validar comportamento em cenário de exceção (500) ([b585918](https://github.com/ServeRest/ServeRest/commit/b585918048837325eb5053ecede39901b6e3d2b8)), closes [#182](https://github.com/ServeRest/ServeRest/issues/182)

## [2.19.1](https://github.com/ServeRest/ServeRest/compare/v2.19.0...v2.19.1) (2020-11-01)


### Bug Fixes

* disponiblizar a rota /status apenas para ambiente online, suprimindo erro de 'event-loop-stats' ([3d9907a](https://github.com/ServeRest/ServeRest/commit/3d9907a63da5f8a1beb9944bc33f87021f612e8b))

# [2.19.0](https://github.com/ServeRest/ServeRest/compare/v2.18.4...v2.19.0) (2020-10-30)


### Documentation

* **readme:** incluir nível de patrocínio empresarial com subdomínio e monitoramento como retorno ([6271da3](https://github.com/ServeRest/ServeRest/commit/6271da3ee808c9025506a9870adc7bb4ba3d42e0))


### Features

* monitorar consumo da máquina pelo ServeRest através da nova rota /status ([7b2f73a](https://github.com/ServeRest/ServeRest/commit/7b2f73a6225d77735d601482441b2c43a473cb1b))

## [2.18.4](https://github.com/ServeRest/ServeRest/compare/v2.18.3...v2.18.4) (2020-10-29)


### Code Refactoring

* **patch:** monitorar os acessos à documentação para ficar a par de possíveis erros ([a7af78d](https://github.com/ServeRest/ServeRest/commit/a7af78d35e07e639539ff2d16f834aa7c4be730a))

## [2.18.3](https://github.com/ServeRest/ServeRest/compare/v2.18.2...v2.18.3) (2020-10-26)


### Bug Fixes

* **monitor:** execução do ServeRest em 'docker' estava sendo mapeado como 'npm' no monitoramento ([030272a](https://github.com/ServeRest/ServeRest/commit/030272adab16e9a00d83fc598bf02d7a55f20b94))

## [2.18.2](https://github.com/ServeRest/ServeRest/compare/v2.18.1...v2.18.2) (2020-10-26)


### Bug Fixes

* **monitor:** monitoramento não estava enviando os dados devido a incompatibilidade com async/await ([5f6034d](https://github.com/ServeRest/ServeRest/commit/5f6034de18ecf6ec352902aa2d56b9109fd5f506))


### Continuous Integration

* **continuous_delivery:** corrigir branch origem e erro de 'shallow update' ([38c9bbf](https://github.com/ServeRest/ServeRest/commit/38c9bbf950f7a71803539ed05a1d02ecac4b7fcf))

## [2.18.1](https://github.com/ServeRest/ServeRest/compare/v2.18.0...v2.18.1) (2020-10-25)


### Bug Fixes

* **ambiente:** username da máquina de hospedagem estava incorreto ([9a73ca2](https://github.com/ServeRest/ServeRest/commit/9a73ca2b93eedc6377e838b16142622f3ea5f6e1))
* **npm:** diretorio /docs precisa fazer parte do pacote npm ([774939f](https://github.com/ServeRest/ServeRest/commit/774939f9dc200ae35681a1cb7c62bf37775a0a82))


### Continuous Integration

* **continuous_delivery:** corrigir nome do job ([5363749](https://github.com/ServeRest/ServeRest/commit/53637497f071b81ad93955ae3f47e2743a6eb788))

# [2.18.0](https://github.com/ServeRest/ServeRest/compare/v2.17.0...v2.18.0) (2020-10-25)


### Continuous Integration

* **continuous_delivery:** forçar histórico do repositório atual em api.serverest.dev ([3afcdd1](https://github.com/ServeRest/ServeRest/commit/3afcdd19b6a3127f9e21e82b0cae99829216dbea))


### Features

* mover ambiente de api.serverest.dev para serverest.dev e atualizar documentação ([0fac870](https://github.com/ServeRest/ServeRest/commit/0fac870d36c4ae751ade8be0d8a5c1aa545d7748))
* **no-release:** implementar rota /version ([3ecdb7d](https://github.com/ServeRest/ServeRest/commit/3ecdb7d31a7e11e7e13d603579e5361539a59b0a))

# [2.17.0](https://github.com/ServeRest/ServeRest/compare/v2.16.0...v2.17.0) (2020-10-21)


### Code Refactoring

* **authentication-middleware:** remover condicional sem uso ([576f84b](https://github.com/ServeRest/ServeRest/commit/576f84b0de5659075f55f702f4c731613e34a224))
* remover try/catch suprimido pelo error handler ([c7e70ab](https://github.com/ServeRest/ServeRest/commit/c7e70ab75187be1036998d38eb36db85fabe7bf6))


### Continuous Integration

* **continuous_delivery:** garantir push da última versão gerada pela release ([0857a48](https://github.com/ServeRest/ServeRest/commit/0857a48f079c11aef464b759d72b6b58b34eee94))


### Documentation

* **no-release:** valorizar as pessoas que colaboram ante empresas ([31d99b8](https://github.com/ServeRest/ServeRest/commit/31d99b8415864da82a948c1eb159040c4f3a1605))


### Features

* **app:** suprimir status code 304 em GET ([2295993](https://github.com/ServeRest/ServeRest/commit/22959935260ef919830175f6ebf2ef2b896cae59))

# [2.16.0](https://github.com/ServeRest/ServeRest/compare/v2.15.0...v2.16.0) (2020-10-16)


### Chores

* monitorar acessos em serverest.dev ([#163](https://github.com/ServeRest/ServeRest/issues/163)) ([f0e98d6](https://github.com/ServeRest/ServeRest/commit/f0e98d63d56275378e02206ac5e5042ad87e28d5))


### Features

* **lgpd:** identificação do usuário por tipo de execução do serverest ([84a3622](https://github.com/ServeRest/ServeRest/commit/84a3622849baebae9733aba4535f884a3c21348e)), closes [#159](https://github.com/ServeRest/ServeRest/issues/159)

# [2.15.0](https://github.com/ServeRest/ServeRest/compare/v2.14.0...v2.15.0) (2020-10-16)


### Features

* disponibilizar o ServeRest em api.serverest.dev ([#162](https://github.com/ServeRest/ServeRest/issues/162)) ([3c2de9c](https://github.com/ServeRest/ServeRest/commit/3c2de9c5f874f439077436f4f684b82699c26585))

# [2.14.0](https://github.com/ServeRest/ServeRest/compare/v2.13.3...v2.14.0) (2020-10-15)


### Features

* mover a doc de js.org para o domínio serverest.dev ([#161](https://github.com/ServeRest/ServeRest/issues/161)) ([13df370](https://github.com/ServeRest/ServeRest/commit/13df370e8d29cd0a0c8422b67c11b51a43872779))

## [2.13.3](https://github.com/ServeRest/ServeRest/compare/v2.13.2...v2.13.3) (2020-10-15)


### Chores

* **deps-dev:** bump @commitlint/cli from 9.1.2 to 11.0.0 ([#152](https://github.com/ServeRest/ServeRest/issues/152)) ([74bc016](https://github.com/ServeRest/ServeRest/commit/74bc016b86f91dd888242a1bb50ad6bc6a51765a))
* **deps-dev:** bump faker from 4.1.0 to 5.1.0 ([#155](https://github.com/ServeRest/ServeRest/issues/155)) ([6d040e6](https://github.com/ServeRest/ServeRest/commit/6d040e6fa0dcb876a8d3b440122d128b79f48805))
* **deps-dev:** bump husky from 4.2.5 to 4.3.0 ([#154](https://github.com/ServeRest/ServeRest/issues/154)) ([77655ad](https://github.com/ServeRest/ServeRest/commit/77655ade1da30591bfd775d0876858196ca5d278))
* **deps-dev:** bump supertest from 4.0.2 to 5.0.0 ([#156](https://github.com/ServeRest/ServeRest/issues/156)) ([ea8936f](https://github.com/ServeRest/ServeRest/commit/ea8936fb3338efca2c352caefae5cf479aaeba5b))


### Documentation

* **readme:** incluir patrocínio do Open Collective ([#160](https://github.com/ServeRest/ServeRest/issues/160)) ([fed28ad](https://github.com/ServeRest/ServeRest/commit/fed28ad2af537a7573160030f872319d02d47040))

## [2.13.2](https://github.com/ServeRest/ServeRest/compare/v2.13.1...v2.13.2) (2020-10-06)


### Documentation

* **readme:** incluir exemplos de repositórios que consomem o ServeRest ([9a6de7d](https://github.com/ServeRest/ServeRest/commit/9a6de7d38daf51a743913764d2b72abd5820a673))

## [2.13.1](https://github.com/ServeRest/ServeRest/compare/v2.13.0...v2.13.1) (2020-10-05)


### Bug Fixes

* **docker:** change node image to alpine image ([#149](https://github.com/ServeRest/ServeRest/issues/149)) ([5b52c72](https://github.com/ServeRest/ServeRest/commit/5b52c7276bdb4266a96cd40d9459931261ee8b4f))

# [2.13.0](https://github.com/ServeRest/ServeRest/compare/v2.12.2...v2.13.0) (2020-10-04)


### Features

* **terminal:** tornar o terminal mais informativo ([0953977](https://github.com/ServeRest/ServeRest/commit/09539779a2b5725a9ab69410d3a4c44ef1af4f8c))

## [2.12.2](https://github.com/ServeRest/ServeRest/compare/v2.12.1...v2.12.2) (2020-10-03)


### Documentation

* **contributing:** comando 'ci' não altera versão no package-lock.json ([d4134cb](https://github.com/ServeRest/ServeRest/commit/d4134cbad4c9b9816a95051ac4b229ae008fe8df))
* **contributing:** sugerir teste local utilizando docker ([c8f6b73](https://github.com/ServeRest/ServeRest/commit/c8f6b73bd34247cdd31cf67bafb071846b4d2f8a))
* **readme:** alterar link da badge da página js.org para o repositório ([8d8d840](https://github.com/ServeRest/ServeRest/commit/8d8d8408259465976e586c14e69b2bea38682df0))

## [2.12.1](https://github.com/ServeRest/ServeRest/compare/v2.12.0...v2.12.1) (2020-10-02)


### Bug Fixes

* **docker:** habilitar monitoramento ([e005133](https://github.com/ServeRest/ServeRest/commit/e0051330da299b694ab884cf8acef46813c1e1a1))

# [2.12.0](https://github.com/ServeRest/ServeRest/compare/v2.11.0...v2.12.0) (2020-10-02)


### Continuous Integration

* run mutation test, check-link and codeql workflows on pull requests ([#140](https://github.com/ServeRest/ServeRest/issues/140)) ([6e11498](https://github.com/ServeRest/ServeRest/commit/6e1149868b350b9d8a3f87baeed6c15626d7c324))
* usar versão específica do ubuntu ([#141](https://github.com/ServeRest/ServeRest/issues/141)) ([9439309](https://github.com/ServeRest/ServeRest/commit/9439309af085760db230d947d8409dff29c96a8f))


### Documentation

* add eliasreis54 as a infra contributor ([#145](https://github.com/ServeRest/ServeRest/issues/145)) ([e65bbe1](https://github.com/ServeRest/ServeRest/commit/e65bbe134ed3389ad073862e1829bf2e29574d8f))
* add gomex as a contributor ([#143](https://github.com/ServeRest/ServeRest/issues/143)) ([631c6cf](https://github.com/ServeRest/ServeRest/commit/631c6cf344396db01b9141232c22fdfb43484454))
* add rustnnes as a contributor ([#144](https://github.com/ServeRest/ServeRest/issues/144)) ([cd4da26](https://github.com/ServeRest/ServeRest/commit/cd4da26c52bb0c6f809fd5a46feb9fce9e7c0504))


### Features

* add ServeRest on docker hub ([#146](https://github.com/ServeRest/ServeRest/issues/146)) ([4d750b8](https://github.com/ServeRest/ServeRest/commit/4d750b89bf305f2a31b18700c9ae9ca6efccc94c)), closes [#47](https://github.com/ServeRest/ServeRest/issues/47)

# [2.11.0](https://github.com/ServeRest/ServeRest/compare/v2.10.1...v2.11.0) (2020-10-02)


### Features

* incluir propriedade imagem na rota /produtos ([#134](https://github.com/ServeRest/ServeRest/issues/134)) ([6669cf2](https://github.com/ServeRest/ServeRest/commit/6669cf206ee9ce8b5041ceae448dba51b01e55cf)), closes [#107](https://github.com/ServeRest/ServeRest/issues/107)

## [2.10.1](https://github.com/ServeRest/ServeRest/compare/v2.10.0...v2.10.1) (2020-10-01)


### Chores

* **deps-dev:** bump @commitlint/config-conventional ([#128](https://github.com/ServeRest/ServeRest/issues/128)) ([c9794f2](https://github.com/ServeRest/ServeRest/commit/c9794f27c81b174fdab58e9c3a8edcd832c2259e))
* **deps-dev:** bump @semantic-release/npm from 7.0.5 to 7.0.6 ([#124](https://github.com/ServeRest/ServeRest/issues/124)) ([1c653ba](https://github.com/ServeRest/ServeRest/commit/1c653bac10385e66c18917f34e7dbc3661240114))
* **deps-dev:** bump lint-staged from 10.2.11 to 10.4.0 ([#127](https://github.com/ServeRest/ServeRest/issues/127)) ([2e51e77](https://github.com/ServeRest/ServeRest/commit/2e51e77f2c095e10f7ddef732a09545f58e5528c))
* **package:** run tests on pre-push ([#129](https://github.com/ServeRest/ServeRest/issues/129)) ([0ed6afe](https://github.com/ServeRest/ServeRest/commit/0ed6afe5f426791a30312af4941e97af0e7abb68))


### Code Refactoring

* extrair tratamento de erro para um middleware ([#137](https://github.com/ServeRest/ServeRest/issues/137)) ([3532c2a](https://github.com/ServeRest/ServeRest/commit/3532c2a8ba4d1ccedbc7450f45718acaed1831e9)), closes [#120](https://github.com/ServeRest/ServeRest/issues/120)


### Documentation

* **readme:** adicionar a seção de apoio e badge do projeto ([#135](https://github.com/ServeRest/ServeRest/issues/135)) ([0480c02](https://github.com/ServeRest/ServeRest/commit/0480c02c6f9768edc4a3e2ec05e8c41da021d492)), closes [#121](https://github.com/ServeRest/ServeRest/issues/121)
* add doamaral as a contributor ([#136](https://github.com/ServeRest/ServeRest/issues/136)) ([c9dfd31](https://github.com/ServeRest/ServeRest/commit/c9dfd31d7e6043c6d169a68c6d823263b8b60243))
* add gabriel-pinheiro as a contributor ([#138](https://github.com/ServeRest/ServeRest/issues/138)) ([a60b9f2](https://github.com/ServeRest/ServeRest/commit/a60b9f2c305cf216719020b85d241b7e331a87ec))
* **contributing:** incluir git e node como pré-requisitos ([d9a86db](https://github.com/ServeRest/ServeRest/commit/d9a86dbd5fcc5d8d1c9c69374b800e46686cc6b4))
* add eliasreis54 as a contributor ([#130](https://github.com/ServeRest/ServeRest/issues/130)) ([46229c6](https://github.com/ServeRest/ServeRest/commit/46229c6920e426a2437ee073ba63c830bd992f57))

# [2.10.0](https://github.com/ServeRest/ServeRest/compare/v2.9.4...v2.10.0) (2020-09-18)


### Bug Fixes

* suprimir erro 'entity.parse.failed' ([9880631](https://github.com/ServeRest/ServeRest/commit/9880631778667b2115ccb6d41fe891247ff14220)), closes [#36](https://github.com/ServeRest/ServeRest/issues/36)
* traduzir mensagem 'must be of type object'  ([#118](https://github.com/ServeRest/ServeRest/issues/118)) ([974303e](https://github.com/ServeRest/ServeRest/commit/974303e13403ca57deb572c6ffc5a01ca9690aff)), closes [#114](https://github.com/ServeRest/ServeRest/issues/114)


### Features

* habilitar cross-origin resource sharing (CORS) ([ebf1501](https://github.com/ServeRest/ServeRest/commit/ebf1501f1423730a3fdc47573c0ab498e77a3a99)), closes [#108](https://github.com/ServeRest/ServeRest/issues/108)

## [2.9.4](https://github.com/ServeRest/ServeRest/compare/v2.9.3...v2.9.4) (2020-09-17)


### Bug Fixes

* **montarMensagemDeErroDeSchema:** traduzir 'string.empty' ([333f273](https://github.com/ServeRest/ServeRest/commit/333f273cb651c062a6a669072d86a500da188b2e))


### Tests

* mapear propriedade em branco ([20ef057](https://github.com/ServeRest/ServeRest/commit/20ef05701549ea0cebe859decdd3c6ae934dba2f))

## [2.9.3](https://github.com/ServeRest/ServeRest/compare/v2.9.2...v2.9.3) (2020-09-17)


### Bug Fixes

* detalhar mensagem de erro de schema não mapeado para facilitar correção ([0cbd5b0](https://github.com/ServeRest/ServeRest/commit/0cbd5b05423a543460cd6783e9dcbd72e3253b1d))


### Chores

* **package:** alterar licença do pacote ([27fa117](https://github.com/ServeRest/ServeRest/commit/27fa117d8024f366f50286b60538990cc9c5bf81))

## [2.9.2](https://github.com/ServeRest/ServeRest/compare/v2.9.1...v2.9.2) (2020-09-16)


### Documentation

* **readme:** remover badge de licença ([5ce8bcb](https://github.com/ServeRest/ServeRest/commit/5ce8bcbea3f502159981e05d5052a03d2e57014d))
* add brunobatista25 as a contributor ([#113](https://github.com/ServeRest/ServeRest/issues/113)) ([685d6ac](https://github.com/ServeRest/ServeRest/commit/685d6ac782635f3f59c1f2929c7c5d857d277528))
* update .all-contributorsrc ([a8e5c01](https://github.com/ServeRest/ServeRest/commit/a8e5c0178d76dca1d77046b9cea03bf92930d881))
* update README.md ([8c84aab](https://github.com/ServeRest/ServeRest/commit/8c84aab0d592c368905cfbf996e8091cc2db6be8))
* **license:** tornar o ServeRest copyleft ([b392feb](https://github.com/ServeRest/ServeRest/commit/b392febb90d62bee5a1980153d763f278b56898d))

## [2.9.1](https://github.com/ServeRest/ServeRest/compare/v2.9.0...v2.9.1) (2020-09-16)


### Documentation

* **readme:** informar empresas que usam o projeto ([2e9aaba](https://github.com/ServeRest/ServeRest/commit/2e9aabae80a9e569161b56115373cca9abf14c54))

# [2.9.0](https://github.com/ServeRest/ServeRest/compare/v2.8.2...v2.9.0) (2020-09-11)


### Features

* **monitoramento:** identificar versão utilizada ([8b1abb7](https://github.com/ServeRest/ServeRest/commit/8b1abb75550138d0107e9c99278bed14ffc7ec7d))

## [2.8.2](https://github.com/ServeRest/ServeRest/compare/v2.8.1...v2.8.2) (2020-09-06)


### Chores

* **moesif:** atualizar nome da dependência ([e0fea0c](https://github.com/ServeRest/ServeRest/commit/e0fea0c5a7ad45e1630b0ff33c4511a21cbb1e48))
* **seguranca:** atualizar versão do commitizen ([781f10e](https://github.com/ServeRest/ServeRest/commit/781f10ef731c7918b306f4a6095b9ab28bbd00b2))


### Code Refactoring

* **monitor:** melhorar legibilidade de quando o monitoramento é habilitado ([1e647b3](https://github.com/ServeRest/ServeRest/commit/1e647b397f602ff10cbfea8c9ec937799b9957f5))


### Continuous Integration

* **check-link:** não validar link de e-mail ([c8645da](https://github.com/ServeRest/ServeRest/commit/c8645da0d685c75ba4f0f00a38e1860101b24c65))


### Documentation

* **readme:** corrigir links quebrados ([57b651d](https://github.com/ServeRest/ServeRest/commit/57b651ddd942b987ecaeb2c872f34a8b61cbeb99))

## [2.8.1](https://github.com/ServeRest/ServeRest/compare/v2.8.0...v2.8.1) (2020-09-04)


### Bug Fixes

* suprimir mensagem de alerta de método obsoleto ([9efdcd5](https://github.com/ServeRest/ServeRest/commit/9efdcd56ccd06115c27498dfcf56e4e598dcff70))

# [2.8.0](https://github.com/ServeRest/ServeRest/compare/v2.7.2...v2.8.0) (2020-09-04)


### Chores

* **deps:** bump codecov/codecov-action from v1.0.12 to v1.0.13 ([e29531c](https://github.com/ServeRest/ServeRest/commit/e29531c276d764251ef567f8bd30245a7d79e03c))
* **deps:** bump wagoid/commitlint-github-action from v1 to v2.0.2 ([553c58d](https://github.com/ServeRest/ServeRest/commit/553c58dd1c678541d41f590595dba658452874da))
* **deps-dev:** bump mocha from 8.0.1 to 8.1.0 ([d2f9547](https://github.com/ServeRest/ServeRest/commit/d2f95470769a7fabaeb3cfbcc756ac9da6a749e6))


### Code Refactoring

* remover configuração desnecessária de header ([6c569fb](https://github.com/ServeRest/ServeRest/commit/6c569fbadb8dbb5ba8e7b0110bb80b1049873d5c))
* simplificar mapeamento de erro de schema para melhor manutenibilidade ([cf3f694](https://github.com/ServeRest/ServeRest/commit/cf3f69455a8085c0cdab9f341eafe5b538948631))
* **releaserc:** simplificar o mapeamento de commit para melhor manutenibilidade ([cf7e6ea](https://github.com/ServeRest/ServeRest/commit/cf7e6ea26878364ed20e4a6452a0bd41bec87e08))
* executar lint no pre-commit apenas nos arquivos em staged ([bac398d](https://github.com/ServeRest/ServeRest/commit/bac398dce06bbb4d7be5a47bc485ee19af2c1c76))
* suprimir log na execução dos testes ([c540a0d](https://github.com/ServeRest/ServeRest/commit/c540a0df8a3ff2323f1efdfac9f6f7faebce5925)), closes [#87](https://github.com/ServeRest/ServeRest/issues/87)


### Continuous Integration

* permitir trigger manual da pipeline de CI ([8d26e45](https://github.com/ServeRest/ServeRest/commit/8d26e45500f0c0edb1878c2934e6db7b568140d3))
* separar testes de mutação em workflow próprio e ajustar dashboard ([c5b999a](https://github.com/ServeRest/ServeRest/commit/c5b999a599889def48a6d02b750b66278d12a73f))
* **releaserc:** gerar nota de release para todos os tipos de commit ([bd35834](https://github.com/ServeRest/ServeRest/commit/bd358348309b093efebd98477219f45d5956aeda))
* **releaserc:** inserir label de versão publicada nas issues e PRs ([01c8549](https://github.com/ServeRest/ServeRest/commit/01c854968a4f50787660498d388b769024404f9b))
* **releaserc:** não rodar CI em commit de release ([8edd76b](https://github.com/ServeRest/ServeRest/commit/8edd76b7b6f11a37f130b9ba43fd72ebb2f89824))


### Documentation

* **contributing:** documentar publicação no NPM e criar sumário ([603834f](https://github.com/ServeRest/ServeRest/commit/603834fe60af19b1ff37546e6f12a5e4967263e0)), closes [#89](https://github.com/ServeRest/ServeRest/issues/89)
* **contributing:** incluir material sobre 'teste de mutação' ([6d77040](https://github.com/ServeRest/ServeRest/commit/6d77040c53c8bc8d8d0f33b7928eb70a3054d027))
* **contributing:** reordenar seção e explicitar possibilidade de apoio ([f0700a4](https://github.com/ServeRest/ServeRest/commit/f0700a4b3b50e53bdaa400eb2691c42a71ecd385))


### Features

* **monitoramento:** monitoramento do consumo das rotas ([4e612cd](https://github.com/ServeRest/ServeRest/commit/4e612cd03ec091066bd083698f2a24bc0f853f04)), closes [#88](https://github.com/ServeRest/ServeRest/issues/88)


### Tests

* **mutation:** implementar testes de mutação ([4548095](https://github.com/ServeRest/ServeRest/commit/45480950a4195350997dc50973581ee37ef5df77)), closes [#86](https://github.com/ServeRest/ServeRest/issues/86)
* **stryker:** reduzir timeout do teste de mutação ([15068ea](https://github.com/ServeRest/ServeRest/commit/15068ea7fa57c3414cf024800e1875dfa07f0f19))

## [2.7.2](https://github.com/ServeRest/ServeRest/compare/v2.7.1...v2.7.2) (2020-07-30)

## [2.7.2-beta.1](https://github.com/ServeRest/ServeRest/compare/v2.7.1...v2.7.2-beta.1) (2020-07-30)

## [2.7.1](https://github.com/ServeRest/ServeRest/compare/v2.7.0...v2.7.1) (2020-07-30)


### Bug Fixes

* validar tipos enviados na query string em /carrinhos e /produtos ([7fd7c13](https://github.com/ServeRest/ServeRest/commit/7fd7c1343647963f9af14f7313637f5b8d20c88d))

# [2.7.0](https://github.com/ServeRest/ServeRest/compare/v2.6.1...v2.7.0) (2020-07-30)


### Features

* mensagens de erro de schema serão mais claras e em PT-BR ([#82](https://github.com/ServeRest/ServeRest/issues/82)) ([d482ae6](https://github.com/ServeRest/ServeRest/commit/d482ae60b59bd9f4b12a46eec9fa31852f250f30)), closes [#72](https://github.com/ServeRest/ServeRest/issues/72)

# [2.7.0-beta.1](https://github.com/ServeRest/ServeRest/compare/v2.6.1...v2.7.0-beta.1) (2020-07-30)


### Features

* mensagens de erro de schema serão mais claras e em PT-BR ([cce26fb](https://github.com/ServeRest/ServeRest/commit/cce26fbafe73247b17c9a618fbb8f4c18a84c977)), closes [#72](https://github.com/ServeRest/ServeRest/issues/72)

## [2.6.1](https://github.com/ServeRest/ServeRest/compare/v2.6.0...v2.6.1) (2020-07-07)


### Reverts

* Revert "feat(server): apresentar versão do ServeRest no help e ao iniciar" ([78cb5e2](https://github.com/ServeRest/ServeRest/commit/78cb5e23049c88d46c3879cb82f0eb6468352b03))

# [2.6.0](https://github.com/ServeRest/ServeRest/compare/v2.5.3...v2.6.0) (2020-07-07)


### Features

* **server:** apresentar versão do ServeRest no help e ao iniciar ([557fbb9](https://github.com/ServeRest/ServeRest/commit/557fbb9c0d6ec4014257c89c561cdc7bf9f2c98b))

## [2.5.3](https://github.com/ServeRest/ServeRest/compare/v2.5.2...v2.5.3) (2020-07-03)


### Reverts

* Revert "ci: inserir forma de não executar CI" ([0bf32ee](https://github.com/ServeRest/ServeRest/commit/0bf32ee923c9a623bb25c3707dfb9a795ab42d46))

## [2.5.2](https://github.com/ServeRest/ServeRest/compare/v2.5.1...v2.5.2) (2020-07-02)

## [2.5.1](https://github.com/ServeRest/ServeRest/compare/v2.5.0...v2.5.1) (2020-07-01)

# [2.5.0](https://github.com/ServeRest/ServeRest/compare/v2.4.5...v2.5.0) (2020-06-29)


### Bug Fixes

* apresentar mensagem de início apenas ao iniciar o ServeRest ([b895764](https://github.com/ServeRest/ServeRest/commit/b89576401e2c8fa366a38480cd750e95c33ffba5))


### Features

* jSON da resposta será identado com 4 espaços ([9e10467](https://github.com/ServeRest/ServeRest/commit/9e1046734ab66d99fea7f38ce8d95e99799b8dc5))

## [2.4.5](https://github.com/ServeRest/ServeRest/compare/v2.4.4...v2.4.5) (2020-06-14)

## [2.4.4](https://github.com/ServeRest/ServeRest/compare/v2.4.3...v2.4.4) (2020-06-13)

## [2.4.3](https://github.com/ServeRest/ServeRest/compare/v2.4.2...v2.4.3) (2020-06-12)

## [2.4.2](https://github.com/ServeRest/ServeRest/compare/v2.4.1...v2.4.2) (2020-06-12)


### Bug Fixes

* suprimir request em /favicon.ico ([0e5f78d](https://github.com/ServeRest/ServeRest/commit/0e5f78dd2691286c68286fb477f7d3384cc328fd))

## [2.4.1](https://github.com/ServeRest/ServeRest/compare/v2.4.0...v2.4.1) (2020-06-11)


### Performance Improvements

* retirar dependência 'helmet' ([8f4d1e0](https://github.com/ServeRest/ServeRest/commit/8f4d1e0b69c7589557f34bbf234d7120bb9ac05d))

# [2.4.0](https://github.com/ServeRest/ServeRest/compare/v2.3.0...v2.4.0) (2020-06-11)


### Features

* **timeout:** duração padrão do timeout alterada de 1 segundo para 600 ([e6595ec](https://github.com/ServeRest/ServeRest/commit/e6595ec73b3df28b1716e7889ea1b93fd0cf9ec2)), closes [#42](https://github.com/ServeRest/ServeRest/issues/42)

# [2.3.0](https://github.com/ServeRest/ServeRest/compare/v2.2.7...v2.3.0) (2020-06-10)


### Features

* **login:** opção de desabilitar 'Bearer' do retorno de '/login' ([ba9a60b](https://github.com/ServeRest/ServeRest/commit/ba9a60b7952997a1929fa776f34b6f52e73dc4c9))

## [2.2.7](https://github.com/ServeRest/ServeRest/compare/v2.2.6...v2.2.7) (2020-06-10)

## [2.2.6](https://github.com/ServeRest/ServeRest/compare/v2.2.5...v2.2.6) (2020-06-10)

## [2.2.5](https://github.com/ServeRest/ServeRest/compare/v2.2.4...v2.2.5) (2020-06-09)

## [2.2.4](https://github.com/ServeRest/ServeRest/compare/v2.2.3...v2.2.4) (2020-06-09)


### Bug Fixes

* **api-doc:** remover documentação local e excluir rota 'api-doc' ([3976c71](https://github.com/ServeRest/ServeRest/commit/3976c715f8a116cc8d84f9d3e1abed4bb03c26cc))

## [2.2.3](https://github.com/ServeRest/ServeRest/compare/v2.2.2...v2.2.3) (2020-06-07)


### Bug Fixes

* **help:** comando de desabilitar documentação alterado de '-n' p/ '-d' ([8f59c9e](https://github.com/ServeRest/ServeRest/commit/8f59c9eb59117ab7ffe22b283a970e3fc820ab65))

## [2.2.2](https://github.com/ServeRest/ServeRest/compare/v2.2.1...v2.2.2) (2020-06-07)

## [2.2.1](https://github.com/ServeRest/ServeRest/compare/v2.2.0...v2.2.1) (2020-06-07)

## [2.2.0](https://github.com/ServeRest/ServeRest/compare/v2.1.5...v2.2.0) (2020-06-06)


### Features

* **conf:** timeout de token alterado de milissegundos para segundos ([dd333f9](https://github.com/ServeRest/ServeRest/commit/dd333f94bf7661381d60ca2705395653aff2c29a))


### Bug Fixes

* **package:** ajustar caminho de destino da doc html gerada ([ece00a0](https://github.com/ServeRest/ServeRest/commit/ece00a000a75a3fec33c95a6ce059a5fa6952999))

### [2.1.5](https://github.com/ServeRest/ServeRest/compare/v2.1.4...v2.1.5) (2020-06-04)

### [2.1.4](https://github.com/ServeRest/ServeRest/compare/v2.1.3...v2.1.4) (2020-06-03)


### Bug Fixes

* **help:** ajuste da URL do repositório no help do ServeRest ([5c9e462](https://github.com/ServeRest/ServeRest/commit/5c9e462adf4da38d4c1194af06418eb69e408c93))

### [2.1.3](https://github.com/ServeRest/ServeRest/compare/v2.1.2...v2.1.3) (2020-06-02)


### Bug Fixes

* **api-doc:** correção do status code de erro ao logar ([6da4aed](https://github.com/ServeRest/ServeRest/commit/6da4aedc599eb84aba9b51e7945436515de80c8c))

### [2.1.2](https://github.com/ServeRest/ServeRest/compare/v2.1.1...v2.1.2) (2020-05-30)


### Bug Fixes

* ajuste de status code ao realizar request em rota inexistente ([7b5d878](https://github.com/ServeRest/ServeRest/commit/7b5d878267060f7d2976b667335f844c2c2260e8)), closes [#26](https://github.com/ServeRest/ServeRest/issues/26)

### [2.1.1](https://github.com/ServeRest/ServeRest/compare/v2.1.0...v2.1.1) (2020-05-23)

## [2.1.0](https://github.com/ServeRest/ServeRest/compare/v2.0.1...v2.1.0) (2020-05-22)


### Features

* **security:** incluir cabeçalhos de segurança e configuração ([9342cac](https://github.com/ServeRest/ServeRest/commit/9342cac41a0af7435104c26f44fb628375ecad6b))


### Bug Fixes

* **doc:** incluir ícone na documentação ([1fb4321](https://github.com/ServeRest/ServeRest/commit/1fb43214f4cb0f3c23b9be42f97ef5d72f1183df))

### [2.0.3](https://github.com/ServeRest/ServeRest/compare/v2.0.1...v2.0.3) (2020-05-22)


### Bug Fixes

* **doc:** incluir ícone na documentação ([1fb4321](https://github.com/ServeRest/ServeRest/commit/1fb43214f4cb0f3c23b9be42f97ef5d72f1183df))

### [2.0.2](https://github.com/ServeRest/ServeRest/compare/v2.0.1...v2.0.2) (2020-05-18)

#### Docs
* **api-doc:** alteração do contraste da documentação ([68314f9](https://github.com/ServeRest/ServeRest/commit/8cdfe7d45064771e1b7726c60ddfb10ad28c8087))


### [2.0.1](https://github.com/ServeRest/ServeRest/compare/v2.0.0...v2.0.1) (2020-05-18)

## [2.0.0](https://github.com/ServeRest/ServeRest/compare/v1.1.7...v2.0.0) (2020-05-18)


### ⚠ BREAKING CHANGES

* **routes:** Alteração de todas as rotas

### Features

* **middleware:** inclusão do middleware 'authentication' ([05c204a](https://github.com/ServeRest/ServeRest/commit/05c204aba74152eacd6af79324b6a966cb98c059))
* alterado ponto de entrada do ServeRest ([5ed2650](https://github.com/ServeRest/ServeRest/commit/5ed26504e5ee41be8e393eae8e1f348f17a7e90e))
* implementado DELETE 'cancelar-compra' e '/concluir-compra' ([203c9ea](https://github.com/ServeRest/ServeRest/commit/203c9eab19383cbc005f750ae6262208890f0c27))
* **carrinhos:** inclusão da chave 'quantidadetotal' ([d2b695b](https://github.com/ServeRest/ServeRest/commit/d2b695b7d80918a41de7c91c4ea2b4cd4bb2af6c))
* proibição de DELETE caso usuario/produto tenha carrinho ([9bc92c1](https://github.com/ServeRest/ServeRest/commit/9bc92c1361b60902b75a8da5595eec2483cf5089))
* **carrinhos:** implementação do GET e POST da rota /carrinhos ([b888561](https://github.com/ServeRest/ServeRest/commit/b888561dea85c9edc6a160b67214759ff42ee5fa))
* alteração da entrega do token para ficar mais claro para o usuario ([3aa7d69](https://github.com/ServeRest/ServeRest/commit/3aa7d69f70c4e0f869c73ab1f333ee41f173ccdb))
* **docker:** adicionar os arquivos Dockerfile e Makefile ([8664b6b](https://github.com/ServeRest/ServeRest/commit/8664b6b14af81d9622476c7e129ee6a490ffa221)), closes [#10](https://github.com/ServeRest/ServeRest/issues/10)
* **login:** implementado a rota 'login' ([51eb300](https://github.com/ServeRest/ServeRest/commit/51eb300ae4254d60fd4173fd66a15365440463cd))
* **produtos:** implementado o GET da rota 'produtos' ([62df306](https://github.com/ServeRest/ServeRest/commit/62df306478bfb63936109f281826ee199af67a5a))
* **produtos:** implementado rotas restantes e autenticação ([85c6738](https://github.com/ServeRest/ServeRest/commit/85c6738c779cdcb21c86eecb3c90f29631aa22ad))
* **usuarios:** implementado a rota 'usuarios' ([adc4e38](https://github.com/ServeRest/ServeRest/commit/adc4e38d864126512ea49f25fa3c4aecb5ecd3da))


### Bug Fixes

* **authentication:** validação se o token pertence a usuário existente ([3036f43](https://github.com/ServeRest/ServeRest/commit/3036f438335a92193f60e0fa4ced232d4d074ecf))
* **carrinhos-model:** ajuste de chavs permitidas em GET ([1a0e14c](https://github.com/ServeRest/ServeRest/commit/1a0e14c9bc6d22847c3134a1e26751e9272d36dc))


* **readme:** atualização do readme e exclusão da página ([f118c36](https://github.com/ServeRest/ServeRest/commit/f118c367e4300e9adbad4593c00b162b70f15e66)), closes [#12](https://github.com/ServeRest/ServeRest/issues/12) [#5](https://github.com/ServeRest/ServeRest/issues/5) [#3](https://github.com/ServeRest/ServeRest/issues/3) [#2](https://github.com/ServeRest/ServeRest/issues/2)

## [1.1.7](https://github.com/ServeRest/ServeRest/compare/v1.1.6...v1.1.7) (2020-03-26)



## [1.1.6](https://github.com/ServeRest/ServeRest/compare/v1.1.4...v1.1.6) (2020-03-24)



## [1.1.4](https://github.com/ServeRest/ServeRest/compare/v1.1.3...v1.1.4) (2020-03-19)



## [1.1.3](https://github.com/ServeRest/ServeRest/compare/v1.1.2...v1.1.3) (2020-03-19)



## [1.1.2](https://github.com/ServeRest/ServeRest/compare/v1.1.1...v1.1.2) (2020-03-18)



## [1.1.1](https://github.com/ServeRest/ServeRest/compare/v1.1.0...v1.1.1) (2020-03-18)



# [1.1.0](https://github.com/ServeRest/ServeRest/compare/v1.0.3...v1.1.0) (2020-03-18)


### Features

* alteração do timeout do token de segundos para milissegundos ([a0bfd83](https://github.com/ServeRest/ServeRest/commit/a0bfd83ba1831271bd7a8dbbc64c6d02155154f3))



## [1.0.3](https://github.com/ServeRest/ServeRest/compare/v1.0.2...v1.0.3) (2020-03-17)


### Bug Fixes

* **ServeRest:** ajustado caminho do diretorio /data/db.json ([38aed48](https://github.com/ServeRest/ServeRest/commit/38aed48fa8c3a28426de4a7ddeeb723689378a13))



## [1.0.2](https://github.com/ServeRest/ServeRest/compare/v1.0.1...v1.0.2) (2020-03-17)



## [1.0.1](https://github.com/ServeRest/ServeRest/compare/a6571f5e9e0f7a8e80c6b8400acf08063810c8b0...v1.0.1) (2020-03-17)


### Bug Fixes

* ajustado forma de acesso aos arquivos em /data ([11eea2d](https://github.com/ServeRest/ServeRest/commit/11eea2dc6f891c502a999689e1bc867e6cfca65b))


### Features

* implement CLI conf, rewrite doc and update images ([a6571f5](https://github.com/ServeRest/ServeRest/commit/a6571f5e9e0f7a8e80c6b8400acf08063810c8b0))
