FROM node:7

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN yarn global add node-gyp

COPY package.json /usr/src/app
COPY yarn.lock /usr/src/app

RUN yarn install

COPY . /usr/src/app

RUN npm run build

CMD ["npm", "run", "start"]

