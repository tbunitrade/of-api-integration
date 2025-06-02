#FROM --platform=linux/arm64 node:20.19
FROM --platform=linux/arm64 node:18.20.7

WORKDIR /app

COPY package.json ./
RUN npm install --only=production --no-package-lock

COPY . .
COPY .env .env

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
