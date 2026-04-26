FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
