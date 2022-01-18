FROM node:12-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN yarn global add node-gyp

COPY package.json /usr/src/app
COPY yarn.lock /usr/src/app

RUN yarn install --immutable --immutable-cache --check-cache

COPY . /usr/src/app

RUN npm run bands

RUN npm run build && yarn cache clean

EXPOSE 3000

CMD ["npm", "run", "production"]
