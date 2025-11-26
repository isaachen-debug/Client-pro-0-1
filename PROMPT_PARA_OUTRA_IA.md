# 🤖 PROMPT PARA OUTRA IA - Sistema ClientePro

## 📋 CONTEXTO

Eu tenho um sistema **full-stack completo** chamado **ClientePro** que foi desenvolvido para gestão de pequenas empresas de serviços (limpeza, manutenção, etc.). O sistema está **100% funcional** e **rodando localmente**.

---

## 🎯 O QUE FOI CRIADO

### Sistema Completo Incluindo:

1. **Backend API REST** (Node.js + Express + TypeScript + Prisma + SQLite)
2. **Frontend Web** (React 18 + TypeScript + Vite + Tailwind CSS v3)
3. **Banco de Dados** estruturado com 3 modelos (Cliente, Agendamento, Cobrança)
4. **5 Páginas Funcionais** com design moderno e responsivo
5. **Documentação Completa** (11 arquivos .md)
6. **Dados de Exemplo** já populados no banco

---

## 📁 ESTRUTURA DO PROJETO

```
/Users/isaachenrik/projeto code/
├── 📂 backend/                    # API Node.js
│   ├── prisma/
│   │   ├── schema.prisma         # Schema do banco
│   │   └── seed.ts               # Dados de exemplo
│   ├── src/
│   │   ├── routes/               # 5 módulos de rotas
│   │   │   ├── clientes.ts
│   │   │   ├── agendamentos.ts
│   │   │   ├── cobrancas.ts
│   │   │   ├── dashboard.ts
│   │   │   └── financeiro.ts
│   │   ├── db.ts                 # Cliente Prisma
│   │   └── server.ts             # Express server
│   └── package.json
│
├── 📂 frontend/                   # React App
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx        # Sidebar + Layout
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx     # Métricas + Gráficos
│   │   │   ├── Clientes.tsx      # Gestão de clientes
│   │   │   ├── AgendaMensal.tsx  # Calendário mensal
│   │   │   ├── AgendaSemanal.tsx # Agenda semanal
│   │   │   └── Financeiro.tsx    # Relatórios
│   │   ├── api/
│   │   │   └── index.ts          # Cliente HTTP (Axios)
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript interfaces
│   │   ├── App.tsx               # Rotas
│   │   └── main.tsx
│   ├── tailwind.config.js        # Tema verde customizado
│   ├── vite.config.ts            # Vite + proxy
│   └── package.json
│
├── 📂 Documentação/
│   ├── README.md                 # Doc principal
│   ├── COMECAR_AQUI.md          # Ponto de entrada
│   ├── QUICKSTART.md            # Início rápido
│   ├── INSTALACAO.md            # Guia detalhado
│   ├── API.md                   # Docs da API
│   ├── DEPLOY.md                # Deploy (Vercel, VPS, Docker)
│   ├── FEATURES.md              # Lista de funcionalidades
│   ├── RESUMO_DO_PROJETO.md     # Visão geral técnica
│   ├── CONTRIBUTING.md          # Guia de contribuição
│   ├── CHANGELOG.md             # Histórico de versões
│   └── LICENSE                  # MIT License
│
├── setup.sh                      # Script de instalação
└── package.json                  # Workspaces monorepo
```

---

## ✨ FUNCIONALIDADES IMPLEMENTADAS

### 1. Dashboard (/)
- ✅ Card: Total de ganhos do mês (com % variação)
- ✅ Card: Pagamentos pendentes (valor + quantidade)
- ✅ Card: Clientes ativos (total + novos)
- ✅ Card: Serviços agendados (com % variação)
- ✅ Gráfico de barras: Ganhos das últimas 4 semanas (Recharts)
- ✅ Lista: Próximos 5 agendamentos com foto/nome/data/valor

### 2. Clientes (/clientes)
- ✅ Tabela completa com: Nome, Tipo de Serviço, Telefone, Endereço
- ✅ Busca em tempo real (filtra por nome/telefone/serviço)
- ✅ Botão "Adicionar Cliente" → Modal com formulário
- ✅ Campos: nome, telefone, email, endereço, tipoServico, observações
- ✅ Avatar circular com iniciais do nome
- ✅ Contador de agendamentos por cliente

### 3. Agenda Mensal (/agenda)
- ✅ Grid visual do mês (2-4 colunas responsivas)
- ✅ Navegação: ← Mês Anterior | Mês Atual | Próximo Mês →
- ✅ Destaque do dia atual (borda verde)
- ✅ Cards por dia mostrando: Cliente, Hora, Status
- ✅ Status coloridos: AGENDADO (azul), CONCLUIDO (verde), CANCELADO (vermelho)
- ✅ Modal "Novo Agendamento" com:
  - Seleção de cliente
  - Tipo de serviço
  - Data + Hora
  - Valor
  - Checkbox: Agendamento recorrente
  - Select: Periodicidade (semanal/quinzenal/mensal)
  - Observações

### 4. Agenda Semanal (/semana)
- ✅ Visualização dos 7 dias da semana (grid responsivo)
- ✅ Botões: "Semana Atual" | "Próxima Semana"
- ✅ Navegação: ← Semana Anterior | Período | Próxima Semana →
- ✅ Filtros: Todos | Agendado | Concluído | Cancelado
- ✅ Cards detalhados por dia com:
  - Nome do cliente
  - Hora do serviço
  - Valor (R$)
  - Badge de status
  - Badge de pagamento (Pago/Pendente)
  - Ícone 🔄 para recorrentes
- ✅ Botões de ação:
  - "Concluir" → muda status + cria cobrança automaticamente
  - "Cancelar" → muda status para CANCELADO
- ✅ Legenda visual de cores

### 5. Financeiro (/financeiro)
- ✅ Filtros de período:
  - Últimos 7 dias
  - Últimos 30 dias
  - Mês atual
  - Mês passado
  - Personalizado (data início/fim)
- ✅ 4 Cards de métricas:
  - **Recebido**: Valor + quantidade de pagamentos (verde)
  - **Pendente**: Valor + quantidade de serviços (laranja)
  - **Concluídos**: Número de serviços (azul)
  - **Ticket Médio**: Valor médio por serviço (roxo)
- ✅ Seção "Resumo do Período":
  - Total de agendamentos
  - Cards: Agendados / Concluídos / Cancelados
  - Total Faturado + Pendente
- ✅ Botão "Exportar CSV" → download automático

### 6. Layout Geral
- ✅ Sidebar fixa (desktop) com logo "CleanBiz Pro"
- ✅ Menu hambúrguer (mobile)
- ✅ Navegação: Dashboard, Clientes, Agenda, Semana, Financeiro
- ✅ Avatar do usuário (isaac henrik / isaacolivexs@gmail.com)
- ✅ Header mobile com logo
- ✅ 100% responsivo (mobile-first)

---

## 🔌 API REST (Backend)

### Endpoints Implementados:

#### Clientes
- `GET /api/clientes` - Listar todos
- `GET /api/clientes/:id` - Buscar por ID (com histórico)
- `POST /api/clientes` - Criar novo
- `PUT /api/clientes/:id` - Atualizar
- `DELETE /api/clientes/:id` - Deletar

#### Agendamentos
- `GET /api/agendamentos` - Listar todos (com filtros)
- `GET /api/agendamentos?mes=11&ano=2025` - Filtro por mês
- `GET /api/agendamentos?dataInicio=X&dataFim=Y` - Filtro por período
- `GET /api/agendamentos?status=AGENDADO` - Filtro por status
- `GET /api/agendamentos/:id` - Buscar por ID
- `POST /api/agendamentos` - Criar novo
- `PUT /api/agendamentos/:id` - Atualizar
- `PATCH /api/agendamentos/:id/status` - Mudar status (cria cobrança automática ao concluir)
- `DELETE /api/agendamentos/:id` - Deletar

#### Cobranças
- `GET /api/cobrancas` - Listar todas
- `GET /api/cobrancas?status=PENDENTE` - Filtro por status
- `PATCH /api/cobrancas/:id/pagar` - Marcar como paga
- `DELETE /api/cobrancas/:id` - Deletar

#### Dashboard
- `GET /api/dashboard` - Retorna:
  - totalGanhos: {valor, quantidade, variacao}
  - pagamentosPendentes: {valor, quantidade}
  - clientesAtivos: {total, novos}
  - servicosAgendados: {total, variacao}
  - grafico: [{name, valor}] (últimas 4 semanas)
  - proximosAgendamentos: [] (próximos 5)

#### Financeiro
- `GET /api/financeiro?periodo=mesAtual` - Dados financeiros
- `GET /api/financeiro/exportar` - Download CSV

---

## 💾 BANCO DE DADOS (Prisma + SQLite)

### Schema:

```prisma
model Cliente {
  id            String         @id @default(uuid())
  nome          String
  telefone      String
  email         String?
  endereco      String
  tipoServico   String
  observacoes   String?
  ativo         Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  agendamentos  Agendamento[]
  cobrancas     Cobranca[]
}

model Agendamento {
  id              String        @id @default(uuid())
  clienteId       String
  cliente         Cliente       @relation(fields: [clienteId], references: [id])
  tipoServico     String
  data            DateTime
  hora            String
  valor           Float
  status          String        @default("AGENDADO") // AGENDADO, CONCLUIDO, CANCELADO
  recorrente      Boolean       @default(false)
  periodicidade   String?       // semanal, quinzenal, mensal
  observacoes     String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  cobranca        Cobranca?
}

model Cobranca {
  id              String        @id @default(uuid())
  agendamentoId   String        @unique
  agendamento     Agendamento   @relation(fields: [agendamentoId], references: [id])
  clienteId       String
  cliente         Cliente       @relation(fields: [clienteId], references: [id])
  valor           Float
  status          String        @default("PENDENTE") // PENDENTE, PAGO
  dataPagamento   DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}
```

### Dados de Exemplo (já populados):
- 3 Clientes: Maria Silva, João Santos, Ana Costa
- 4 Agendamentos (alguns futuros, alguns passados)
- 2 Cobranças (1 paga, 1 pendente)

---

## 🎨 DESIGN SYSTEM (Tailwind v3)

### Cores:
- **Primary**: Green #22c55e (verde profissional)
- **Success**: Verde
- **Warning**: Laranja
- **Error**: Vermelho
- **Info**: Azul
- **Neutral**: Cinza

### Componentes:
- Cards com sombra sutil (shadow-sm)
- Botões com hover effects
- Inputs com focus ring (ring-2 ring-primary-500)
- Modais centralizados com backdrop
- Badges de status coloridos
- Loading spinners
- Avatares circulares
- Sidebar responsiva

### Status Colors:
- **AGENDADO**: `bg-blue-500` / `bg-blue-100 text-blue-700`
- **CONCLUIDO**: `bg-green-500` / `bg-green-100 text-green-700`
- **CANCELADO**: `bg-red-500` / `bg-red-100 text-red-700`
- **PENDENTE**: `bg-orange-100 text-orange-700`
- **PAGO**: `bg-green-100 text-green-700`

---

## 🛠️ STACK TECNOLÓGICO

### Backend:
- Node.js 18+
- Express ^4.18.2
- TypeScript ^5.3.3
- Prisma ^5.7.0 (ORM)
- SQLite (database)
- CORS habilitado
- tsx (desenvolvimento)

### Frontend:
- React ^18.2.0
- TypeScript ^5.3.3
- Vite ^5.0.8 (bundler)
- Tailwind CSS ^3.3.6
- React Router ^6.20.1
- Axios ^1.6.2 (HTTP)
- Recharts ^2.10.3 (gráficos)
- date-fns ^3.0.0 (datas PT-BR)
- Lucide React ^0.294.0 (ícones)

---

## 🔄 AUTOMAÇÕES IMPLEMENTADAS

1. **Criação Automática de Cobrança**:
   - Ao mudar status de agendamento para "CONCLUIDO"
   - Cria cobrança com status "PENDENTE"
   - Valor copiado do agendamento

2. **Cálculo Automático de Métricas**:
   - Total de ganhos (soma cobranças pagas no mês)
   - Variação percentual vs mês anterior
   - Ticket médio automático
   - Contadores em tempo real

3. **Filtros Inteligentes**:
   - Busca em tempo real (clientes)
   - Filtros por data/mês/período
   - Filtros por status

---

## 🌐 SISTEMA RODANDO

### URLs:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

### Status Atual:
- ✅ Backend rodando (porta 3000)
- ✅ Frontend rodando (porta 5173)
- ✅ Banco de dados criado e populado
- ✅ Sistema 100% funcional

---

## 📝 O QUE PRECISO QUE VOCÊ ME AJUDE

[COLOQUE AQUI O QUE VOCÊ QUER QUE A OUTRA IA FAÇA]

Exemplos:
- "Preciso adicionar autenticação JWT ao sistema"
- "Quero criar um app mobile React Native com as mesmas funcionalidades"
- "Preciso fazer deploy na Vercel"
- "Quero adicionar notificações por WhatsApp"
- "Preciso migrar o banco de SQLite para PostgreSQL"
- "Quero adicionar testes unitários"
- "Preciso melhorar a performance"
- "Quero adicionar mais funcionalidades ao financeiro"

---

## 📚 ARQUIVOS IMPORTANTES

Para entender melhor o sistema, leia estes arquivos na pasta raiz:

1. **COMECAR_AQUI.md** - Ponto de entrada
2. **RESUMO_DO_PROJETO.md** - Visão geral completa
3. **API.md** - Documentação completa da API
4. **INSTALACAO.md** - Como rodar o projeto

---

## 🎯 OBSERVAÇÕES IMPORTANTES

1. Todo o código está em **TypeScript** (strict mode)
2. **Padrões de código** definidos em `.cursorrules`
3. Uso de **Tailwind CSS** para 100% dos estilos (zero CSS manual)
4. **Componentes funcionais** com hooks (React)
5. **API RESTful** seguindo convenções
6. **Prisma ORM** para todas as operações de banco
7. Sistema **totalmente responsivo** (mobile-first)
8. **Datas em PT-BR** (date-fns com locale ptBR)
9. **Error handling** em todas as rotas
10. **Documentação completa** (11 arquivos .md)

---

## 💡 CONTEXTO ADICIONAL

### Por que este sistema foi criado:
- Para pequenas empresas de serviços (limpeza, manutenção)
- Foco em simplicidade e usabilidade
- Visual profissional e moderno
- Agendamentos recorrentes (diferencial)
- Controle financeiro integrado

### Fluxo Principal:
1. Cadastrar Cliente
2. Criar Agendamento (com recorrência opcional)
3. Visualizar na Agenda
4. Concluir Serviço → Gera Cobrança automaticamente
5. Marcar Cobrança como Paga
6. Visualizar métricas no Dashboard
7. Gerar relatórios no Financeiro

---

## 🔑 INFORMAÇÕES TÉCNICAS

### Estrutura de Pastas (Padrões):
- **Backend**: Rotas em `src/routes/`, cada módulo separado
- **Frontend**: Páginas em `src/pages/`, componentes em `src/components/`
- **Types**: Interfaces TypeScript em `src/types/index.ts`
- **API Client**: Axios configurado em `src/api/index.ts`

### Convenções de Nomes:
- Componentes: PascalCase (Dashboard.tsx)
- Funções: camelCase (fetchClientes)
- Constantes: UPPER_SNAKE_CASE
- Tipos: PascalCase (Cliente, Agendamento)

### Git Ignore:
- node_modules
- dist
- .env
- *.db (banco de dados)
- .DS_Store

---

## 📞 COMO RODAR O SISTEMA (se você precisar testar)

```bash
# 1. Navegar para a pasta
cd "/Users/isaachenrik/projeto code"

# 2. Instalar dependências (se necessário)
npm install
cd backend && npm install
cd ../frontend && npm install

# 3. Configurar banco (se necessário)
cd backend
npx prisma generate
npx prisma migrate dev
npm run seed

# 4. Rodar tudo
cd ..
npm run dev

# Ou separadamente:
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

---

## ✅ CHECKLIST DO QUE JÁ FOI FEITO

- [x] Estrutura do projeto criada (monorepo)
- [x] Backend completo (Express + Prisma)
- [x] Frontend completo (React + Tailwind)
- [x] 5 rotas de API implementadas
- [x] 5 páginas frontend implementadas
- [x] Banco de dados modelado
- [x] Seed com dados de exemplo
- [x] Sistema de navegação (React Router)
- [x] Layout responsivo
- [x] Gráficos (Recharts)
- [x] Exportação CSV
- [x] Agendamentos recorrentes
- [x] Criação automática de cobranças
- [x] Filtros e buscas
- [x] 11 arquivos de documentação
- [x] Script de instalação (setup.sh)
- [x] Sistema rodando e funcional

---

## 🎯 PRONTO!

Agora você tem todas as informações sobre o **ClientePro**. 

**O sistema está completo, funcional e rodando!** 

Me diga o que você precisa que eu te ajude a fazer com este sistema!


