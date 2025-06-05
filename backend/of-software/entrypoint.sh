#!/bin/bash

echo "[entrypoint] Creating cookies dir if missing ..."
mkdir -p /app/cookies

export DISPLAY=:0

# Запускаем виртуальный X сервер
Xvfb :10 -screen 0 1920x1080x16 &

# Менеджер окон
fluxbox &

# VNC сервер для удаленного доступа
x11vnc -display :10 -forever -nopw -listen 0.0.0.0 -xkb &

# Запуск Nest.js
if [ "$ENV" = "dev" ]; then
  npm run start:dev
else
  npm run start:prod
fi
