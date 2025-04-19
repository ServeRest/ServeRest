# Estágio de build
FROM node:23-alpine AS builder

WORKDIR /app

# Copia apenas os arquivos necessários para instalação das dependências
COPY package*.json ./

# Cria um package.json temporário sem os devDependencies problemáticos
RUN npm install --package-lock-only && \
    # Instalação explícita do request e outras dependências necessárias
    npm install --production --legacy-peer-deps && \
    npm install --no-save request

# Estágio final
FROM node:23-alpine

LABEL repository="https://github.com/ServeRest/ServeRest" \
      homepage="https://github.com/ServeRest/ServeRest" \
      maintainer="Paulo Gonçalves <https://www.linkedin.com/in/paulo-goncalves/>"

WORKDIR /app

# Copia node_modules do estágio de build
COPY --from=builder /app/node_modules ./node_modules

# Copia o resto dos arquivos do projeto
COPY . .

# Configura variáveis de ambiente
ENV ENVIRONMENT='docker' \
    TERM=xterm-256color \
    CI=true

# Expõe a porta
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "./src/server.js"]