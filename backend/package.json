#!/bin/bash
set -e

echo "?? Bienvenido al deploy de ClickInteligente"

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
sudo apt install -y nodejs npm git nginx mongodb certbot python3-certbot-nginx unzip dos2unix

# Crear estructura de la instalación
mkdir -p /var/www/$INSTALACION/backend
mkdir -p /var/www/$INSTALACION/frontend/src/pages
mkdir -p /var/www/$INSTALACION/frontend/public

cd /var/www/$INSTALACION

# Backend
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

# Frontend
cat > frontend/package.json <<EOL
{
  "name": "clickinteligente-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "^5.0.1",
    "ajv": "^8.13.0",
    "ajv-keywords": "^5.1.0"
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

# Instalar dependencias backend
cd backend
npm install
npx tsc

# Instalar dependencias frontend
cd ../frontend
npm install --legacy-peer-deps

# Convertir todos los saltos de línea a Unix
find src -type f -exec dos2unix {} \;

# Build frontend
npm run build

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
pm2 start backend/dist/server.js --name "$INSTALACION-backend"
pm2 save

echo "? Deploy completado! Tu aplicación está lista."
