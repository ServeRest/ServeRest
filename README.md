
<h1 align="center">ServeRest</h1>

<i><h4 align="center">Servidor REST para estudo de testes de API</h4></i>

<p align="center">
  <a href="https://npmjs.com/package/serverest"><img alt="serverest version" src="https://img.shields.io/npm/v/serverest?style=for-the-badge"></a>
  <a href="https://hub.docker.com/r/paulogoncalvesbh/serverest"><img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/paulogoncalvesbh/serverest?style=for-the-badge"></a>
  <a href="https://dashboard.stryker-mutator.io/reports/github.com/PauloGoncalvesBH/ServeRest/trunk"><img alt="Mutation test score" src="https://img.shields.io/endpoint?style=for-the-badge&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2FPauloGoncalvesBH%2FServeRest%2Ftrunk"></a>
  <a href="https://npm-stat.com/charts.html?package=serverest"><img alt="serverest total downloads" src="https://img.shields.io/npm/dt/serverest?color=blue&style=for-the-badge"></a>
</p>

<p align="center">
 <b>
   <a href="https://github.com/PauloGoncalvesBH/ServeRest/blob/trunk/.github/CODE_OF_CONDUCT.md">Código de conduta</a> |
   <a href="https://github.com/PauloGoncalvesBH/ServeRest/blob/trunk/.github/CONTRIBUTING.md">Como contribuir</a> |
   <a href="https://github.com/PauloGoncalvesBH/ServeRest/blob/trunk/CHANGELOG.md">Histórico de alterações</a> |
   <a href="https://github.com/PauloGoncalvesBH/ServeRest#patrocinadores">Patrocinadores</a>
 </b>
</p>

_ServeRest_ permite o estudo de:
- Verbos *GET, POST, PUT* e *DELETE* com persistência de dados
- Autenticação no header
- Query string
- Teste de schema json

<b><h2 align="center">Ambientes disponíveis</h2></b>

<table align="center">
  <tr>
    <td align="center">Online em serverest.dev<br/><a href="#online"><img alt="Texto serverest.dev" src="https://user-images.githubusercontent.com/29241659/97096352-49b1b380-1641-11eb-9b0a-5bb72e1b3882.png" height="80"></a></td>
    <td align="center">Local com NPM<br/><br/><a href="#localmente-com-npm"><img alt="Logo do NPM" src="https://user-images.githubusercontent.com/29241659/97096283-4bc74280-1640-11eb-920a-1c145b0c39d4.png" height="60"></a></td>
    <td align="center">Local com docker<br/><a href="#localmente-com-docker"><img alt="Logo do Docker" src="https://user-images.githubusercontent.com/29241659/97096274-1cb0d100-1640-11eb-9e5e-3f2d57376e63.png" height="100"></a></td>
  </tr>
</table>

<p align="center">
 <img alt="Print do ServeRest iniciado no terminal" src="https://user-images.githubusercontent.com/29241659/97097145-fa24b500-164b-11eb-9a1f-f9cae275ec98.png" height="124">
</p>

## Consumindo o ServeRest

O ServeRest está disponível de forma [online](https://serverest.dev), no [npm](https://www.npmjs.com/package/serverest) e no [docker](https://hub.docker.com/r/paulogoncalvesbh/serverest/).

Todas essas opções possuem as mesmas rotas, regras, dados pré-cadastrados e documentação. Escolha a melhor opção para você.

No ambiente online os dados cadastrados são removidos diariamente, enquanto que no local basta reiniciar o ServeRest.

Prefira a opção de ambiente local caso precise que os dados não sejam alterados por outro usuário.

### Online

Acesse **<https://serverest.dev>** para visualizar a documentação e as rotas disponíveis.

> Essa é a melhor opção para quem não possui NPM e Docker na máquina ou não quer preocupar em gerenciar ambiente.

### Localmente com NPM

Execute o seguinte comando no terminal:

```sh
npx serverest@latest
```

<details><summary><i>Abra para ver detalhes de configuração do ServeRest com NPM</i></summary>

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

---

</details>

### Localmente com docker

Execute o seguinte comando no terminal:

```sh
docker run -p 3000:3000 paulogoncalvesbh/serverest:latest
```

### Executando versão específica

Em ambos os comandos de subida de ambiente local será utilizado a última versão disponível. Caso queira usar uma versão específica basta substituir o `latest` pela versão desejada.

Você pode encontrar as versões disponíveis na [lista de tags no Docker Hub](https://hub.docker.com/r/paulogoncalvesbh/serverest/tags) e na [lista de versões do NPM](https://www.npmjs.com/package/serverest).

## Exemplos de automação

Os repositórios abaixo são exemplos de automação com boas práticas e que consome o ServeRest.

- [Java > Automação com REST-Assured e Junit - Lucas Fraga](https://github.com/uLucasFraga/restassured_for_studies)
- [JS > Automação com Supertest, Mocha e Chai - Paulo Gonçalves](https://github.com/PauloGoncalvesBH/sample-supertest)
- [Python > Automação com Pytest - Leonardo Tsuda](https://github.com/ltsuda/pytest-serverest-study)

## Badge [![Badge ServeRest](https://img.shields.io/badge/API-ServeRest-green)](https://github.com/PauloGoncalvesBH/ServeRest/)

```markdown
[![Badge ServeRest](https://img.shields.io/badge/API-ServeRest-green)](https://github.com/PauloGoncalvesBH/ServeRest/)
```

## Patrocinadores

### Empresas ($15+/mês)

Sua empresa usa o ServeRest? Pergunte ao seu gerente ou equipe de marketing se sua empresa estaria interessada em apoiar este projeto e ter os seguintes serviços:
1. Subdomínio próprio (_nome-escolhido.serverest.dev_)
1. Acesso a todas as requests e respostas feitas nos últimos 7 dias no subdomínio

[![Apoiador individual - Open Collective](https://opencollective.com/serverest/tiers/patrocinador.svg)](https://opencollective.com/serverest)

### Individuais

Achou o projeto útil? Faça doação única ou mensal a partir de 1 dólar e ajude a pagar o domínio, a hospedagem e a manutenção de <https://serverest.dev>.

[![Apoiador individual - Open Collective](https://opencollective.com/serverest/tiers/apoiador.svg)](https://opencollective.com/serverest)

Todos os patrocinadores anteriores e atuais podem ser vistos no [Open Collective do ServeRest](https://opencollective.com/serverest#section-contributors).

## Contribuidores ✨

Veja aqui [como você pode contribuir](https://github.com/PauloGoncalvesBH/ServeRest/blob/trunk/.github/CONTRIBUTING.md). Contribuições de qualquer tipo são bem-vindas!

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
