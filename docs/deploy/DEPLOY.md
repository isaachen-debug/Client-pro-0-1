# 🚀 Guia de Deploy - ClientePro

## Opções de Deploy

### 1. Vercel (Recomendado para começar)

#### Frontend (Vercel)

1. Faça push do código para GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Importe o projeto
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Adicione variável de ambiente:
   - `VITE_API_URL`: URL do seu backend

#### Backend (Vercel Serverless ou Railway)

**Opção A: Railway**
1. Acesse [railway.app](https://railway.app)
2. Crie novo projeto
3. Conecte seu GitHub
4. Selecione o diretório `backend`
5. Configure variáveis:
   - `DATABASE_URL`: URL do PostgreSQL
   - `PORT`: 3000
   - `NODE_ENV`: production

**Opção B: Render**
1. Acesse [render.com](https://render.com)
2. Crie Web Service
3. Conecte repositório
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`

### 2. VPS (DigitalOcean, AWS, etc)

#### Preparação

```bash
# No servidor
sudo apt update
sudo apt install nodejs npm nginx postgresql

# Clonar repositório
git clone seu-repo.git
cd clientepro

# Instalar dependências
npm run install:all

# Configurar PostgreSQL
sudo -u postgres psql
CREATE DATABASE clientepro;
CREATE USER clientepro WITH PASSWORD 'sua-senha';
GRANT ALL PRIVILEGES ON DATABASE clientepro TO clientepro;
\q

# Configurar .env no backend
cd backend
nano .env
```

**.env (produção)**
```env
DATABASE_URL="postgresql://clientepro:senha@localhost:5432/clientepro"
PORT=3000
NODE_ENV=production
```

```bash
# Rodar migrations
npx prisma migrate deploy
npx prisma generate

# Build
npm run build

# PM2 para manter rodando
npm install -g pm2
pm2 start dist/server.js --name clientepro-api
pm2 startup
pm2 save
```

#### Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/clientepro
```

```nginx
# Backend
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name seudominio.com;
    root /var/www/clientepro/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/clientepro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL com Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com -d api.seudominio.com
```

#### Build Frontend

```bash
cd frontend
npm run build

# Copiar para nginx
sudo cp -r dist/* /var/www/clientepro/frontend/dist/
```

### 3. Docker

#### Dockerfile (Backend)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### Dockerfile (Frontend)

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: clientepro
      POSTGRES_USER: clientepro
      POSTGRES_PASSWORD: senha_segura
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://clientepro:senha_segura@postgres:5432/clientepro
      PORT: 3000
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
# Rodar com Docker
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

## 🗄️ Migração de SQLite para PostgreSQL

```bash
# 1. Instalar Prisma
npm install -g prisma

# 2. Atualizar schema.prisma
# Mudar de sqlite para postgresql
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# 3. Criar migrations
npx prisma migrate dev

# 4. Exportar dados do SQLite (se necessário)
# Use ferramentas como prisma db pull ou scripts customizados
```

## ⚡ Otimizações de Performance

### Backend

```typescript
// Habilitar compressão
import compression from 'compression';
app.use(compression());

// Rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de requests
});
app.use('/api/', limiter);

// Cache
import redis from 'redis';
const client = redis.createClient();
```

### Frontend

```json
// vite.config.ts - otimizações de build
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts']
        }
      }
    }
  }
})
```

## 🔒 Checklist de Segurança

- [ ] Variáveis de ambiente configuradas
- [ ] HTTPS habilitado
- [ ] CORS configurado corretamente
- [ ] Rate limiting implementado
- [ ] Senhas fortes no banco
- [ ] Backups automáticos
- [ ] Logs de erro configurados
- [ ] Monitoramento ativo
- [ ] Firewall configurado
- [ ] SSH com chave pública

## 📊 Monitoramento

### Sentry (Erros)

```bash
npm install @sentry/node @sentry/react
```

```typescript
// Backend
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: "your-dsn" });

// Frontend
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: "your-dsn" });
```

### Logs

```bash
# PM2
pm2 logs clientepro-api

# Docker
docker-compose logs -f backend
```

## 🔄 CI/CD com GitHub Actions

```.github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: |
          cd backend && npm run build
          cd ../frontend && npm run build
      
      - name: Deploy
        run: |
          # Seus comandos de deploy
```

## 📱 URLs de Exemplo

- **Produção**: https://clientepro.com
- **API**: https://api.clientepro.com
- **Staging**: https://staging.clientepro.com

---

**Dica**: Comece com Vercel/Railway para MVP, depois migre para VPS quando crescer! 🚀

