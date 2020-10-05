
<h1 align="center">ServeRest</h1>

<i><h4 align="center">Servidor REST local de forma rápida e simples para estudo de testes de API</h5></i>

<p align="center">
  <a href="https://npmjs.com/package/serverest"><img alt="serverest version" src="https://img.shields.io/npm/v/serverest?style=for-the-badge"></a>
  <a href="https://hub.docker.com/r/paulogoncalvesbh/serverest"><img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/paulogoncalvesbh/serverest?style=for-the-badge"></a>
  <a href="https://codecov.io/gh/PauloGoncalvesBH/ServeRest"><img alt="Codecov branch" src="https://img.shields.io/codecov/c/github/PauloGoncalvesBH/ServeRest/trunk?style=for-the-badge"></a>
  <a href="https://npm-stat.com/charts.html?package=serverest"><img alt="serverest total downloads" src="https://img.shields.io/npm/dt/serverest?style=for-the-badge"></a>
</p>

<p align="center">
 <b>
   <a href="https://serverest.js.org">Documentação das rotas</a> |
   <a href="https://github.com/PauloGoncalvesBH/ServeRest/blob/trunk/.github/CODE_OF_CONDUCT.md">Código de conduta</a> |
   <a href="https://github.com/PauloGoncalvesBH/ServeRest/blob/trunk/.github/CONTRIBUTING.md">Como contribuir</a> |
   <a href="https://github.com/PauloGoncalvesBH/ServeRest/blob/trunk/CHANGELOG.md">Histórico de alterações</a>
 </b>
</p>

<p align="center">
 <img alt="Print do ServeRest iniciado no terminal" src="https://user-images.githubusercontent.com/29241659/95020650-bb01d600-0642-11eb-80dc-21bd69d80a15.png" height="200">
</p>

## Inicialização do projeto

### Com Node

Para iniciar o _ServeRest_ execute o seguinte comando no terminal:

```sh
npx serverest
```

Não é preciso fazer instalação com `npm install` antes da execução.

### Com Docker

Você também pode executar o _ServeRest_ com o docker, utilizando o seguinte comando no terminal:

```sh
docker run -p 3000:3000 paulogoncalvesbh/serverest:latest
```

Com esse comando você sempre utilizará a última versão disponível. Caso queira utilizar alguma versão específica basta substituir o `latest` pela versão desejada.
Você pode encontrar as versões disponíveis na [lista de tags no docker](https://hub.docker.com/r/paulogoncalvesbh/serverest/tags).

---

_ServeRest_ permite o estudo de:
- Verbos *GET, POST, PUT* e *DELETE*
- Autenticação no header
- Boas práticas de segurança
- Query string
- Contrato
- Requisições aninhadas

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

## Exemplo de automação

Os repositórios abaixo são bons exemplos de automação com boas práticas, com CI configurada e que consome o ServeRest.

- [Java > Automação com REST-Assured e Junit - Lucas Fraga](https://github.com/uLucasFraga/restassured_for_studies)
- [JS > Automação com Supertest, Mocha e Chai - Paulo Gonçalves](https://github.com/PauloGoncalvesBH/sample-supertest)

## Demonstre seu apoio ao ServeRest

Adicione ao README.md do seu repositório o badge do Serverest e demonstre seu apoio ao projeto.

[![Badge ServeRest](https://img.shields.io/badge/API-ServeRest-green?style=for-the-badge)](https://github.com/PauloGoncalvesBH/ServeRest/)

```markdown
[![Badge ServeRest](https://img.shields.io/badge/API-ServeRest-green?style=for-the-badge)](https://github.com/PauloGoncalvesBH/ServeRest/)
```

## Empresas que utilizam o ServeRest

<table>
  <tr>
    <td align="center"><a href="https://www.globo.com/"><img alt="Logo da empresa Globo.com" src="https://user-images.githubusercontent.com/29241659/93280011-0725cd00-f79f-11ea-8eab-b20be4430cc9.png" height="60"></a></td>
    <td align="center"><a href="https://www.totvs.com/"><img alt="Logo da TOTVS" src="https://user-images.githubusercontent.com/29241659/93278632-9fba4e00-f79b-11ea-88a0-076745447848.png" height="100"></a></td>
    <td align="center"><a href="https://www.noesis.pt/"><img alt="Logo da Noesis" src="https://user-images.githubusercontent.com/29241659/93278486-30dcf500-f79b-11ea-82da-16fb562df247.png" height="60"></a></td>
  </tr>
</table>

Sua empresa (ou projeto) utiliza e quer constar na lista? [Abra uma issue](https://github.com/PauloGoncalvesBH/ServeRest/issues/new?assignees=&labels=enhancement%2C+new+issue&template=solicita--o-de-feature.md&title=) informando o nome dela.

## Contributors ✨

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
![All Contributors](https://img.shields.io/badge/all_contributors-9-orange.svg?style=for-the-badge)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Obrigado a essas pessoas incríveis ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/leandromuto"><img src="https://avatars0.githubusercontent.com/u/1757827?v=4" width="100px;" alt=""/><br /><sub><b>Leandro Muto</b></sub></a><br /><a href="https://github.com/PauloGoncalvesBH/ServeRest/commits?author=leandromuto" title="Documentation">📖</a> <a href="#infra-leandromuto" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/fejsrodrigues"><img src="https://avatars3.githubusercontent.com/u/8000936?v=4" width="100px;" alt=""/><br /><sub><b>Felipe Rodrigues</b></sub></a><br /><a href="#infra-fejsrodrigues" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/doamaral"><img src="https://avatars0.githubusercontent.com/u/7451330?v=4" width="100px;" alt=""/><br /><sub><b>Lucas Amaral</b></sub></a><br /><a href="#talk-doamaral" title="Talks">📢</a> <a href="https://github.com/PauloGoncalvesBH/ServeRest/issues?q=author%3Adoamaral" title="Bug reports">🐛</a> <a href="https://github.com/PauloGoncalvesBH/ServeRest/commits?author=doamaral" title="Documentation">📖</a></td>
    <td align="center"><a href="https://www.linkedin.com/in/ulucasfraga/"><img src="https://avatars2.githubusercontent.com/u/23031781?v=4" width="100px;" alt=""/><br /><sub><b>lucas.fraga</b></sub></a><br /><a href="#ideas-uLucasFraga" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/PauloGoncalvesBH/ServeRest/issues?q=author%3AuLucasFraga" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://www.linkedin.com/in/bruno-batista-87734464/?locale=en_US"><img src="https://avatars3.githubusercontent.com/u/8673550?v=4" width="100px;" alt=""/><br /><sub><b>bruno batista</b></sub></a><br /><a href="#ideas-brunobatista25" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/eliasreis54"><img src="https://avatars1.githubusercontent.com/u/29265526?v=4" width="100px;" alt=""/><br /><sub><b>Elias Reis</b></sub></a><br /><a href="#maintenance-eliasreis54" title="Maintenance">🚧</a> <a href="#infra-eliasreis54" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/gabriel-pinheiro"><img src="https://avatars2.githubusercontent.com/u/56726395?v=4" width="100px;" alt=""/><br /><sub><b>gabriel-pinheiro</b></sub></a><br /><a href="https://github.com/PauloGoncalvesBH/ServeRest/commits?author=gabriel-pinheiro" title="Code">💻</a> <a href="#ideas-gabriel-pinheiro" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
  <tr>
    <td align="center"><a href="http://gomex.me"><img src="https://avatars3.githubusercontent.com/u/95132?v=4" width="100px;" alt=""/><br /><sub><b>Rafael Gomes</b></sub></a><br /><a href="#infra-gomex" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://about.me/rustnnes"><img src="https://avatars1.githubusercontent.com/u/638445?v=4" width="100px;" alt=""/><br /><sub><b>Diego Bandeira</b></sub></a><br /><a href="#infra-rustnnes" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

Este projeto segue a especificação de [all-contributors](https://github.com/all-contributors/all-contributors). Contribuições de qualquer tipo são bem-vindas!
