FROM node:20-alpine

RUN npm install -g pnpm@8.15.7

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app
COPY pnpm-lock.yaml /usr/src/app

RUN pnpm i --frozen-lockfile

COPY . /usr/src/app

RUN npm run bands

RUN npm run build

ENV NODE_OPTIONS=--max-old-space-size=2048

ARG NODE_ENV="development"
ENV NODE_ENV ${NODE_ENV}

EXPOSE 3000

CMD ["npm", "run", "production"]
