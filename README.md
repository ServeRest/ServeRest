
<h1 align="center">ServeRest</h1>

<i><h4 align="center">Servidor REST local de forma rápida e simples para estudo de testes de API</h5></i>

Para iniciar o _ServeRest_ execute o seguinte comando no terminal:

```sh
npx serverest
```

Não é preciso fazer instalação com `npm install` antes da execução.

---

[![npm version](https://badge.fury.io/js/serverest.svg)](https://npmjs.com/package/serverest)
[![npm total downloads](https://img.shields.io/npm/dt/serverest.svg)](https://npm-stat.com/charts.html?package=serverest)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Continuous Delivery](https://github.com/PauloGoncalvesBH/ServeRest/workflows/Continuous%20Delivery/badge.svg)](https://github.com/PauloGoncalvesBH/ServeRest/actions)

**[Histórico de alterações](/CHANGELOG.md) | [Como contribuir](/CONTRIBUTING.md) | [Código de conduta](/CODE_OF_CONDUCT.md)**

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

A documentação é aberta automaticamente ao iniciar o _ServeRest_. Para evitar o início automático envie o comando `npx serverest --nodoc`.

<details><summary><i>Abra para ver imagem resumida das rotas disponíveis</i></summary>

<img alt="Lista de rotas disponibilizdas pelo ServeRest" src="https://user-images.githubusercontent.com/29241659/83936398-ba8f2680-a799-11ea-8689-dea126b74874.png" height="700">

---

</details>

## Configuração

Para visualizar as configurações que são possíveis de serem feitas execute o comando:

```sh
npx serverest -h
```

<details><summary><i>Abra para ver imagem do terminal com os comandos de configuração</i></summary>

![Informação de opções e exemplos fornecidos no terminal](https://user-images.githubusercontent.com/29241659/84222328-b15dcc80-aaad-11ea-8165-d3ce52672ee7.png)

</details>

#### Segurança (`--nosec`)

É boa prática que as APIs, na resposta, enviem determinados cabeçalhos e suprimam outros visando a segurança da aplicação.

Por default, o _ServeRest_ irá fazer as seguintes alterações de segurança, que podem ser desabilitadas com `npx serverest --nosec`:

**Cabeçalhos adicionados:**
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-DNS-Prefetch-Control: off`
- `X-Download-Options: noopen`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`

**Cabeçalho removido:**
- `X-Powered-By: Express`

Utilize esse comportamento para realizar testes de segurança, validando a presença/ausência desses cabeçalhos.

> Para saber mais leia o [checklist de segurança de API](https://github.com/shieldfy/API-Security-Checklist#api-security-checklist)

## Licença

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FPauloGoncalvesBH%2Fserverest.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2FPauloGoncalvesBH%2Fserverest?ref=badge_large)
