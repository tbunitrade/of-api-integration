### 🧠 OF Software – Backend Automation Platform

### 📦 Установка зависимостей

## engines
node 18.20 & 20.19
npm install
package-json.lock #< - for front end
backend/of-software #< - for back end



### 🚀 Запуск приложения

### ⛳ Development

npm run start:dev  #<-  for front-end, node -v 20.19
&
make #<- for docker backend // also restart mode in db ok
make restore-db #<- for first make need to do init process for sql archive


### 🧪 Продакшен (локальный стенд)

npm run start:server #<-- Will start pm2 backend to suppoer fe Vue components

Внутри команды запускается:

билд NestJS

запуск виртуального X-сервера через Xvfb

запуск Fluxbox + x11vnc

и сам backend (NestJS) в режиме start:prod

### ⚠️ Убедитесь, что БД Postgres запущена до старта backend!

### 🐳 Docker

### ✅ Локальный запуск с Docker

make

### Это поднимет:

db (PostgreSQL)

pgadmin

backend (NestJS + Puppeteer)

Используемый файл: docker-compose.yml

### ⚙️ Основные Docker команды

docker-compose logs -f backend      # смотреть логи бекенда

docker exec -it nest_backend sh # start bash in nest_backend

docker-compose exec backend bash    # войти в контейнер бекенда

💾 Cookie-файлы сохраняются в /app/cookies (смонтировано в volume cookies-data)

### migrations

npm run migrate-generate  # <-- backend
npm run migrate-run

### 📂 Структура проекта

##
------
backend/
├── Dockerfile
├── Makefile
├── .env
├── Dockerfile
├── docker-compose.yml
├── entrypoint.shecosystem.config.js
├── ecosystem.config.jstest-puppeteer.ts
├── cookies/              # <-- cookie-файлы puppeteer
│   └── .gitkeep
├── dist/                 # собранный JS код
├── src/
│   ├── automate/
│   │   └── utils/_functions/cookies-utils.ts
│   └── ...
└── ...
├── test-puppeteer.ts # <-- fast test chronium web browser clean
├── test # <-- 2 test case.
│   └── post-file.e2e-spec.ts
│   └── app.e2e-spec.ts
------
##
📌 Примечания

Cookie-файлы .json не пушатся в Git (см. .gitignore)

entrypoint.sh автоматически создаёт /app/cookies, если нет

Билд копирует папку extensions и создаёт .cron-data

Файл .env должен быть сконфигурирован вручную

### 🧪 Тесты

yarn run test           # unit
yarn run test:e2e       # e2e
yarn run test:cov       # coverage

## 🛠 Feature list

## support: @devaleksonich

# Stack: NestJS, Puppeteer, TypeORM, Docker, VNC, Xvfb

