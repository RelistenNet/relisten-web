FROM node:10.15.3

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN yarn global add node-gyp

COPY package.json /usr/src/app
COPY yarn.lock /usr/src/app

RUN yarn install

COPY . /usr/src/app

RUN npm run bands

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "production"]
