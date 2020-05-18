
<h1 align="center">ServeRest@2.0.0</h1>

**Servidor REST local de forma rápida e simples para estudo de testes de API**

[![npm version](https://badge.fury.io/js/serverest.svg)](https://npmjs.com/package/serverest)
[![BCH compliance](https://bettercodehub.com/edge/badge/PauloGoncalvesBH/serverest?branch=master)](https://bettercodehub.com/results/PauloGoncalvesBH/serverest)
[![Continuous Integration](https://github.com/PauloGoncalvesBH/serverest/workflows/Continuous%20Integration/badge.svg)](https://github.com/PauloGoncalvesBH/serverest/actions)
[![npm total downloads](https://img.shields.io/npm/dt/serverest.svg)](https://npmjs.com/package/serverest)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FPauloGoncalvesBH%2Fserverest.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2FPauloGoncalvesBH%2Fserverest?ref=badge_shield)

---

## Executando o ServeRest

```sh
npx serverest
```

Dispõe de um servidor REST com dados de e-commerce fictício, permitindo o estudo do uso de:
- Verbos *GET, POST, PUT* e *DELETE*
- Autenticação no header
- Query string
- Contrato
- Manipulação de resposta
- Requisições aninhadas

## Links

- **[Histórico de alterações](/CHANGELOG.md)**
- [Código de conduta](/CODE_OF_CONDUCT.md)
- [Como contribuir](/CONTRIBUTING.md)

## Rotas disponíveis

Ao iniciar o _ServeRest_ automaticamente a rota `/api-doc` é executada, abrindo a documentação, que lista todas as rotas, verbos, contratos e repostas possíveis.

<details><summary>Abra para ver imagem das rotas disponíveis</summary>

<img alt="Lista de rotas disponibilizdas pelo ServeRest" src="./img/rotas.png" height="700">

---

</details>

> Para evitar que a documentação seja aberta automaticamente envie o comando `npx serverest --nodoc`

## Configuração

Para visualizar as configurações que são possíveis de serem feitas execute o comando

```sh
npx serverest -h
```

<details><summary>Abra para ver imagem do terminal com os comandos de configuração</summary>

![Informação de opções e exemplos fornecidos no terminal](./img/terminalHelp.png)

---

</details>

## Preciso de ajuda

Está com algum problema e precisa de ajuda? Abra uma [issue](https://github.com/PauloGoncalvesBH/serverest/issues) detalhando a sua situação.

## Licença

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FPauloGoncalvesBH%2Fserverest.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2FPauloGoncalvesBH%2Fserverest?ref=badge_large)
