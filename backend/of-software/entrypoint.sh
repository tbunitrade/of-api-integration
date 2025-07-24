#!/bin/bash

echo "[entrypoint] Creating cookies dir if missing ..."
mkdir -p /app/cookies

export DISPLAY=:10

echo "[entrypoint] Removing old X lock files if exist..."
rm -f /tmp/.X10-lock /tmp/.X11-unix/X10

# Запускаем виртуальный X сервер
Xvfb :10 -screen 0 1728x1080x16 &

# Ждем, пока X сервер станет доступен
until xset q; do
  echo "Waiting for X server to start..."
  sleep 1
done

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
