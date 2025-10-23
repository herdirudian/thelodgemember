module.exports = {
  apps: [
    {
      name: 'thelodge-backend',
      script: './backend/src/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      cwd: '/var/www/thelodgefamily/current',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
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
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
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