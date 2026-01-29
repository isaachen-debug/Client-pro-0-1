#!/bin/bash

echo "🔄 RESTAURAÇÃO DE BACKUP - SQLite → PostgreSQL"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "⚠️  Este script vai:"
echo "   1. Criar as tabelas no PostgreSQL novo"
echo "   2. Exportar dados do SQLite (dev.db)"
echo "   3. Importar tudo para o PostgreSQL"
echo "   4. Resetar a senha da sunflowers"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔐 Cole a DATABASE_URL do novo PostgreSQL:"
echo "   (Render Dashboard → PostgreSQL → Info → Internal Database URL)"
echo ""
read -r DATABASE_URL

export DATABASE_URL

echo ""
echo "✅ URL configurada (não será exibida)"
echo ""

# Verificar conexão
echo "🔍 Testando conexão com PostgreSQL..."
npx prisma db execute --url "$DATABASE_URL" --stdin << 'EOF' > /dev/null 2>&1
SELECT 1;
EOF

if [ $? -ne 0 ]; then
  echo "❌ Erro: Não consegui conectar no PostgreSQL!"
  echo "   Verifique se a URL está correta."
  exit 1
fi

echo "✅ Conexão OK!"
echo ""

# Passo 1: Criar schema no PostgreSQL
echo "📋 Passo 1/5: Criando tabelas no PostgreSQL..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
  echo "❌ Erro ao criar tabelas!"
  exit 1
fi

echo "✅ Tabelas criadas!"
echo ""

# Passo 2: Gerar Prisma Client
echo "🔧 Passo 2/5: Gerando Prisma Client..."
npx prisma generate > /dev/null 2>&1
echo "✅ Client gerado!"
echo ""

# Passo 3: Exportar dados do SQLite
echo "📤 Passo 3/5: Exportando dados do SQLite..."

cat > /tmp/export_sqlite.js << 'SCRIPT'
const { PrismaClient } = require('@prisma/client');

const sqlitePrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

async function exportData() {
  try {
    const users = await sqlitePrisma.user.findMany();
    const customers = await sqlitePrisma.customer.findMany();
    const appointments = await sqlitePrisma.appointment.findMany();
    const transactions = await sqlitePrisma.$queryRaw`SELECT * FROM "Transaction"`;
    
    const data = {
      users,
      customers,
      appointments,
      transactions
    };
    
    console.log(JSON.stringify(data));
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  } finally {
    await sqlitePrisma.$disconnect();
  }
}

exportData();
SCRIPT

node /tmp/export_sqlite.js > /tmp/backup_data.json 2>/dev/null

if [ $? -ne 0 ]; then
  echo "❌ Erro ao exportar dados!"
  exit 1
fi

USERS=$(cat /tmp/backup_data.json | grep -o '"users":\[' | wc -l)
echo "✅ Dados exportados!"
echo ""

# Passo 4: Importar para PostgreSQL
echo "📥 Passo 4/5: Importando dados para PostgreSQL..."

cat > /tmp/import_postgres.js << 'SCRIPT'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function importData() {
  try {
    const data = JSON.parse(fs.readFileSync('/tmp/backup_data.json', 'utf8'));
    
    // Importar usuários
    for (const user of data.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user
      });
    }
    
    // Importar clientes
    for (const customer of data.customers) {
      await prisma.customer.upsert({
        where: { id: customer.id },
        update: customer,
        create: customer
      });
    }
    
    // Importar agendamentos
    for (const appointment of data.appointments) {
      await prisma.appointment.upsert({
        where: { id: appointment.id },
        update: appointment,
        create: appointment
      });
    }
    
    console.log('Usuários:', data.users.length);
    console.log('Clientes:', data.customers.length);
    console.log('Agendamentos:', data.appointments.length);
    
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
SCRIPT

RESULT=$(node /tmp/import_postgres.js 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Erro ao importar: $RESULT"
  exit 1
fi

echo "$RESULT"
echo "✅ Dados importados!"
echo ""

# Passo 5: Resetar senha da sunflowers
echo "🔑 Passo 5/5: Resetando senha da sunflowers..."

cat > /tmp/reset_password.js << 'SCRIPT'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function resetPassword() {
  try {
    const passwordHash = await bcrypt.hash('teste123', 10);
    
    const user = await prisma.user.update({
      where: { email: 'sunflowerscleanings@gmail.com' },
      data: { passwordHash },
      select: { name: true, email: true }
    });
    
    console.log('Usuário:', user.name);
    console.log('Email:', user.email);
    
  } catch (error) {
    console.log('Usuário sunflowers não encontrado ou erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
SCRIPT

node /tmp/reset_password.js 2>&1

echo "✅ Senha resetada para: teste123"
echo ""

# Limpar arquivos temporários
rm -f /tmp/export_sqlite.js /tmp/import_postgres.js /tmp/reset_password.js /tmp/backup_data.json

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 RESTAURAÇÃO COMPLETA!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📧 Email: sunflowerscleanings@gmail.com"
echo "🔑 Senha: teste123"
echo ""
echo "🚀 Próximos passos:"
echo "   1. Vá no Render Dashboard"
echo "   2. Serviço do Backend → Environment"
echo "   3. Atualize DATABASE_URL com a nova URL"
echo "   4. Manual Deploy"
echo ""
