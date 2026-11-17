# Production dockerfile - Delivered at Docker Hub
FROM node:22-alpine3.20@sha256:2289fb1fba0f4633b08ec47b94a89c7e20b829fc5679f9b7b298eaa2f1ed8b7e

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
