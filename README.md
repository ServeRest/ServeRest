
<h1 align="center">ServeRest</h1>

<i><h4 align="center">Servidor REST local de forma rápida e simples para estudo de testes de API</h5></i>

<p align="center">
<a href="https://npmjs.com/package/serverest"><img alt="serverest version" src="https://img.shields.io/npm/v/serverest?style=for-the-badge"></a>
<img alt="support - node version" src="https://img.shields.io/node/v/serverest?style=for-the-badge">
<a href="https://codecov.io/gh/PauloGoncalvesBH/ServeRest"><img alt="Codecov branch" src="https://img.shields.io/codecov/c/github/PauloGoncalvesBH/ServeRest/master?style=for-the-badge"></a>
<a href="https://npm-stat.com/charts.html?package=serverest"><img alt="serverest total downloads" src="https://img.shields.io/npm/dt/serverest?style=for-the-badge"></a>
</p>

Para iniciar o _ServeRest_ execute o seguinte comando no terminal:

```sh
npx serverest
```

Não é preciso fazer instalação com `npm install` antes da execução.

---

**[Documentação das rotas](https://serverest.js.org) | [Histórico de alterações](/CHANGELOG.md) | [Como contribuir](/.github/CONTRIBUTING.md) | [Código de conduta](/.github/CODE_OF_CONDUCT.md)**

_ServeRest_ permite o estudo de:
- Verbos *GET, POST, PUT* e *DELETE*
- Autenticação no header
- Boas práticas de segurança
- Query string
- Contrato
- Requisições aninhadas

<details><summary><i>Abra para ver imagem do <i>ServeRest</i> iniciado e com algumas requests realizadas</i></summary>

<img alt="Print do ServeRest iniciado no terminal" src="https://user-images.githubusercontent.com/29241659/83936435-ff1ac200-a799-11ea-9b54-91fbd6b43cdc.png" height="250">

</details>

## Documentação

Acesse **[serverest.js.org](https://serverest.js.org)** para ter acesso a documentação de todas as rotas, verbos, contratos e respostas possíveis.

<details><summary><i>Abra para ver imagem resumida das rotas disponíveis</i></summary>

<img alt="Lista de rotas disponibilizdas pelo ServeRest" src="https://user-images.githubusercontent.com/29241659/83936398-ba8f2680-a799-11ea-8689-dea126b74874.png" height="700">

---

</details>

A documentação é aberta automaticamente ao iniciar o _ServeRest_. Para evitar o início automático envie o comando `npx serverest --nodoc`.

## Configuração

Para visualizar as configurações que são possíveis de serem feitas execute o comando:

```sh
npx serverest -h
```

![Informação de opções e exemplos fornecidos no terminal](https://user-images.githubusercontent.com/29241659/84348644-d45eae00-ab8b-11ea-89a4-d8cda3b32b74.png)

#### Segurança (`--nosec`)

Por default, o _ServeRest_ irá fazer as seguintes alterações no cabeçalho, que podem ser desabilitadas com `npx serverest --nosec`:

**Cabeçalhos adicionados:**
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-DNS-Prefetch-Control: off`
- `X-Download-Options: noopen`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`

**Cabeçalho removido:**
- `X-Powered-By: Express`

Utilize esse comportamento nos seus testes, validando a presença/ausência desses cabeçalhos.

> Para saber mais leia o [checklist de segurança de API](https://github.com/shieldfy/API-Security-Checklist#api-security-checklist)

## Contributors ✨

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=for-the-badge)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Obrigado a essas pessoas incríveis ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/leandromuto"><img src="https://avatars0.githubusercontent.com/u/1757827?v=4" width="100px;" alt=""/><br /><sub><b>Leandro Muto</b></sub></a><br /><a href="https://github.com/PauloGoncalvesBH/ServeRest/commits?author=leandromuto" title="Documentation">📖</a> <a href="#infra-leandromuto" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/fejsrodrigues"><img src="https://avatars3.githubusercontent.com/u/8000936?v=4" width="100px;" alt=""/><br /><sub><b>Felipe Rodrigues</b></sub></a><br /><a href="#infra-fejsrodrigues" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

Este projeto segue a especificação de [all-contributors](https://github.com/all-contributors/all-contributors). Contribuições de qualquer tipo são bem-vindas!

## Licença

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FPauloGoncalvesBH%2Fserverest.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2FPauloGoncalvesBH%2Fserverest?ref=badge_large)
