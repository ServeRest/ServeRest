# Production dockerfile - Delivered at Docker Hub
FROM node:lts-alpine3.17@sha256:e0641d0ac1f49f045c8dc05bbedc066fc7c88bc2730ead423088eeb0788623a1 as base

LABEL repository="https://github.com/ServeRest/ServeRest" \
      homepage="https://github.com/ServeRest/ServeRest" \
      maintainer="Paulo Gonçalves <https://www.linkedin.com/in/paulo-goncalves/>"

WORKDIR /app

COPY package*.json ./

RUN npm uninstall dd-trace && \
      npm prune && \
      npm ci --production --ignore-scripts

COPY . .

ENV ENVIRONMENT='docker'

ENV TERM=xterm-256color

EXPOSE 3000

ENTRYPOINT [ "npm", "start", "--" ]
