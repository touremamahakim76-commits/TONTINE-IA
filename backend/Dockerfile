FROM node:20-alpine

WORKDIR /app

# Dépendances natives pour better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data

EXPOSE 4000
CMD ["node", "src/server.js"]
