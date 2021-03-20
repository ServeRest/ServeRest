FROM node:lts-alpine3.12

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

ENV USERNAME='docker'

ENV TERM xterm-256color

EXPOSE 3000

ENTRYPOINT [ "npm", "start", "--" ]
