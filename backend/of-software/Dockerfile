# src  of-software/backend/of-software/Dockerfile
FROM node:20.19

# Установка зависимостей, необходимых для Chromium и GUI
RUN apt-get update && apt-get install -y \
  wget gnupg ca-certificates fonts-liberation \
  libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
  libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
  libxdamage1 libxrandr2 libu2f-udev libvulkan1 xdg-utils libdrm2 libxext6 \
  libxi6 libxfixes3 libglib2.0-0 libxrender1 libxtst6 libjpeg62-turbo libgbm-dev \
  x11vnc fluxbox xvfb chromium dbus feh x11-utils x11-xserver-utils --no-install-recommends && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# Симлинк для совместимости с Puppeteer
RUN ln -s /usr/bin/chromium /usr/bin/chromium-browser

# ENV для puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Настройка фона для Fluxbox (сохраняется в образ)
# Fluxbox конфиги и фон
RUN mkdir -p /root/.fluxbox
COPY config/fluxbox/init /root/.fluxbox/init
COPY config/fluxbox/background.jpg /root/.fluxbox/background.jpg
#RUN mkdir -p /root/.fluxbox && \
#  echo 'session.screen0.rootCommand: fbsetbg -f /usr/share/images/fluxbox/debian-squared.jpg' > /root/.fluxbox/init

# Рабочая директория
WORKDIR /app

# Установка прод-зависимостей
COPY package.json ./
RUN npm install --only=production --no-package-lock

# Копирование всего остального
COPY . .
RUN mkdir -p /app/cookies/
COPY .env .env
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh


# Сборка проекта
RUN npm run build

# Экспонируем порты
EXPOSE 3000 5900

# Заменяем CMD
CMD ["/entrypoint.sh"]





