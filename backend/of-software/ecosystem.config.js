module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/home/ubuntu/of-software/backend/of-software',
      script: 'npm',
      args: 'start',
      env: {
        DISPLAY: ':10.0'
      }
    }
  ]
}
