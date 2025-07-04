FROM node:14

WORKDIR /usr/api/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "node", "api/index.js" ]
