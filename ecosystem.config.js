module.exports = {
  apps: [
    {
      name: 'thelodge-backend',
      script: './backend/dist/index.js',
      interpreter: 'node',
      cwd: '/var/www/thelodgefamily/current',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        DATABASE_URL: 'file:/var/www/thelodgefamily/current/backend/prisma/dev.db',
        APP_URL: 'https://family.thelodgegroup.id',
        FRONTEND_URL: 'https://family.thelodgegroup.id',
        JWT_SECRET: 'change_me_please',
        QR_HMAC_SECRET: 'secure_qr_secret'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        DATABASE_URL: 'file:/var/www/thelodgefamily/current/backend/prisma/dev.db',
        APP_URL: 'https://family.thelodgegroup.id',
        FRONTEND_URL: 'https://family.thelodgegroup.id',
        JWT_SECRET: 'change_me_please',
        QR_HMAC_SECRET: 'secure_qr_secret'
      },
      log_file: '/var/www/thelodgefamily/shared/logs/backend-combined.log',
      out_file: '/var/www/thelodgefamily/shared/logs/backend-out.log',
      error_file: '/var/www/thelodgefamily/shared/logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'thelodge-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/thelodgefamily/current/frontend',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        NEXT_PUBLIC_API_URL: 'https://family.thelodgegroup.id/api',
        NEXT_PUBLIC_XENDIT_PUBLIC_KEY: 'xnd_public_development_ZmDaRXsyswaNKu1JOxiNKxy79NZ4YGMi7tvvL66Z2I6zWqAecypFh2EadYmzGfc'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003,
        NEXT_PUBLIC_API_URL: 'https://family.thelodgegroup.id/api',
        NEXT_PUBLIC_XENDIT_PUBLIC_KEY: 'xnd_public_development_ZmDaRXsyswaNKu1JOxiNKxy79NZ4YGMi7tvvL66Z2I6zWqAecypFh2EadYmzGfc'
      },
      log_file: '/var/www/thelodgefamily/shared/logs/frontend-combined.log',
      out_file: '/var/www/thelodgefamily/shared/logs/frontend-out.log',
      error_file: '/var/www/thelodgefamily/shared/logs/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/thelodgefamily.git',
      path: '/var/www/thelodgefamily',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && cd ../frontend && npm install && npm run build && cd ../backend && npx prisma db push && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'ForwardAgent=yes'
    }
  }
};
