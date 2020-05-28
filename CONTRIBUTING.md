
# Como contribuir

[![Continuous Integration](https://github.com/PauloGoncalvesBH/serverest/workflows/Continuous%20Integration/badge.svg)](https://github.com/PauloGoncalvesBH/serverest/actions)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![BCH compliance](https://bettercodehub.com/edge/badge/PauloGoncalvesBH/serverest?branch=master)](https://bettercodehub.com/results/PauloGoncalvesBH/serverest)
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
4. Execute os testes com `npm test`;
5. Envie um [pull request](https://help.github.com/articles/about-pull-requests/);
6. Aguarde o resultado das validações realizadas na integração contínua. Caso haja alguma quebra, analise e faça as correções necessárias.
### Pull Requests que não passarem nas validações da integração contínua não serão revisados.

### Legenda
#### 💥 > Validação realizada na integração contínua
#### 💻 > Validação realizada no pré-commit


## 💥 Testes
Os testes são importantes para garantir a integridade do projeto a cada alteração realizada. É importante que atente de que a sua alteração necessite de novos testes ou adequação nos já existentes.

Os testes são criados com [mocha](https://www.npmjs.com/package/mocha) e validados com [chai](https://www.npmjs.com/package/chai).

Para executá-los, execute o comando `npm test`.

## 💥💻 Lint

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

## Better Code Hub

[![BCH compliance](https://bettercodehub.com/edge/badge/PauloGoncalvesBH/serverest?branch=master)](https://bettercodehub.com/results/PauloGoncalvesBH/serverest)

Utilizamos o [Better Code Hub](https://bettercodehub.com/) na análise da qualidade do repositório.

Caso o seu Pull Request reduza a pontuação do repositório, o mesmo será automaticamente reprovado.

## Documentação (api-doc)

A documentação, disponibilizada através da rota `api-doc`, é editada no [apiary](https://apiary.io/home) e gerada a partir do [aglio](https://www.npmjs.com/package/aglio).

Para atualizar:
1. Acesse o [editor do ServeRest no Apiary](https://app.apiary.io/serverest/editor) e faça as alterações necessárias.
    - É preciso ter permissão de edição.
2. Realize o download do arquivo `serverest.apib` e salve esse arquivo na raiz do _ServeRest_.
3. Execute o comando `npm run generate-doc`

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
