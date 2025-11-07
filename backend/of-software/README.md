### 🧠 OF Software – Backend Automation Platform

# 1. Создай группу
sudo dseditgroup -o create ofshared

# 2. Добавь обоих пользователей
sudo dseditgroup -o edit -a oleksandrsonich -t user ofshared
sudo dseditgroup -o edit -a botuser -t user ofshared

# 3. Назначь группу на проект
sudo chgrp -R ofshared /Users/oleksandrsonich/sites/joefans

# 4. Выдай права (⚠️ аккуратно — chmod 770 для ВСЕХ файлов приведёт к ошибкам Git!)
# поэтому отдельно для папок и файлов:
find /Users/oleksandrsonich/sites/joefans -type d -exec chmod 770 {} \;
find /Users/oleksandrsonich/sites/joefans -type f -exec chmod 660 {} \;

# 5. Установи SetGID на все папки (чтобы новые файлы получали ту же группу)
find /Users/oleksandrsonich/sites/joefans -type d -exec chmod g+s {} \;

# 6. Пропиши umask 007 в ~/.zshrc (для текущего пользователя)
echo "umask 007" >> ~/.zshrc

# 7. Повтори для botuser (через sudo -u botuser или вручную)
sudo -u botuser sh -c 'echo "umask 007" >> ~/.zshrc'

# 8. Активируй
source ~/.zshrc

# 9. Проверка
touch /Users/oleksandrsonich/sites/joefans/testfile-from-olex
sudo -u botuser touch /Users/oleksandrsonich/sites/joefans/testfile-from-botuser
ls -l /Users/oleksandrsonich/sites/joefans/testfile-from-*
# ✅ Ожидаемое: -rw-rw---- botuser/ofshared и oleksandrsonich/ofshared


# 10. Дай права на выполнение родительских директорий
chmod o+x /Users/oleksandrsonich
chmod o+x /Users/oleksandrsonich/sites
chmod o+x /Users/oleksandrsonich/sites/joefans
chmod o+x /Users/oleksandrsonich/sites/joefans/backend
chmod o+x /Users/oleksandrsonich/sites/joefans/backend/of-software
chmod o+x /Users/oleksandrsonich/sites/joefans/backend/of-software/src
chmod o+x /Users/oleksandrsonich/sites/joefans/backend/of-software/src/automate
chmod o+x /Users/oleksandrsonich/sites/joefans/backend/of-software/src/automate/utils
chmod o+x /Users/oleksandrsonich/sites/joefans/backend/of-software/src/automate/utils/python

# Дай execute/read на саму .venv
chmod -R o+rx /Users/oleksandrsonich/sites/joefans/backend/of-software/src/automate/utils/python/.venv
chmod -R g+rx /Users/oleksandrsonich/sites/joefans/backend/of-software/src/automate/utils/python/.venv

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

