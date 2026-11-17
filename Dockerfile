# Production dockerfile - Delivered at Docker Hub
FROM node:22-alpine3.20@sha256:2289fb1fba0f4633b08ec47b94a89c7e20b829fc5679f9b7b298eaa2f1ed8b7e

LABEL repository="https://github.com/ServeRest/ServeRest" \
      homepage="https://github.com/ServeRest/ServeRest" \
      maintainer="Paulo Gonçalves <https://www.linkedin.com/in/paulo-goncalves/>"

# Usuário sem root, sem shell e sem home, com UID fixo para quem montar volume poder alinhar o dono no host.
RUN addgroup -S -g 10001 serverest && adduser -S -D -H -u 10001 -G serverest -s /sbin/nologin serverest

WORKDIR /app

COPY package*.json ./

RUN npm ci --production --ignore-scripts

COPY . .

# O código fica do root, só leitura para o processo; só a base do NeDB precisa de escrita.
RUN chown -R serverest:serverest /app/src/data
USER 10001:10001

ENV ENVIRONMENT='docker'

ENV TERM=xterm-256color

EXPOSE 3000

ENTRYPOINT [ "npm", "start", "--" ]
