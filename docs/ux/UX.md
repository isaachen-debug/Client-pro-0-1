## UX por tela (objetivo, usuário, ações, estados)

### Login / Register
- Usuário: Owner, Helper, Client.
- Objetivo: entrar ou criar conta.
- Ações: escolher perfil, preencher email/senha, registrar.
- Estados: erro de credencial, loading, sucesso redireciona para rota do perfil.

### Dashboard (/app/home)
- Usuário: Owner.
- Objetivo: ver métricas rápidas.
- Ações: navegar para clientes, agenda, financeiro.
- Estados: carregando cards; vazio (sem dados) mostra cards zerados.

### Clientes (/app/clientes)
- Usuário: Owner.
- Objetivo: listar e criar clientes.
- Ações: buscar, abrir modal de novo cliente, salvar.
- Estados: vazio (sem clientes), erro de carga, salvando.

### Agenda Semana (/app/semana)
- Usuário: Owner.
- Objetivo: planejar semana, criar/editar agendamentos.
- Ações: abrir modal de criação, editar agendamento, mudar status, ver cliente.
- Estados: carregando semana, semana sem agendamentos, erro ao salvar/status.
- Google Calendar: se conectado, cria/atualiza evento com convidados (cliente/helper) e lembretes (30 min popup/email).

### Agenda Mês (/app/agenda)
- Usuário: Owner.
- Objetivo: visão mensal.
- Ações: navegar meses, ver agendamentos do dia, criar/editar.
- Estados: mês sem eventos, carregando.

### Financeiro (/app/financeiro)
- Usuário: Owner.
- Objetivo: acompanhar cobranças e status.
- Ações: filtrar, exportar CSV.
- Estados: vazio (sem transações), erro de carga.

### Configurações (/app/settings)
- Usuário: Owner.
- Objetivo: preferências de conta, idioma, integração Google.
- Ações: conectar Google Calendar, alterar idioma, links rápidos.
- Estados: conectado/desconectado Google, feedback de sucesso/erro.

### Equipe (/app/team)
- Usuário: Owner.
- Objetivo: gerir helpers/admins.
- Ações: listar membros.
- Estados: vazio (sem equipe), erro de carga.

### Helper (/helper/today)
- Usuário: Helper.
- Objetivo: ver rota do dia e detalhes de agendamento.
- Ações: ver appointments, checklist, status.
- Estados: dia vazio, erro de carga.

### Client (/client/home)
- Usuário: Client.
- Objetivo: ver timeline/resumo de visitas (quando habilitado).
- Ações: navegar home/settings.
- Estados: vazio, erro de carga.

