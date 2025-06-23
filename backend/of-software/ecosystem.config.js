module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/home/ubuntu/of-software/backend/of-software',
      script: 'npm',
      args: 'start',
      env: {
        DISPLAY: ':10',
        HEADLESS_MODE: 'false',
        PUPPETEER_EXECUTABLE_PATH: '/home/ubuntu/.cache/puppeteer/chrome/linux-128.0.6613.119/chrome-linux64/chrome',
      }
    }
  ]
}
