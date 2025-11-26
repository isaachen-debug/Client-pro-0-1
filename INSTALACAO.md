# 🚀 Guia de Instalação - ClientePro

## Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

## Passo a Passo

### 1. Instalar dependências

```bash
# Na raiz do projeto
npm install

# Instalar dependências do backend
cd backend
npm install

# Instalar dependências do frontend
cd ../frontend
npm install
```

### 2. Configurar o banco de dados

```bash
cd backend

# Copiar arquivo de ambiente
cp .env.example .env

# Rodar migrations
npx prisma migrate dev --name init

# Gerar Prisma Client
npx prisma generate

# (Opcional) Abrir Prisma Studio para visualizar o banco
npx prisma studio
```

### 3. Rodar o projeto

#### Opção 1: Rodar tudo junto (Recomendado)

```bash
# Na raiz do projeto
npm run dev
```

#### Opção 2: Rodar separadamente

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Acessar o sistema

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Prisma Studio:** http://localhost:5555 (se rodando)

## 🎯 Testando o Sistema

### 1. Criar um cliente

Acesse a página "Clientes" e clique em "Adicionar Cliente":
- Nome: João Silva
- Telefone: (11) 98765-4321
- Email: joao@email.com
- Endereço: Rua das Flores, 123
- Tipo de Serviço: Limpeza completa

### 2. Criar um agendamento

Acesse a página "Agenda" e clique em "Novo Agendamento":
- Selecione o cliente criado
- Defina data, hora e valor
- Marque como recorrente se desejar

### 3. Visualizar no Dashboard

Volte para o Dashboard e veja as métricas atualizadas!

## 🔧 Comandos Úteis

### Backend

```bash
cd backend

# Desenvolvimento com hot reload
npm run dev

# Build para produção
npm run build

# Rodar produção
npm start

# Resetar banco de dados
npx prisma migrate reset

# Criar nova migration
npx prisma migrate dev --name nome_da_migration
```

### Frontend

```bash
cd frontend

# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📦 Estrutura do Projeto

```
clientepro/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Schema do banco de dados
│   ├── src/
│   │   ├── routes/            # Rotas da API
│   │   ├── db.ts              # Cliente Prisma
│   │   └── server.ts          # Servidor Express
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/               # Cliente HTTP
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx
│   └── package.json
└── package.json
```

## 🐛 Problemas Comuns

### Porta já em uso

Se as portas 3000 ou 5173 já estiverem em uso:

**Backend (.env):**
```
PORT=3001
```

**Frontend (vite.config.ts):**
```typescript
server: {
  port: 5174
}
```

### Erro no Prisma

```bash
cd backend
rm -rf node_modules
rm -rf prisma/dev.db
npm install
npx prisma generate
npx prisma migrate dev
```

### Erro CORS

Certifique-se que o backend está rodando e que o proxy no `vite.config.ts` está configurado corretamente.

## 🎨 Personalização

### Mudar cores do tema

Edite `frontend/tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // suas cores aqui
      }
    }
  }
}
```

### Adicionar novos campos

1. Edite `backend/prisma/schema.prisma`
2. Rode `npx prisma migrate dev`
3. Atualize os tipos em `frontend/src/types/index.ts`
4. Atualize as interfaces conforme necessário

## 📚 Tecnologias Utilizadas

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- SQLite

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router
- Recharts
- Lucide Icons
- date-fns

## 💡 Próximos Passos

- [ ] Adicionar autenticação de usuários
- [ ] Implementar notificações por WhatsApp
- [ ] Adicionar relatórios em PDF
- [ ] Sistema de permissões
- [ ] App mobile
- [ ] Integração com meios de pagamento

## 🆘 Suporte

Se tiver problemas, verifique:
1. Versão do Node.js (18+)
2. Todas as dependências instaladas
3. Banco de dados criado e migrations rodadas
4. Portas disponíveis

---

Desenvolvido com ❤️ para gestão de pequenas empresas de serviços

