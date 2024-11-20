FROM node:20-alpine

RUN npm install -g pnpm@8.15.7

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN yarn global add node-gyp

COPY package.json /usr/src/app
COPY yarn.lock /usr/src/app

RUN pnpm i --frozen-lockfile

COPY . /usr/src/app

RUN npm run bands

RUN npm run build

ARG NODE_ENV="development"
ENV NODE_ENV ${NODE_ENV}

EXPOSE 3000

CMD ["npm", "run", "production"]
