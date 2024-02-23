# Production dockerfile - Delivered at Docker Hub
FROM node:lts-alpine3.18@sha256:a02826c7340c37a29179152723190bcc3044f933c925f3c2d78abb20f794de3f as base

LABEL repository="https://github.com/ServeRest/ServeRest" \
      homepage="https://github.com/ServeRest/ServeRest" \
      maintainer="Paulo Gonçalves <https://www.linkedin.com/in/paulo-goncalves/>"

WORKDIR /app

COPY package*.json ./

RUN npm ci --production --ignore-scripts

COPY . .

ENV ENVIRONMENT='docker'

ENV TERM=xterm-256color

EXPOSE 3000

ENTRYPOINT [ "npm", "start", "--" ]
