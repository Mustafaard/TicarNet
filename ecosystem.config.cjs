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
      min_uptime: '10s',
      max_restarts: 20,
      restart_delay: 3000,
      exp_backoff_restart_delay: 200,
      listen_timeout: 10000,
      kill_timeout: 5000,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
