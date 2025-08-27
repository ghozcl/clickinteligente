#!/bin/bash
set -e

echo "🚀 Bienvenido al deploy de ClickInteligente"

# Preguntar datos de instalación
read -p "Nombre de la instalación (ej: clickinteligente): " INSTALACION
read -p "Dominio frontend (ej: app.clickinteligente.cl): " DOMAIN_FRONT
read -p "Dominio backend (ej: api.clickinteligente.cl): " DOMAIN_BACK
read -p "Nombre de la base de datos MongoDB: " DB_NAME
read -p "Email admin: " ADMIN_EMAIL
read -sp "Contraseña admin: " ADMIN_PASS
echo ""

# Actualizar sistema
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl gnupg lsb-release unzip git nginx certbot python3-certbot-nginx dos2unix

# Instalar Node.js y npm si no están
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Instalar MongoDB desde repositorio oficial si no está
if ! command -v mongod &>/dev/null; then
    echo "⚡ Instalando MongoDB..."
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
    echo "deb [ arch=amd64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    sudo apt update
    sudo apt install -y mongodb-org
    sudo systemctl enable mongod
    sudo systemctl start mongod
else
    echo "✅ MongoDB ya está instalado"
fi

# Instalar TypeScript global si no está
if ! command -v tsc &>/dev/null; then
    sudo npm install -g typescript
fi

# Crear estructura de instalación
sudo mkdir -p /var/www/$INSTALACION/backend
sudo mkdir -p /var/www/$INSTALACION/frontend/src/pages
sudo mkdir -p /var/www/$INSTALACION/frontend/public
sudo chown -R $USER:$USER /var/www/$INSTALACION

cd /var/www/$INSTALACION

# Backend package.json
cat > backend/package.json <<EOL
{
  "name": "clickinteligente-backend",
  "version": "1.0.0",
  "main": "dist/server.js",
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "dotenv": "^16.1.4"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "@types/node": "^20.7.4",
    "@types/express": "^4.17.21"
  }
}
EOL

# Frontend package.json
cat > frontend/package.json <<EOL
{
  "name": "clickinteligente-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "^5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
EOL

# Backend .env
cat > backend/.env <<EOL
MONGO_URI=mongodb://localhost:27017/$DB_NAME
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASS=$ADMIN_PASS
PORT=5000
EOL

# Clonar repositorio si no existe
if [ ! -d "./.git" ]; then
    git clone https://github.com/ghozcl/clickinteligente.git .
else
    git pull
fi

# Instalar dependencias backend
cd backend
npm install
npx tsc || true   # Ignorar errores tsc si no hay tsconfig.json

# Instalar dependencias frontend
cd ../frontend
npm install --legacy-peer-deps
npm run build

# Convertir todos los saltos de línea a Unix
find src -type f -exec dos2unix {} \;

# Configuración Nginx
sudo tee /etc/nginx/sites-available/$INSTALACION <<EOF
server {
    listen 80;
    server_name $DOMAIN_FRONT $DOMAIN_BACK;

    root /var/www/$INSTALACION/frontend/build;
    index index.html index.htm;

    location / {
        try_files \$uri /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/$INSTALACION /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Certbot SSL
sudo certbot --nginx -d $DOMAIN_FRONT -d $DOMAIN_BACK --non-interactive --agree-tos -m $ADMIN_EMAIL

# Iniciar backend con PM2
sudo npm install -g pm2
pm2 start backend/dist/server.js --name "$INSTALACION-backend" || pm2 restart "$INSTALACION-backend"
pm2 save

echo "✅ Deploy completado! Tu aplicación está lista."
