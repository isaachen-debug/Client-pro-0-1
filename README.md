# ClientePro 🧹

> Sistema completo de gestão para pequenas empresas de serviços

<div align="center">

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

</div>

## 📋 Sobre o Projeto

ClientePro é um sistema web moderno e intuitivo desenvolvido para facilitar a gestão de pequenas empresas de serviços como limpeza, manutenção, jardinagem, e muito mais.

### ✨ Principais Recursos

- 📊 **Dashboard Inteligente** - Visualize métricas importantes de forma clara
- 👥 **Gestão de Clientes** - Cadastro completo com histórico
- 📅 **Agenda Mensal/Semanal** - Visualização flexível dos agendamentos
- 💰 **Controle Financeiro** - Acompanhe receitas e pagamentos pendentes
- 🔄 **Agendamentos Recorrentes** - Configure serviços periódicos
- 📥 **Exportação CSV** - Exporte seus dados financeiros
- 📱 **100% Responsivo** - Funciona perfeitamente em qualquer dispositivo

## 🚀 Tecnologias

### Frontend
- ⚛️ React 18 + TypeScript
- ⚡ Vite (Build ultrarrápido)
- 🎨 Tailwind CSS (Design moderno)
- 🛣️ React Router (Navegação)
- 📡 Axios (HTTP Client)
- 📈 Recharts (Gráficos)
- 🎯 Lucide Icons
- 📅 date-fns (Datas em PT-BR)

### Backend
- 🟢 Node.js + Express
- 📘 TypeScript
- 🔷 Prisma ORM
- 💾 SQLite (dev) / PostgreSQL (prod)
- 🔒 CORS habilitado

## 📦 Instalação Rápida

### Opção 1: Script Automático (Recomendado)

```bash
chmod +x setup.sh
./setup.sh
```

### Opção 2: Manual

```bash
# 1. Instalar dependências
npm install
cd backend && npm install
cd ../frontend && npm install

# 2. Configurar banco de dados
cd backend
cp .env.example .env
npx prisma migrate dev --name init
npx prisma generate

# 3. Popular com dados de exemplo
npm run seed

# 4. Voltar para raiz e rodar
cd ..
npm run dev
```

## 🎯 Como Usar

### Iniciar o Sistema

```bash
# Rodar tudo junto
npm run dev

# Ou separadamente
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
```

### Acessar

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Prisma Studio**: `cd backend && npx prisma studio`

## 📚 Documentação

- 📖 [Guia de Instalação Completo](INSTALACAO.md)
- 🔌 [Documentação da API](API.md)
- 🚀 [Guia de Deploy](DEPLOY.md)
- ✨ [Lista de Funcionalidades](FEATURES.md)

## 🎨 Capturas de Tela

### Dashboard
- Cards com métricas principais
- Gráfico de ganhos das últimas 4 semanas
- Lista dos próximos agendamentos

### Clientes
- Tabela completa de clientes
- Busca em tempo real
- Formulário de cadastro intuitivo

### Agenda Mensal
- Grid visual do mês
- Status coloridos por agendamento
- Suporte a eventos recorrentes

### Agenda Semanal
- Visualização detalhada por dia
- Ações rápidas (Concluir/Cancelar)
- Filtros por status

### Financeiro
- Múltiplos filtros de período
- Cards com resumo financeiro
- Exportação para CSV

## 🗂️ Estrutura do Projeto

```
clientepro/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Modelo do banco
│   │   └── seed.ts          # Dados de exemplo
│   ├── src/
│   │   ├── routes/          # Endpoints da API
│   │   │   ├── clientes.ts
│   │   │   ├── agendamentos.ts
│   │   │   ├── cobrancas.ts
│   │   │   ├── dashboard.ts
│   │   │   └── financeiro.ts
│   │   ├── db.ts            # Cliente Prisma
│   │   └── server.ts        # Servidor Express
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Cliente HTTP
│   │   ├── components/      # Componentes React
│   │   │   └── Layout.tsx
│   │   ├── pages/           # Páginas
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Clientes.tsx
│   │   │   ├── AgendaMensal.tsx
│   │   │   ├── AgendaSemanal.tsx
│   │   │   └── Financeiro.tsx
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── setup.sh                 # Script de instalação
├── README.md                # Este arquivo
├── INSTALACAO.md            # Guia detalhado
├── API.md                   # Documentação da API
├── DEPLOY.md                # Guia de deploy
└── FEATURES.md              # Funcionalidades
```

## 🎯 Casos de Uso

ClientePro é perfeito para:

- 🧹 **Empresas de Limpeza** - Residencial e comercial
- 🔧 **Serviços de Manutenção** - Elétrica, hidráulica, etc
- 🌱 **Jardinagem** - Manutenção de jardins
- 🎨 **Pintura** - Residencial e predial
- 🐕 **Pet Care** - Dog walker, banho e tosa
- 📦 **Organização** - Personal organizer
- 👔 **Outros Serviços** - Qualquer negócio recorrente

## 💡 Próximas Funcionalidades

- [ ] Sistema de autenticação
- [ ] Notificações por WhatsApp
- [ ] Relatórios em PDF
- [ ] App Mobile (React Native)
- [ ] Integração com pagamentos
- [ ] Multi-usuários e permissões

## 🤝 Como Contribuir

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

## 📝 Comandos Úteis

```bash
# Backend
cd backend
npm run dev              # Desenvolvimento
npm run build            # Build para produção
npm start                # Rodar produção
npx prisma studio        # Interface visual do banco
npx prisma migrate dev   # Criar migration
npm run seed             # Popular banco com dados

# Frontend
cd frontend
npm run dev              # Desenvolvimento
npm run build            # Build para produção
npm run preview          # Preview do build
```

## 🐛 Solução de Problemas

### Porta já em uso
```bash
# Mudar porta do backend
# Edite backend/.env: PORT=3001

# Mudar porta do frontend
# Edite frontend/vite.config.ts
```

### Erro no Prisma
```bash
cd backend
rm -rf node_modules prisma/*.db
npm install
npx prisma generate
npx prisma migrate dev
```

### Problemas com dependências
```bash
# Limpar tudo e reinstalar
rm -rf node_modules frontend/node_modules backend/node_modules
npm run install:all
```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

Desenvolvido com ❤️ para facilitar a gestão de pequenos negócios

## 🌟 Mostre seu apoio

Se este projeto te ajudou, dê uma ⭐️!

---

<div align="center">

**[Website](#) • [Documentação](INSTALACAO.md) • [API](API.md) • [Deploy](DEPLOY.md)**

</div>

