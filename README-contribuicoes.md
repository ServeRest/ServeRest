# Contribuições deste Fork

Este documento detalha as automações realizadas no projeto ServeRest, neste fork. 
Ele complementa o README original, preservando sua integridade.

---

## Automação com Cypress

Foram desenvolvidos testes automatizados utilizando Cypress para validar os seguintes cenários:

1. **Login valido**: Valida o fluxo correto de login com credenciais válidas.  
2. **Exibe erro para email não registrado**: Verifica se é exibida a mensagem de erro ao tentar logar com um email inexistente.  
3. **Exibe erro para senha inválida**: Certifica-se de que uma mensagem de erro aparece ao informar uma senha incorreta.  
4. **Exibe erro para campos em branco**: Garante que os campos obrigatórios não preenchidos acionem mensagens de erro.  
5. **Exibe erro para senha em branco**: Testa especificamente o erro exibido quando a senha não é informada.  
6. **Cadastrar Usuario**: Confirma que o link de redirecionamento funciona corretamente para levar o usuário à página de cadastro.  

### Comprovações
- **Logs de Execução**: Os resultados detalhados estão disponíveis na pasta `logs`:  
  [logs/logs.txt](logs/logs.txt)  

- **Vídeos**: As gravações dos testes automatizados estão disponíveis na pasta `cypress/videos`.  

### Métricas alcançadas
- **Tempo de execução**: 17 segundos para a execução dos 6 cenários de teste automatizados.  
- **Resultados**: 100% dos testes aprovados em menos de 20 segundos.
- **Testes Manuais**: 2 minutos e 15 segundos para a execução dos 6 cenários de teste.
- **Redução de tempo**: 87,5% de redução no tempo de execução entre testes manuais e automatizados.

---

## Configuração com Docker

O ambiente ServeRest foi inicializado em um contêiner Docker para garantir isolamento e portabilidade. Utilizou-se a imagem oficial do ServeRest.

### Comprovações
- **Execução Local**:  
  ```bash
  docker run -p 3000:3000 paulogoncalvesbh/serverest:latest

- **Log de Execução**: O log de execução do contêiner está disponível em `docker-compos

  - **Logs de Execução**: Os resultados detalhados estão disponíveis na pasta `logs`:  
  [logs/docker-logs.txt](logs/docker-logs.txt)
