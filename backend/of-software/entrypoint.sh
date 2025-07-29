#!/bin/bash

# Загружаем переменные из .env, если файл существует
# We need to check .env for correct env installation process

if [ -f .env ]; then
  echo "[entrypoint] load data from local .env"
  #export $(grep -v '^#' .env | xargs)
  set -o allexport
  source .env
  set +o allexport
fi

echo "[entrypoint] DISPLAY=$DISPLAY, ENV=$ENV"

# Устанавливаем DISPLAY и удаляем lock-файлы ДО запуска Xvfb
#export DISPLAY=:10 # ❌ захардкожено
echo "[entrypoint] Удаляем возможные блокирующие файлы X сервера (lock-файлы)..."
rm -f /tmp/.X10-lock /tmp/.X11-unix/X10

# Запускаем виртуальный X сервер
Xvfb $DISPLAY -screen 0 1728x1080x16 &

# Ждем пока Xvfb начнёт работать (проверяем через xset q)
for i in {1..20}; do
  if xset q &>/dev/null; then
    echo "[entrypoint] X сервер запущен x loaded success "
    break
  else
    echo "[entrypoint] Ожидаем запуск X сервера..."
    sleep 1
  fi
done

echo "[entrypoint] Создаём папку для cookie, если её нет..."
mkdir -p /app/cookies

echo "[entrypoint] Запускаем оконный менеджер fluxbox для управления окнами в X сервере..."
fluxbox &

echo "[entrypoint] Запускаем VNC сервер (x11vnc) для удалённого доступа к графическому окружению..."
x11vnc -display :10 -forever -nopw -listen 0.0.0.0 -xkb &

echo "[entrypoint] Запускаем приложение Nest.js в зависимости от режима (dev или prod)..."
if [ "$ENV" = "dev" ] || [ "$ENV" = "local" ]; then
   echo "[entrypoint] Запускаем в dev/local mode-режиме"
  npm run start:dev
else
  echo "[entrypoint] Запускаем в prod режиме"
  npm run start:prod
fi
