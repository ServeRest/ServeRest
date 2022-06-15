FROM node:lts-alpine3.12@sha256:60ef0bed1dc2ec835cfe3c4226d074fdfaba571fd619c280474cc04e93f0ec5b as base

# Production dockerfile

LABEL repository="https://github.com/ServeRest/ServeRest" \
      homepage="https://github.com/ServeRest/ServeRest" \
      maintainer="Paulo Gonçalves <https://www.linkedin.com/in/paulo-goncalves/>"

WORKDIR /app

COPY package*.json ./

RUN npm ci --production --ignore-scripts

COPY . .

ENV USERNAME='docker'

ENV TERM=xterm-256color

EXPOSE 3000

ENTRYPOINT [ "npm", "start", "--" ]
