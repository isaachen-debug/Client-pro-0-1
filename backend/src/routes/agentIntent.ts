import { Router } from 'express';
import OpenAI from 'openai';
import { Request, Response } from 'express';
import prisma from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

type Intent =
  | 'create_client'
  | 'create_appointment'
  | 'create_appointments_batch'
  | 'count_today'
  | 'count_tomorrow'
  | 'count_clients'
  | 'charges_status'
  | 'appointments_today'
  | 'appointments_tomorrow'
  | 'appointments_week'
  | 'appointments_month'
  | 'appointments_pending_today'
  | 'clients_recent'
  | 'clients_with_future'
  | 'unknown';

type ParsedIntent = {
  intent: Intent;
  requiresConfirmation?: boolean;
  summary?: string;
  payload?: any;
  reason?: string;
};

const systemPrompt = `
Você é um orquestrador de intents para o app Clean Up. Extraia uma intent e os parâmetros.
NUNCA use ações destrutivas. PROIBIDO deletar contas ou dados. Se pedido para deletar massa, responda intent "unknown" com reason.
Intents permitidas:
- create_client: cria cliente. Campos: name (obrigatório), phone?, email?, address?
- create_appointment: cria agendamento. Campos: customerName (obrigatório), date (YYYY-MM-DD), startTime (HH:mm), endTime?, price?, notes?
- create_appointments_batch: cria vários agendamentos. payload: { appointments: [{ customerName, date, startTime, endTime?, price?, notes? }] }. Se mais de 1 item, marcar requiresConfirmation=true.
- count_today: responder quantos agendamentos hoje.
- count_tomorrow: responder quantos agendamentos amanhã.
- count_clients: responder quantos clientes cadastrados.
- charges_status: resumo de cobranças (pendentes/pagas).
- appointments_today: listar/resumir agendamentos de hoje.
- appointments_tomorrow: listar/resumir agendamentos de amanhã.
- appointments_week: listar/resumir agendamentos da semana (segunda a domingo).
- appointments_month: listar/resumir agendamentos do mês atual.
- appointments_pending_today: listar agendamentos de hoje com status AGENDADO.
- clients_recent: listar últimos clientes criados (5 mais recentes).
- clients_with_future: listar clientes com agendamentos futuros (próximos).
Se faltar info crítica, marcar requiresConfirmation=true e summary explicando.
Responda em JSON: { "intent": "...", "requiresConfirmation": bool, "summary": "...", "payload": { ... }, "reason": "..." }
`;

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

router.post('/', async (req: Request, res: Response) => {
  const { message, context, history } = (req.body || {}) as {
    message?: string;
    context?: unknown;
    history?: { role: 'user' | 'assistant'; text: string }[];
  };
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Campo "message" é obrigatório.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada.' });
  }

  const client = new OpenAI({ apiKey });

  try {
    const contextMessage = context
      ? ({ role: 'system', content: `Contexto (dados recentes do usuário): ${JSON.stringify(context)}` } as const)
      : null;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}
Regras adicionais:
- Se a data não tiver ano ou vier em ano passado, assuma o ano atual.
- Se cliente, data e hora estiverem presentes, pode executar direto sem pedir confirmação.
`,
        },
        ...(contextMessage ? [contextMessage] : []),
        { role: 'user', content: message },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    const content = completion.choices?.[0]?.message?.content;
    let parsed: ParsedIntent = { intent: 'unknown', reason: 'sem resposta' };
    try {
      parsed = content ? JSON.parse(content) : parsed;
    } catch (e) {
      parsed = { intent: 'unknown', reason: 'parse_error' };
    }

    if (parsed.intent === 'create_appointments_batch') {
      parsed.requiresConfirmation = true;
    }

    // Salvaguardas
    if (['delete', 'remove', 'drop'].some((w) => message.toLowerCase().includes(w))) {
      parsed = { intent: 'unknown', reason: 'delete_blocked' };
    }
    if (parsed.intent === 'unknown') {
      // fallback: resposta livre, sem ações
      const historyMessages =
        Array.isArray(history)
          ? (history
              .slice(-6)
              .map((m) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: String(m.text ?? '').slice(0, 1000),
              }))
              .filter((m) => m.content.trim().length > 0) as any[])
          : [];

      const chatCompletion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `
Você é o Assistente IA do app CleanUp (ClientPro). Ajuda empresas de limpeza com agenda, clientes, finanças e comunicações,
e pode responder perguntas gerais de forma segura e concisa.
Tom: simples, profissional, direto, educado. Nunca invente dados ou faça ações destrutivas.
Funções:
- Explicar passos do app (adicionar cliente, marcar serviço, ver ganhos).
- Responder dúvidas de dados do app (ganhos, clientes, custos, ticket médio). Formato breve tipo: 📊 Resumo: Ganhos $X; Clientes Y; Custos $Z; Lucro $W. Se faltar dados, peça para cadastrar/autorizar.
- Gerar mensagens profissionais para clientes e traduzir PT ⇄ EN quando pedido.
- Personalizar conforme perfil (empresa pequena → prático; grande → mais contexto/automação).
- Para valores/preços, sugira consultar tabelas internas do usuário.
- Assuntos gerais: responder de modo informativo e curto; se for tema sensível/proibido, recusar educadamente.

Quando perguntarem “como funciona o Clean Up?”, “o que é o app?” ou “como vender o app?”:
- Comece com 1 frase curta de resumo.
- Em seguida, liste 3–6 bullets com as partes principais do produto (Agenda, Clientes, Financeiro, Atalhos, IA/Agent).
- Não use passo a passo numerado (1,2,3) salvo se o usuário pedir explicitamente “passo a passo”.
            `,
          },
          ...(context ? ([{ role: 'system', content: `Contexto: ${JSON.stringify(context)}` }] as const) : []),
          ...historyMessages,
          { role: 'user', content: message },
        ],
        temperature: 0.4,
        max_tokens: 400,
      });
      const answer = chatCompletion.choices?.[0]?.message?.content ?? 'Posso ajudar com clientes, agenda e financeiro.';
      return res.json({ intent: 'unknown', answer });
    }

    // Execução de intents simples (sem confirmação)
    if (!parsed.requiresConfirmation) {
      if (parsed.intent === 'count_today') {
        const today = startOfDay(new Date());
        const end = endOfDay(today);
        const count = await prisma.appointment.count({
          where: { userId: req.user!.id, date: { gte: today, lte: end } },
        });
        return res.json({ intent: parsed.intent, answer: `Você tem ${count} agendamentos hoje.` });
      }
      if (parsed.intent === 'count_tomorrow') {
        const today = startOfDay(new Date());
        const start = new Date(today);
        start.setDate(start.getDate() + 1);
        const end = endOfDay(start);
        const count = await prisma.appointment.count({
          where: { userId: req.user!.id, date: { gte: start, lte: end } },
        });
        return res.json({ intent: parsed.intent, answer: `Você tem ${count} agendamentos amanhã.` });
      }
      if (parsed.intent === 'count_clients') {
        const count = await prisma.customer.count({ where: { userId: req.user!.id } });
        return res.json({ intent: parsed.intent, answer: `Você tem ${count} clientes cadastrados.` });
      }
      if (parsed.intent === 'charges_status') {
        const pendentes = await prisma.transaction.count({
          where: { userId: req.user!.id, status: 'PENDENTE' },
        });
        const pagas = await prisma.transaction.count({
          where: { userId: req.user!.id, status: 'PAGO' },
        });
        return res.json({
          intent: parsed.intent,
          answer: `Cobranças: ${pendentes} pendente(s) e ${pagas} paga(s).`,
        });
      }
      if (parsed.intent === 'appointments_today') {
        const start = startOfDay(new Date());
        const end = endOfDay(start);
        const items = await prisma.appointment.findMany({
          where: { userId: req.user!.id, date: { gte: start, lte: end } },
          include: { customer: { select: { name: true } } },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          take: 10,
        });
        if (!items.length) {
          return res.json({ intent: parsed.intent, answer: 'Nenhum agendamento hoje.' });
        }
        const list = items
          .map((a) => `${a.startTime} - ${a.customer?.name || 'Cliente'} (${a.status || 'AGENDADO'})`)
          .join('; ');
        return res.json({ intent: parsed.intent, answer: `Agendamentos de hoje: ${list}` });
      }
      if (parsed.intent === 'appointments_tomorrow') {
        const today = startOfDay(new Date());
        const start = new Date(today);
        start.setDate(start.getDate() + 1);
        const end = endOfDay(start);
        const items = await prisma.appointment.findMany({
          where: { userId: req.user!.id, date: { gte: start, lte: end } },
          include: { customer: { select: { name: true } } },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          take: 10,
        });
        if (!items.length) {
          return res.json({ intent: parsed.intent, answer: 'Nenhum agendamento amanhã.' });
        }
        const list = items
          .map((a) => `${a.startTime} - ${a.customer?.name || 'Cliente'} (${a.status || 'AGENDADO'})`)
          .join('; ');
        return res.json({ intent: parsed.intent, answer: `Agendamentos de amanhã: ${list}` });
      }
      if (parsed.intent === 'appointments_week') {
        const now = new Date();
        const start = startOfDay(new Date(now));
        const day = start.getDay(); // 0=domingo
        const mondayOffset = ((day + 6) % 7) * -1; // brings to Monday
        start.setDate(start.getDate() + mondayOffset);
        const end = endOfDay(new Date(start));
        end.setDate(end.getDate() + 6);
        const items = await prisma.appointment.findMany({
          where: { userId: req.user!.id, date: { gte: start, lte: end } },
          include: { customer: { select: { name: true } } },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          take: 20,
        });
        if (!items.length) {
          return res.json({ intent: parsed.intent, answer: 'Nenhum agendamento nesta semana.' });
        }
        const list = items
          .map((a) => {
            const d = a.date.toISOString().slice(0, 10);
            return `${d} ${a.startTime} - ${a.customer?.name || 'Cliente'} (${a.status || 'AGENDADO'})`;
          })
          .join('; ');
        return res.json({ intent: parsed.intent, answer: `Agendamentos da semana: ${list}` });
      }
      if (parsed.intent === 'appointments_month') {
        const now = new Date();
        const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        const items = await prisma.appointment.findMany({
          where: { userId: req.user!.id, date: { gte: start, lte: end } },
          include: { customer: { select: { name: true } } },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          take: 30,
        });
        if (!items.length) {
          return res.json({ intent: parsed.intent, answer: 'Nenhum agendamento neste mês.' });
        }
        const list = items
          .map((a) => {
            const d = a.date.toISOString().slice(0, 10);
            return `${d} ${a.startTime} - ${a.customer?.name || 'Cliente'} (${a.status || 'AGENDADO'})`;
          })
          .join('; ');
        return res.json({ intent: parsed.intent, answer: `Agendamentos do mês: ${list}` });
      }
      if (parsed.intent === 'appointments_pending_today') {
        const start = startOfDay(new Date());
        const end = endOfDay(start);
        const items = await prisma.appointment.findMany({
          where: { userId: req.user!.id, status: 'AGENDADO', date: { gte: start, lte: end } },
          include: { customer: { select: { name: true } } },
          orderBy: [{ startTime: 'asc' }],
          take: 15,
        });
        if (!items.length) {
          return res.json({ intent: parsed.intent, answer: 'Nenhum agendamento pendente hoje.' });
        }
        const list = items
          .map((a) => `${a.startTime} - ${a.customer?.name || 'Cliente'}`)
          .join('; ');
        return res.json({ intent: parsed.intent, answer: `Pendentes de hoje: ${list}` });
      }
      if (parsed.intent === 'clients_recent') {
        const items = await prisma.customer.findMany({
          where: { userId: req.user!.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
        if (!items.length) {
          return res.json({ intent: parsed.intent, answer: 'Nenhum cliente cadastrado ainda.' });
        }
        const list = items.map((c) => c.name).join(', ');
        return res.json({ intent: parsed.intent, answer: `Últimos clientes: ${list}` });
      }
      if (parsed.intent === 'clients_with_future') {
        const today = startOfDay(new Date());
        const itemsRaw = await prisma.appointment.findMany({
          where: { userId: req.user!.id, date: { gte: today } },
          select: { customerId: true, customer: { select: { name: true } }, date: true, startTime: true },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          take: 50,
        });
        const seen = new Set<string>();
        const items = itemsRaw.filter((item) => {
          if (!item.customerId) return false;
          if (seen.has(item.customerId)) return false;
          seen.add(item.customerId);
          return true;
        }).slice(0, 10);
        if (!items.length) {
          return res.json({ intent: parsed.intent, answer: 'Nenhum cliente com agendamentos futuros.' });
        }
        const list = items
          .map((a) => {
            const d = a.date.toISOString().slice(0, 10);
            return `${a.customer?.name || 'Cliente'} (próximo: ${d} ${a.startTime})`;
          })
          .join('; ');
        return res.json({ intent: parsed.intent, answer: `Clientes com agendamentos futuros: ${list}` });
      }
    }

    // Se require confirmation ou criação de dados, apenas devolver resumo
    return res.json({
      intent: parsed.intent,
      requiresConfirmation: true,
      summary: parsed.summary || 'Posso executar esta ação.',
      payload: parsed.payload,
    });
  } catch (error: any) {
    console.error('agentIntent error', error?.response?.data || error);
    return res.status(500).json({ error: 'Falha ao processar intent.' });
  }
});

// Endpoint para confirmar e executar intents de escrita
router.post('/execute', async (req: Request, res: Response) => {
  const { intent, payload } = req.body || {};
  if (!intent) return res.status(400).json({ error: 'Intent é obrigatória.' });

  const normalizeDate = (value: string) => {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return null;
    const currentYear = new Date().getFullYear();
    if (d.getFullYear() < currentYear) {
      d.setFullYear(currentYear);
    }
    return d;
  };

  try {
    if (intent === 'create_client') {
      const { name, phone, email, address } = payload || {};
      if (!name) return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
      const created = await prisma.customer.create({
        data: {
          userId: req.user!.id,
          name,
          phone,
          email,
          address,
        },
      });
      return res.json({ ok: true, answer: `Cliente "${created.name}" criado com sucesso.` });
    }

    if (intent === 'create_appointment') {
      const { customerName, date, startTime, endTime, price, notes } = payload || {};
      if (!customerName || !date || !startTime) {
        return res.status(400).json({ error: 'Campos obrigatórios: cliente, data, início.' });
      }

      const normalizedDate = normalizeDate(date);
      if (!normalizedDate) {
        return res.status(400).json({ error: 'Data inválida.' });
      }

      let customer = await prisma.customer.findFirst({
        where: { userId: req.user!.id, name: { equals: customerName, mode: 'insensitive' } },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            userId: req.user!.id,
            name: customerName,
          },
        });
      }

      const priceNumber = price != null && price !== '' ? Number(price) : customer.defaultPrice ?? 0;

      const created = await prisma.appointment.create({
        data: {
          userId: req.user!.id,
          customerId: customer.id,
          date: normalizedDate,
          startTime,
          endTime: endTime || null,
          price: priceNumber,
          status: 'AGENDADO',
          notes: notes || null,
        },
      });
      return res.json({ ok: true, answer: `Agendamento criado para ${customerName} em ${date} ${startTime}.` });
    }

    if (intent === 'create_appointments_batch') {
      const items = Array.isArray(payload?.appointments) ? payload.appointments : [];
      if (!items.length) {
        return res.status(400).json({ error: 'Nenhum agendamento encontrado no payload.' });
      }

      const results: { customerName?: string; date?: string; startTime?: string; ok: boolean; error?: string }[] = [];

      for (const item of items) {
        const { customerName, date, startTime, endTime, price, notes } = item || {};
        if (!customerName || !date || !startTime) {
          results.push({
            customerName,
            date,
            startTime,
            ok: false,
            error: 'Faltam campos obrigatórios (cliente, data, início).',
          });
          continue;
        }

        const normalizedDate = normalizeDate(String(date));
        if (!normalizedDate) {
          results.push({ customerName, date, startTime, ok: false, error: 'Data inválida.' });
          continue;
        }

        try {
          let customer = await prisma.customer.findFirst({
            where: { userId: req.user!.id, name: { equals: customerName, mode: 'insensitive' } },
          });

          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                userId: req.user!.id,
                name: customerName,
              },
            });
          }

          const priceNumber = price != null && price !== '' ? Number(price) : customer.defaultPrice ?? 0;

          await prisma.appointment.create({
            data: {
              userId: req.user!.id,
              customerId: customer.id,
              date: normalizedDate,
              startTime,
              endTime: endTime || null,
              price: priceNumber,
              status: 'AGENDADO',
              notes: notes || null,
            },
          });

          results.push({ customerName, date: normalizedDate.toISOString().slice(0, 10), startTime, ok: true });
        } catch (err) {
          results.push({
            customerName,
            date,
            startTime,
            ok: false,
            error: 'Falha ao criar agendamento.',
          });
        }
      }

      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      const summaryParts = [];
      if (okCount) summaryParts.push(`${okCount} criado(s)`);
      if (failCount) summaryParts.push(`${failCount} falhou/ram`);

      return res.json({
        ok: okCount > 0,
        answer: `Lote concluído: ${summaryParts.join(', ')}.`,
        results,
      });
    }

    return res.status(400).json({ error: 'Intent não suportada para execução.' });
  } catch (error: any) {
    console.error('agentIntent execute error', error?.response?.data || error);
    return res.status(500).json({ error: 'Falha ao executar intent.' });
  }
});

export default router;

