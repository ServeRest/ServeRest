## [2.2.2](https://github.com/PauloGoncalvesBH/ServeRest/compare/v2.2.1...v2.2.2) (2020-06-07)

## [2.2.1](https://github.com/PauloGoncalvesBH/ServeRest/compare/v2.2.0...v2.2.1) (2020-06-07)

## [2.2.0](https://github.com/PauloGoncalvesBH/serverest/compare/v2.1.5...v2.2.0) (2020-06-06)


### Features

* **conf:** timeout de token alterado de milissegundos para segundos ([dd333f9](https://github.com/PauloGoncalvesBH/serverest/commit/dd333f94bf7661381d60ca2705395653aff2c29a))


### Bug Fixes

* **package:** ajustar caminho de destino da doc html gerada ([ece00a0](https://github.com/PauloGoncalvesBH/serverest/commit/ece00a000a75a3fec33c95a6ce059a5fa6952999))

### [2.1.5](https://github.com/PauloGoncalvesBH/serverest/compare/v2.1.4...v2.1.5) (2020-06-04)

### [2.1.4](https://github.com/PauloGoncalvesBH/serverest/compare/v2.1.3...v2.1.4) (2020-06-03)


### Bug Fixes

* **help:** ajuste da URL do repositório no help do ServeRest ([5c9e462](https://github.com/PauloGoncalvesBH/serverest/commit/5c9e462adf4da38d4c1194af06418eb69e408c93))

### [2.1.3](https://github.com/PauloGoncalvesBH/serverest/compare/v2.1.2...v2.1.3) (2020-06-02)


### Bug Fixes

* **api-doc:** correção do status code de erro ao logar ([6da4aed](https://github.com/PauloGoncalvesBH/serverest/commit/6da4aedc599eb84aba9b51e7945436515de80c8c))

### [2.1.2](https://github.com/PauloGoncalvesBH/serverest/compare/v2.1.1...v2.1.2) (2020-05-30)


### Bug Fixes

* ajuste de status code ao realizar request em rota inexistente ([7b5d878](https://github.com/PauloGoncalvesBH/serverest/commit/7b5d878267060f7d2976b667335f844c2c2260e8)), closes [#26](https://github.com/PauloGoncalvesBH/serverest/issues/26)

### [2.1.1](https://github.com/PauloGoncalvesBH/serverest/compare/v2.1.0...v2.1.1) (2020-05-23)

## [2.1.0](https://github.com/PauloGoncalvesBH/serverest/compare/v2.0.1...v2.1.0) (2020-05-22)


### Features

* **security:** incluir cabeçalhos de segurança e configuração ([9342cac](https://github.com/PauloGoncalvesBH/serverest/commit/9342cac41a0af7435104c26f44fb628375ecad6b))


### Bug Fixes

* **doc:** incluir ícone na documentação ([1fb4321](https://github.com/PauloGoncalvesBH/serverest/commit/1fb43214f4cb0f3c23b9be42f97ef5d72f1183df))

### [2.0.3](https://github.com/PauloGoncalvesBH/serverest/compare/v2.0.1...v2.0.3) (2020-05-22)


### Bug Fixes

* **doc:** incluir ícone na documentação ([1fb4321](https://github.com/PauloGoncalvesBH/serverest/commit/1fb43214f4cb0f3c23b9be42f97ef5d72f1183df))

### [2.0.2](https://github.com/PauloGoncalvesBH/serverest/compare/v2.0.1...v2.0.2) (2020-05-18)

#### Docs
* **api-doc:** alteração do contraste da documentação ([68314f9](https://github.com/PauloGoncalvesBH/serverest/commit/8cdfe7d45064771e1b7726c60ddfb10ad28c8087))


### [2.0.1](https://github.com/PauloGoncalvesBH/serverest/compare/v2.0.0...v2.0.1) (2020-05-18)

## [2.0.0](https://github.com/PauloGoncalvesBH/serverest/compare/v1.1.7...v2.0.0) (2020-05-18)


### ⚠ BREAKING CHANGES

* **routes:** Alteração de todas as rotas

### Features

* **middleware:** inclusão do middleware 'authentication' ([05c204a](https://github.com/PauloGoncalvesBH/serverest/commit/05c204aba74152eacd6af79324b6a966cb98c059))
* alterado ponto de entrada do ServeRest ([5ed2650](https://github.com/PauloGoncalvesBH/serverest/commit/5ed26504e5ee41be8e393eae8e1f348f17a7e90e))
* implementado DELETE 'cancelar-compra' e '/concluir-compra' ([203c9ea](https://github.com/PauloGoncalvesBH/serverest/commit/203c9eab19383cbc005f750ae6262208890f0c27))
* **carrinhos:** inclusão da chave 'quantidadetotal' ([d2b695b](https://github.com/PauloGoncalvesBH/serverest/commit/d2b695b7d80918a41de7c91c4ea2b4cd4bb2af6c))
* proibição de DELETE caso usuario/produto tenha carrinho ([9bc92c1](https://github.com/PauloGoncalvesBH/serverest/commit/9bc92c1361b60902b75a8da5595eec2483cf5089))
* **carrinhos:** implementação do GET e POST da rota /carrinhos ([b888561](https://github.com/PauloGoncalvesBH/serverest/commit/b888561dea85c9edc6a160b67214759ff42ee5fa))
* alteração da entrega do token para ficar mais claro para o usuario ([3aa7d69](https://github.com/PauloGoncalvesBH/serverest/commit/3aa7d69f70c4e0f869c73ab1f333ee41f173ccdb))
* **docker:** adicionar os arquivos Dockerfile e Makefile ([8664b6b](https://github.com/PauloGoncalvesBH/serverest/commit/8664b6b14af81d9622476c7e129ee6a490ffa221)), closes [#10](https://github.com/PauloGoncalvesBH/serverest/issues/10)
* **login:** implementado a rota 'login' ([51eb300](https://github.com/PauloGoncalvesBH/serverest/commit/51eb300ae4254d60fd4173fd66a15365440463cd))
* **produtos:** implementado o GET da rota 'produtos' ([62df306](https://github.com/PauloGoncalvesBH/serverest/commit/62df306478bfb63936109f281826ee199af67a5a))
* **produtos:** implementado rotas restantes e autenticação ([85c6738](https://github.com/PauloGoncalvesBH/serverest/commit/85c6738c779cdcb21c86eecb3c90f29631aa22ad))
* **usuarios:** implementado a rota 'usuarios' ([adc4e38](https://github.com/PauloGoncalvesBH/serverest/commit/adc4e38d864126512ea49f25fa3c4aecb5ecd3da))


### Bug Fixes

* **authentication:** validação se o token pertence a usuário existente ([3036f43](https://github.com/PauloGoncalvesBH/serverest/commit/3036f438335a92193f60e0fa4ced232d4d074ecf))
* **carrinhos-model:** ajuste de chavs permitidas em GET ([1a0e14c](https://github.com/PauloGoncalvesBH/serverest/commit/1a0e14c9bc6d22847c3134a1e26751e9272d36dc))


* **readme:** atualização do readme e exclusão da página ([f118c36](https://github.com/PauloGoncalvesBH/serverest/commit/f118c367e4300e9adbad4593c00b162b70f15e66)), closes [#12](https://github.com/PauloGoncalvesBH/serverest/issues/12) [#5](https://github.com/PauloGoncalvesBH/serverest/issues/5) [#3](https://github.com/PauloGoncalvesBH/serverest/issues/3) [#2](https://github.com/PauloGoncalvesBH/serverest/issues/2)

## [1.1.7](https://github.com/PauloGoncalvesBH/serverest/compare/v1.1.6...v1.1.7) (2020-03-26)



## [1.1.6](https://github.com/PauloGoncalvesBH/serverest/compare/v1.1.4...v1.1.6) (2020-03-24)



## [1.1.4](https://github.com/PauloGoncalvesBH/serverest/compare/v1.1.3...v1.1.4) (2020-03-19)



## [1.1.3](https://github.com/PauloGoncalvesBH/serverest/compare/v1.1.2...v1.1.3) (2020-03-19)



## [1.1.2](https://github.com/PauloGoncalvesBH/serverest/compare/v1.1.1...v1.1.2) (2020-03-18)



## [1.1.1](https://github.com/PauloGoncalvesBH/serverest/compare/v1.1.0...v1.1.1) (2020-03-18)



# [1.1.0](https://github.com/PauloGoncalvesBH/serverest/compare/v1.0.3...v1.1.0) (2020-03-18)


### Features

* alteração do timeout do token de segundos para milissegundos ([a0bfd83](https://github.com/PauloGoncalvesBH/serverest/commit/a0bfd83ba1831271bd7a8dbbc64c6d02155154f3))



## [1.0.3](https://github.com/PauloGoncalvesBH/serverest/compare/v1.0.2...v1.0.3) (2020-03-17)


### Bug Fixes

* **serverest:** ajustado caminho do diretorio /data/db.json ([38aed48](https://github.com/PauloGoncalvesBH/serverest/commit/38aed48fa8c3a28426de4a7ddeeb723689378a13))



## [1.0.2](https://github.com/PauloGoncalvesBH/serverest/compare/v1.0.1...v1.0.2) (2020-03-17)



## [1.0.1](https://github.com/PauloGoncalvesBH/serverest/compare/a6571f5e9e0f7a8e80c6b8400acf08063810c8b0...v1.0.1) (2020-03-17)


### Bug Fixes

* ajustado forma de acesso aos arquivos em /data ([11eea2d](https://github.com/PauloGoncalvesBH/serverest/commit/11eea2dc6f891c502a999689e1bc867e6cfca65b))


### Features

* implement CLI conf, rewrite doc and update images ([a6571f5](https://github.com/PauloGoncalvesBH/serverest/commit/a6571f5e9e0f7a8e80c6b8400acf08063810c8b0))
