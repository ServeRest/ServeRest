
# Como contribuir

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![BCH compliance](https://bettercodehub.com/edge/badge/PauloGoncalvesBH/serverest?branch=master)](https://bettercodehub.com/results/PauloGoncalvesBH/serverest)

---

Você pode contribuir de várias maneiras, sendo as mais conhecidas as seguintes:

- Localizando e relatando bugs
- Tirando dúvidas dos outros usuários
- Corrigindo bugs ou implementando novos recursos
- Melhorando a documentação
- Traduzindo a documentação
- Melhorando a estrutura do código

## Etapas para contribuir

1. [Fork](https://help.github.com/articles/fork-a-repo/) este repositório para sua própria conta GitHub e, em seguida, [clone](https://help.github.com/articles/cloning-a-repository/) no seu computador;
2. Instale as dependências de desenvolvimento: `npm install`;
3. Faça as alterações necessárias;
4. Envie um [pull request](https://help.github.com/articles/about-pull-requests/);
5. Aguarde feedback ou aprovação.

## Estilo

**Prefira o uso do terminal em detrimento da interface gráfica** do Git ou VS Code. Pois dessa forma as validações de _Lint_ e _Commit_ serão realizadas no seu ambiente local, impedindo a quebra desses quesitos na pipeline do repositório.

### Lint

Usamos a configuração básica do ESLint como nosso guia de estilo de codificação, junto com o [Standard-version](https://www.npmjs.com/package/standard-version).

Execute `npm run lint` para padronizar os arquivos.

Execute `npm run lint:fix` para corrigir automaticamente os problemas encontrados pelo lint.

> Commit é abortado caso esse padrão não seja seguido

### Commit

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

As mensagens de commit devem seguir o padrão do [versionamento semântico](https://semver.org/).

Caso não conheça o padrão, use `git commit` ou `npm run commit` para ter um painel interativo que permite seguir o padrão de commit.

Usamos o [commitizen](https://github.com/commitizen/cz-cli) para tornar o repositório commitizen friendly.

> Commit é abortado caso esse padrão não seja seguido

### Better Code Hub

[![BCH compliance](https://bettercodehub.com/edge/badge/PauloGoncalvesBH/serverest?branch=master)](https://bettercodehub.com/results/PauloGoncalvesBH/serverest)

Utilizamos o [Better Code Hub](https://bettercodehub.com/) na análise da qualidade do repositório.

Caso o seu Pull Request reduza a pontuação do repositório, o mesmo será automaticamente reprovado.