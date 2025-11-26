#!/bin/bash

echo "🚀 Configurando ClientePro..."
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado. Por favor, instale o Node.js 18+${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Instalando dependências...${NC}"
npm install

echo -e "${BLUE}📦 Instalando dependências do backend...${NC}"
cd backend
npm install

echo -e "${BLUE}🗄️  Configurando banco de dados...${NC}"
cp .env.example .env || echo "DATABASE_URL=\"file:./dev.db\"\nPORT=3000\nNODE_ENV=development" > .env

echo -e "${BLUE}🔄 Rodando migrations...${NC}"
npx prisma migrate dev --name init

echo -e "${BLUE}📊 Gerando Prisma Client...${NC}"
npx prisma generate

echo -e "${BLUE}🌱 Populando banco com dados de exemplo...${NC}"
npm run seed

cd ..

echo -e "${BLUE}📦 Instalando dependências do frontend...${NC}"
cd frontend
npm install

cd ..

echo ""
echo -e "${GREEN}✅ Setup concluído com sucesso!${NC}"
echo ""
echo "Para iniciar o sistema:"
echo ""
echo "  ${BLUE}npm run dev${NC}        # Roda backend + frontend"
echo ""
echo "Ou separadamente:"
echo ""
echo "  Terminal 1:"
echo "  ${BLUE}cd backend && npm run dev${NC}"
echo ""
echo "  Terminal 2:"
echo "  ${BLUE}cd frontend && npm run dev${NC}"
echo ""
echo "URLs:"
echo "  - Frontend: ${BLUE}http://localhost:5173${NC}"
echo "  - Backend:  ${BLUE}http://localhost:3000${NC}"
echo ""
echo "🎉 Bom trabalho!"

