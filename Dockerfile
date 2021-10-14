FROM node:lts-alpine3.12 as base

WORKDIR /app

COPY package*.json ./

FROM base as test

ENV NODE_ENV=serverest-test

RUN apk --no-cache add git=2.26.3-r0 ca-certificates=20191127-r4 wget=1.20.3-r1 bash=5.0.17-r0 \
  && wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub \
  && wget -q https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.29-r0/glibc-2.29-r0.apk \
  && apk --no-cache add glibc-2.29-r0.apk \
  && rm -rf /var/cache/apk/*

# hadolint ignore=DL3059
RUN npm ci

COPY . .

FROM base as dev

ENV NODE_ENV=serverest-development
ENV USERNAME='docker'
ENV TERM=xterm-256color

RUN npm ci

COPY . .

EXPOSE 3000

CMD [ "npm", "run", "dev" ]

FROM base as prod

RUN npm ci --production

COPY . .

ENV USERNAME='docker'

ENV TERM=xterm-256color

EXPOSE 3000

ENTRYPOINT [ "npm", "start", "--" ]
