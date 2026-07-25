#!/bin/bash
# Nova Web - deploy script for Oracle Cloud VM (Ubuntu)
# Run as: bash deploy.sh

set -e

echo "=== Nova Web Deploy ==="

# 1. Install Node.js 20
if ! command -v node &> /dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node: $(node -v)"

# 2. Install PM2
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  sudo npm install -g pm2
fi

# 3. Install git
if ! command -v git &> /dev/null; then
  echo "Installing git..."
  sudo apt-get install -y git
fi

# 4. Clone/update project
APP_DIR="/opt/nova-web"
if [ ! -d "$APP_DIR" ]; then
  echo "Cloning project..."
  sudo mkdir -p /opt
  sudo chown $USER:$USER /opt
  git clone https://github.com/CHANGEME/nova-web.git "$APP_DIR"
else
  echo "Updating project..."
  cd "$APP_DIR"
  git pull
fi

cd "$APP_DIR"

# 5. Install deps
echo "Installing dependencies..."
npm install

# 6. Setup launcher dir for jar downloads
LAUNCHER_DIR="/opt/nova-launcher"
sudo mkdir -p "$LAUNCHER_DIR/downloads"
sudo chown -R $USER:$USER "$LAUNCHER_DIR"

# 7. Start with PM2
echo "Starting with PM2..."
pm2 delete nova-web 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || true

# 8. Open port 3000 in firewall
echo "Opening port 3000..."
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
sudo netfilter-persistent save 2>/dev/null || true

echo ""
echo "=== DONE ==="
echo "Site: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VM_IP'):3000"
echo ""
echo "NEXT STEPS:"
echo "1. Open Oracle Cloud Console -> VM -> Security List -> Add Ingress Rule:"
echo "   Source: 0.0.0.0/0  Protocol: TCP  Dest Port: 3000"
echo "2. (Optional) Set MONGODB_URI in ecosystem.config.js for persistent DB"
echo "3. Restart: pm2 restart nova-web"
