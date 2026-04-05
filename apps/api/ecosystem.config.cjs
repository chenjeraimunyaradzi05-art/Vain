/**
 * PM2 Ecosystem Configuration
 * Horizontal scaling with cluster mode
 */

module.exports = {
  apps: [
    {
      name: 'ngurra-api',
      script: './src/index.js',
      cwd: './',
      
      // Cluster mode for horizontal scaling
      instances: process.env.PM2_INSTANCES || 'max', // Use all CPU cores
      exec_mode: 'cluster',
      
      // Environment
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      
      // Auto-restart configuration
      watch: false,  // Disable in production
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful shutdown
      kill_timeout: 30000,  // 30 seconds to gracefully shutdown
      wait_ready: true,  // Wait for process.send('ready')
      listen_timeout: 10000,  // 10 seconds to startup
      
      // Logging
      log_file: './logs/combined.log',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Metrics for monitoring
      instance_var: 'INSTANCE_ID',
      
      // Source map support
      source_map_support: true,
      
      // Cron restart (optional - for memory leak mitigation)
      // cron_restart: '0 2 * * *',  // Restart at 2 AM daily
    },
    
    // Background job worker (separate process)
    {
      name: 'ngurra-worker',
      script: './src/worker.js',
      cwd: './',
      instances: process.env.PM2_WORKER_INSTANCES || 2,
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      
      max_memory_restart: '300M',
      restart_delay: 5000,
      max_restarts: 5,
      
      log_file: './logs/worker-combined.log',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.ngurrapathways.com.au', 'server2.ngurrapathways.com.au'],
      ref: 'origin/main',
      repo: 'git@github.com:ngurra-pathways/api.git',
      path: '/var/www/ngurra-api',
      'pre-setup': 'apt-get update && apt-get install -y nodejs npm',
      'post-setup': 'npm install -g pm2 && pm2 install pm2-logrotate',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && npx prisma migrate deploy && pm2 reload ecosystem.config.cjs --env production',
      'pre-deploy': 'git fetch --all',
      env: {
        NODE_ENV: 'production',
      },
    },
    
    staging: {
      user: 'deploy',
      host: 'staging.ngurrapathways.com.au',
      ref: 'origin/develop',
      repo: 'git@github.com:ngurra-pathways/api.git',
      path: '/var/www/ngurra-api-staging',
      'post-deploy': 'npm ci && npx prisma migrate deploy && pm2 reload ecosystem.config.cjs --env staging',
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
