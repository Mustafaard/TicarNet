module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'ticarnet-api',
      cwd: process.env.TICARNET_ROOT || __dirname,
      script: './server/src/index.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
