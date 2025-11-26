# 📡 Documentação da API - ClientePro

Base URL: `http://localhost:3000/api`

## 🔗 Endpoints

### Health Check

```http
GET /health
```

Resposta:
```json
{
  "status": "ok",
  "message": "ClientePro API rodando!"
}
```

---

## 👥 Clientes

### Listar todos os clientes

```http
GET /api/clientes
```

Resposta:
```json
[
  {
    "id": "uuid",
    "nome": "Maria Silva",
    "telefone": "(11) 98765-4321",
    "email": "maria@email.com",
    "endereco": "Rua das Flores, 123",
    "tipoServico": "Limpeza completa",
    "observacoes": "Preferência para manhãs",
    "ativo": true,
    "createdAt": "2025-11-21T10:00:00.000Z",
    "updatedAt": "2025-11-21T10:00:00.000Z",
    "_count": {
      "agendamentos": 5,
      "cobrancas": 3
    }
  }
]
```

### Buscar cliente por ID

```http
GET /api/clientes/:id
```

Resposta: Cliente com agendamentos e cobranças incluídos

### Criar novo cliente

```http
POST /api/clientes
Content-Type: application/json

{
  "nome": "João Silva",
  "telefone": "(11) 91234-5678",
  "email": "joao@email.com",
  "endereco": "Rua Principal, 456",
  "tipoServico": "Limpeza express",
  "observacoes": "Cliente VIP"
}
```

### Atualizar cliente

```http
PUT /api/clientes/:id
Content-Type: application/json

{
  "nome": "João Silva Atualizado",
  "ativo": false
}
```

### Deletar cliente

```http
DELETE /api/clientes/:id
```

---

## 📅 Agendamentos

### Listar agendamentos

```http
GET /api/agendamentos
GET /api/agendamentos?mes=11&ano=2025
GET /api/agendamentos?dataInicio=2025-11-01&dataFim=2025-11-30
GET /api/agendamentos?status=AGENDADO
```

Resposta:
```json
[
  {
    "id": "uuid",
    "clienteId": "uuid",
    "cliente": {
      "id": "uuid",
      "nome": "Maria Silva"
    },
    "tipoServico": "Limpeza completa",
    "data": "2025-11-25T00:00:00.000Z",
    "hora": "09:00",
    "valor": 150.00,
    "status": "AGENDADO",
    "recorrente": false,
    "periodicidade": null,
    "observacoes": null,
    "cobranca": null
  }
]
```

### Buscar agendamento por ID

```http
GET /api/agendamentos/:id
```

### Criar agendamento

```http
POST /api/agendamentos
Content-Type: application/json

{
  "clienteId": "uuid",
  "tipoServico": "Limpeza completa",
  "data": "2025-11-25",
  "hora": "09:00",
  "valor": 150.00,
  "recorrente": true,
  "periodicidade": "semanal",
  "observacoes": "Cliente preferencia manhã"
}
```

### Atualizar agendamento

```http
PUT /api/agendamentos/:id
Content-Type: application/json

{
  "data": "2025-11-26",
  "hora": "10:00",
  "valor": 180.00
}
```

### Atualizar status

```http
PATCH /api/agendamentos/:id/status
Content-Type: application/json

{
  "status": "CONCLUIDO"
}
```

**Importante:** Ao mudar status para CONCLUIDO, uma cobrança PENDENTE é criada automaticamente.

Status válidos:
- `AGENDADO`
- `CONCLUIDO`
- `CANCELADO`

### Deletar agendamento

```http
DELETE /api/agendamentos/:id
```

---

## 💰 Cobranças

### Listar cobranças

```http
GET /api/cobrancas
GET /api/cobrancas?status=PENDENTE
GET /api/cobrancas?status=PAGO
```

Resposta:
```json
[
  {
    "id": "uuid",
    "agendamentoId": "uuid",
    "agendamento": {
      "id": "uuid",
      "data": "2025-11-20T00:00:00.000Z",
      "hora": "09:00"
    },
    "clienteId": "uuid",
    "cliente": {
      "id": "uuid",
      "nome": "Maria Silva"
    },
    "valor": 150.00,
    "status": "PENDENTE",
    "dataPagamento": null,
    "createdAt": "2025-11-20T12:00:00.000Z"
  }
]
```

### Marcar como paga

```http
PATCH /api/cobrancas/:id/pagar
```

Resposta: Cobrança atualizada com status PAGO e dataPagamento preenchida

### Deletar cobrança

```http
DELETE /api/cobrancas/:id
```

---

## 📊 Dashboard

### Obter dados do dashboard

```http
GET /api/dashboard
```

Resposta:
```json
{
  "totalGanhos": {
    "valor": 1500.00,
    "quantidade": 10,
    "variacao": 15.5
  },
  "pagamentosPendentes": {
    "valor": 450.00,
    "quantidade": 3
  },
  "clientesAtivos": {
    "total": 25,
    "novos": 3
  },
  "servicosAgendados": {
    "total": 7,
    "variacao": 12.5
  },
  "grafico": [
    { "name": "Semana 1", "valor": 300.00 },
    { "name": "Semana 2", "valor": 350.00 },
    { "name": "Semana 3", "valor": 400.00 },
    { "name": "Semana 4", "valor": 450.00 }
  ],
  "proximosAgendamentos": [
    {
      "id": "uuid",
      "cliente": {
        "nome": "Maria Silva"
      },
      "data": "2025-11-25T00:00:00.000Z",
      "hora": "09:00",
      "valor": 150.00
    }
  ]
}
```

---

## 💵 Financeiro

### Obter dados financeiros

```http
GET /api/financeiro
GET /api/financeiro?periodo=ultimos7dias
GET /api/financeiro?periodo=ultimos30dias
GET /api/financeiro?periodo=mesAtual
GET /api/financeiro?periodo=mesPassado
GET /api/financeiro?periodo=personalizado&dataInicio=2025-11-01&dataFim=2025-11-30
```

Resposta:
```json
{
  "periodo": {
    "inicio": "2025-11-01T00:00:00.000Z",
    "fim": "2025-11-30T23:59:59.999Z",
    "tipo": "mesAtual"
  },
  "recebido": {
    "valor": 1500.00,
    "quantidade": 10
  },
  "pendente": {
    "valor": 450.00,
    "quantidade": 3
  },
  "concluidos": 13,
  "ticketMedio": 150.00,
  "resumoAgendamentos": {
    "total": 20,
    "agendados": 7,
    "concluidos": 13,
    "cancelados": 0
  },
  "totalFaturado": 1950.00
}
```

### Exportar para CSV

```http
GET /api/financeiro/exportar
GET /api/financeiro/exportar?dataInicio=2025-11-01&dataFim=2025-11-30
```

Resposta: Arquivo CSV
```csv
Data,Cliente,Serviço,Valor,Status,Data Pagamento
20/11/2025,Maria Silva,Limpeza completa,150.00,PAGO,20/11/2025
21/11/2025,João Santos,Limpeza express,100.00,PENDENTE,-
```

---

## 🔒 Códigos de Status HTTP

- `200` OK - Requisição bem-sucedida
- `201` Created - Recurso criado com sucesso
- `400` Bad Request - Dados inválidos
- `404` Not Found - Recurso não encontrado
- `500` Internal Server Error - Erro no servidor

## 🧪 Testando a API

### Com curl

```bash
# Health check
curl http://localhost:3000/health

# Listar clientes
curl http://localhost:3000/api/clientes

# Criar cliente
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste",
    "telefone": "11999999999",
    "endereco": "Rua Teste, 123",
    "tipoServico": "Teste"
  }'

# Criar agendamento
curl -X POST http://localhost:3000/api/agendamentos \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "SEU_CLIENTE_ID",
    "tipoServico": "Limpeza",
    "data": "2025-11-25",
    "hora": "09:00",
    "valor": 150
  }'

# Dashboard
curl http://localhost:3000/api/dashboard

# Financeiro
curl "http://localhost:3000/api/financeiro?periodo=mesAtual"
```

### Com Postman/Insomnia

1. Importe a base URL: `http://localhost:3000`
2. Crie requests para cada endpoint
3. Configure headers: `Content-Type: application/json`
4. Teste os diferentes métodos (GET, POST, PUT, PATCH, DELETE)

### Com JavaScript/Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Listar clientes
const clientes = await api.get('/clientes');

// Criar agendamento
const agendamento = await api.post('/agendamentos', {
  clienteId: 'uuid',
  tipoServico: 'Limpeza',
  data: '2025-11-25',
  hora: '09:00',
  valor: 150
});

// Atualizar status
await api.patch('/agendamentos/uuid/status', {
  status: 'CONCLUIDO'
});
```

---

## 📝 Notas

- Todos os IDs são UUIDs
- Datas no formato ISO 8601
- Valores monetários em float (2 casas decimais)
- Timestamps em UTC
- Relacionamentos são carregados quando necessário
- Deleção em cascata habilitada (deletar cliente deleta seus agendamentos)

## 🔐 Segurança (Próximas versões)

- [ ] Autenticação JWT
- [ ] Rate limiting
- [ ] Validação de inputs
- [ ] Sanitização de dados
- [ ] HTTPS em produção
- [ ] Logs de auditoria

