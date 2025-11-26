# ⚡ Início Rápido - ClientePro

## Em 5 minutos você terá o sistema rodando!

### 1️⃣ Clone ou baixe o projeto

```bash
cd /Users/isaachenrik/projeto\ code
```

### 2️⃣ Execute o script de instalação

```bash
chmod +x setup.sh
./setup.sh
```

O script irá:
- ✅ Instalar todas as dependências
- ✅ Configurar o banco de dados
- ✅ Criar as tabelas necessárias
- ✅ Popular com dados de exemplo

### 3️⃣ Inicie o sistema

```bash
npm run dev
```

### 4️⃣ Acesse no navegador

Abra: **http://localhost:5173**

## 🎉 Pronto! O sistema está rodando!

---

## 📱 O que você verá

### Dashboard
Ao abrir, você verá:
- 3 clientes de exemplo
- 4 agendamentos
- Métricas calculadas automaticamente
- Gráfico com dados das últimas semanas

### Experimente

1. **Adicionar um Cliente**
   - Vá em "Clientes"
   - Clique em "Adicionar Cliente"
   - Preencha os dados

2. **Criar um Agendamento**
   - Vá em "Agenda"
   - Clique em "Novo Agendamento"
   - Selecione um cliente e defina a data

3. **Concluir um Serviço**
   - Vá em "Semana"
   - Encontre um agendamento
   - Clique em "Concluir"
   - Uma cobrança será criada automaticamente!

4. **Ver o Financeiro**
   - Vá em "Financeiro"
   - Veja o resumo
   - Exporte os dados em CSV

---

## 🔧 Problemas?

### "Porta já em uso"

**Backend (3000):**
```bash
# Edite backend/.env
PORT=3001
```

**Frontend (5173):**
```bash
# Edite frontend/vite.config.ts
server: {
  port: 5174
}
```

### "Erro ao conectar com a API"

1. Certifique-se que o backend está rodando
2. Verifique se a porta 3000 está livre
3. Reinicie o servidor: `Ctrl+C` e `npm run dev` novamente

### "Prisma não encontrado"

```bash
cd backend
npm install
npx prisma generate
```

---

## 📚 Próximos Passos

1. Explore todas as funcionalidades
2. Personalize as cores em `frontend/tailwind.config.js`
3. Adicione seus próprios clientes
4. Leia a [documentação completa](INSTALACAO.md)
5. Veja a [documentação da API](API.md)

---

## 💡 Dicas

- **Dados de exemplo**: O sistema vem com 3 clientes e alguns agendamentos
- **Prisma Studio**: Acesse `cd backend && npx prisma studio` para ver o banco visualmente
- **Hot Reload**: Mudanças no código são refletidas automaticamente
- **Logs**: Veja os logs no terminal onde rodou `npm run dev`

---

## 🆘 Ajuda

Se tiver problemas:
1. Verifique se o Node.js 18+ está instalado: `node -v`
2. Verifique se todas as dependências foram instaladas
3. Veja os logs de erro no terminal
4. Consulte a [documentação completa](INSTALACAO.md)

---

## 🎯 Comandos Mais Usados

```bash
# Iniciar tudo
npm run dev

# Ver o banco de dados visualmente
cd backend && npx prisma studio

# Popular novamente com dados
cd backend && npm run seed

# Limpar e reinstalar
rm -rf node_modules */node_modules
npm run install:all
```

---

**Aproveite o ClientePro! 🚀**

