module.exports = {
  apps: [{
    name: 'nova-web',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      JWT_SECRET: 'nova-jwt-secret-CHANGE-THIS-2026',
      MONGODB_URI: '',
      LAUNCHER_DIR: '/opt/nova-launcher'
    }
  }]
};
