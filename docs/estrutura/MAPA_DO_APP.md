## Mapa do App

Rotas e seções principais (OWNER, HELPER, CLIENT):

- Login / Register
- Dashboard (`/app/home`)
- Start / Explore (`/app/start`, `/app/explore`)
- Clientes (`/app/clientes`)
- Agenda
  - Semana (`/app/semana`)
  - Mês (`/app/agenda`)
- Financeiro (`/app/financeiro`)
- Plans / Empresa / Perfil / Settings (`/app/plans`, `/app/empresa`, `/app/profile`, `/app/settings`)
  - Integrações (Google Calendar)
- Equipe (`/app/team`)
- Apps / Helper Resources (`/app/apps`, `/app/helper-resources`)
- Fatura (`/app/invoice/:id`)

Perfis:
- Owner: /app/*
- Helper: /helper/* (today, settings, appointments/:id)
- Client: /client/* (home, settings)

