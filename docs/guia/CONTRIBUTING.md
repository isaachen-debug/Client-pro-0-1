# 🤝 Guia de Contribuição - ClientePro

Obrigado por considerar contribuir com o ClientePro! Este documento fornece diretrizes para contribuir com o projeto.

## 📋 Índice

- [Como Contribuir](#como-contribuir)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Melhorias](#sugerindo-melhorias)
- [Processo de Pull Request](#processo-de-pull-request)
- [Padrões de Código](#padrões-de-código)
- [Estrutura de Commits](#estrutura-de-commits)

## 🚀 Como Contribuir

### 1. Fork o Projeto

```bash
# Clone seu fork
git clone https://github.com/seu-usuario/clientepro.git
cd clientepro
```

### 2. Crie uma Branch

```bash
# Crie uma branch para sua feature
git checkout -b feature/minha-feature

# Ou para um bugfix
git checkout -b fix/meu-bugfix
```

### 3. Faça suas Alterações

- Escreva código limpo e bem documentado
- Siga os padrões do projeto
- Adicione comentários quando necessário
- Teste suas alterações

### 4. Commit suas Mudanças

```bash
git add .
git commit -m "feat: adiciona nova funcionalidade X"
```

### 5. Push para o GitHub

```bash
git push origin feature/minha-feature
```

### 6. Abra um Pull Request

- Vá para o repositório original
- Clique em "New Pull Request"
- Selecione sua branch
- Descreva suas alterações detalhadamente

## 🐛 Reportando Bugs

### Antes de Reportar

1. Verifique se o bug já foi reportado
2. Verifique a documentação
3. Teste na última versão

### Como Reportar

Crie uma issue com:

**Título:** Descrição curta e clara do bug

**Descrição:**
```markdown
## Descrição do Bug
Descrição clara do que aconteceu

## Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

## Comportamento Esperado
O que deveria acontecer

## Comportamento Atual
O que realmente aconteceu

## Screenshots
Se aplicável, adicione screenshots

## Ambiente
- OS: [e.g. macOS 14.0]
- Browser: [e.g. Chrome 120]
- Node: [e.g. 18.0.0]
- Versão: [e.g. 1.0.0]
```

## 💡 Sugerindo Melhorias

### Como Sugerir

Crie uma issue com:

```markdown
## Descrição da Melhoria
Descrição clara da feature sugerida

## Motivação
Por que essa feature seria útil?

## Alternativas Consideradas
Outras formas de resolver o problema

## Informações Adicionais
Qualquer contexto ou screenshot
```

## 🔄 Processo de Pull Request

### Checklist

Antes de enviar seu PR, certifique-se de:

- [ ] Código segue os padrões do projeto
- [ ] Comentários adicionados onde necessário
- [ ] Documentação atualizada
- [ ] Nenhum warning ou erro
- [ ] Testado localmente
- [ ] Commits bem estruturados
- [ ] PR tem uma descrição clara

### Template de PR

```markdown
## Descrição
Descrição clara do que foi feito

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Como Testar
1. Passo 1
2. Passo 2
3. Passo 3

## Screenshots (se aplicável)
Adicione screenshots

## Checklist
- [ ] Código está funcionando
- [ ] Sem warnings
- [ ] Documentação atualizada
- [ ] Testado localmente
```

## 📝 Padrões de Código

### Backend (Node.js)

```typescript
// ✅ BOM
export const fetchClientes = async (req: Request, res: Response) => {
  try {
    const clientes = await prisma.cliente.findMany();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
};

// ❌ RUIM
export const fetchClientes = async (req, res) => {
  const clientes = await prisma.cliente.findMany();
  res.json(clientes);
};
```

### Frontend (React)

```typescript
// ✅ BOM
interface Props {
  nome: string;
  idade: number;
}

const Componente: React.FC<Props> = ({ nome, idade }) => {
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  return <div>{nome}</div>;
};

// ❌ RUIM
const Componente = ({ nome, idade }) => {
  return <div>{nome}</div>;
};
```

### Naming Conventions

```typescript
// Componentes: PascalCase
Dashboard.tsx
ClienteCard.tsx

// Funções: camelCase
fetchClientes()
handleSubmit()

// Constantes: UPPER_SNAKE_CASE
const API_URL = 'http://localhost:3000';
const MAX_ITEMS = 100;

// Tipos: PascalCase
interface Cliente { }
type StatusType = 'ativo' | 'inativo';

// Arquivos: camelCase
clientes.ts
agendamentos.ts
```

### Organização de Imports

```typescript
// 1. Bibliotecas externas
import React from 'react';
import { useState } from 'react';
import axios from 'axios';

// 2. Imports internos
import api from '@/api';
import { Cliente } from '@/types';

// 3. Componentes
import Layout from '@/components/Layout';
import Card from '@/components/Card';

// 4. Estilos
import './styles.css';
```

## 📦 Estrutura de Commits

Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/).

### Formato

```
tipo(escopo): descrição curta

Descrição mais longa (opcional)
```

### Tipos

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Apenas documentação
- `style`: Formatação (não afeta código)
- `refactor`: Refatoração de código
- `perf`: Melhoria de performance
- `test`: Adicionar/corrigir testes
- `chore`: Tarefas de manutenção

### Exemplos

```bash
# Feature
git commit -m "feat(clientes): adiciona busca por telefone"

# Bugfix
git commit -m "fix(dashboard): corrige cálculo de ticket médio"

# Documentação
git commit -m "docs: atualiza README com instruções de deploy"

# Refactor
git commit -m "refactor(api): melhora estrutura de rotas"

# Performance
git commit -m "perf(dashboard): otimiza query de agendamentos"
```

## 🧪 Testes

### Rodando Testes

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Escrevendo Testes

```typescript
// Exemplo de teste
describe('Cliente API', () => {
  it('deve listar todos os clientes', async () => {
    const response = await request(app).get('/api/clientes');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

## 🎨 Style Guide

### Tailwind CSS

```tsx
// ✅ BOM - Classes organizadas
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">

// ❌ RUIM - CSS inline
<div style={{ display: 'flex', padding: '16px' }}>
```

### TypeScript

```typescript
// ✅ BOM - Tipos explícitos
const calcularTotal = (valores: number[]): number => {
  return valores.reduce((sum, val) => sum + val, 0);
};

// ❌ RUIM - Any ou sem tipos
const calcularTotal = (valores: any) => {
  return valores.reduce((sum, val) => sum + val, 0);
};
```

## 📚 Recursos Úteis

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Express Guide](https://expressjs.com/)

## 🏆 Reconhecimento

Todos os contribuidores serão reconhecidos no README do projeto!

## ❓ Perguntas

Se tiver dúvidas:
1. Veja a [documentação](INSTALACAO.md)
2. Busque em issues existentes
3. Crie uma nova issue com a tag `question`

## 📄 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a licença MIT.

---

**Obrigado por contribuir! 🎉**

