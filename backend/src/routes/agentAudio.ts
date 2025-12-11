import { Router } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { authenticate } from '../middleware/auth';
import prisma from '../db';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // ~2MB
});

const allowedMime = new Set([
  'audio/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
]);

const intentSystemPrompt = `
Você é um orquestrador de intents para o app Clean Up. Extraia intents e parâmetros.
NUNCA use ações destrutivas. PROIBIDO deletar contas ou dados.
Intents permitidas:
- create_appointment: cria agendamento. Campos: customerName (obrigatório), date (YYYY-MM-DD), startTime (HH:mm), endTime?, price?, address?, notes?
- create_appointments_batch: cria vários agendamentos de uma vez. payload: { appointments: [{ customerName, date, startTime, endTime?, price?, notes? }] }. Se mais de 1 item, marque requiresConfirmation=true.
- create_client: cria cliente. Campos: name (obrigatório), phone?, email?, address?
- count_today, count_tomorrow, count_clients, appointments_today, appointments_tomorrow, appointments_week, appointments_month, appointments_pending_today, charges_status.
Regras de datas:
- Se não houver ano ou se o ano for passado, assuma o ano atual.
- Se falar "semana que vem", use os dias equivalentes na próxima semana (corrente +7 dias).
- Se disser apenas dia da semana, use a semana informada no contexto (ou semana atual).
Regras de horários (use sempre HH:mm 24h):
- "11 e meia" → "11:30"; "10 e meia" → "10:30".
- "meio-dia" → "12:00"; "meia-noite" → "00:00".
- "<hora> da manhã" mantém a hora (ex.: 9 da manhã → 09:00).
- "<hora> da tarde/noite" some 12 se < 12 (ex.: 3 da tarde → 15:00; 8 da noite → 20:00).
Faltando info crítica:
- Se faltar hora, retorne requiresConfirmation=true e summary pedindo o horário.
- Se faltar data, retorne requiresConfirmation=true e summary pedindo a data.
- Evite intent "unknown" se estiver claro que é um agendamento; prefira requerer confirmação.
Responda em JSON: { "intent": "...", "requiresConfirmation": bool, "summary": "...", "payload": { ... }, "reason": "..." }
`;

router.post('/', upload.single('file'), async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Envie o arquivo de áudio em "file".' });
  }

  if (!allowedMime.has(req.file.mimetype)) {
    return res.status(400).json({ error: 'Formato de áudio não suportado.' });
  }

  try {
    const client = new OpenAI({ apiKey });

    // Hotwords de clientes recentes para ajudar nomes parecidos (ex.: "Vitu" → "Vitor")
    const customers = await prisma.customer.findMany({
      where: { userId: req.user!.id },
      select: { name: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const customersHint = customers.map((c) => c.name).join(', ');

    const filename = `audio.${req.file.mimetype.split('/')[1] || 'webm'}`;
    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file: await toFile(req.file.buffer, filename, { type: req.file.mimetype }),
      language: 'pt',
      temperature: 0,
      prompt:
        `Contexto: app de agendamentos Clean Up (ClientPro). Vocabulário: agendar, marcar, cliente, horário, horas, meia, meio-dia, meia-noite, manhã, tarde, noite, segunda, terça, quarta, quinta, sexta, sábado, domingo, Vitor, Vitória, Vito, Vitoria, Ana, Maria. Clientes cadastrados: ${customersHint}. Foco em entender datas/horas.`,
    });

    const transcript = transcription.text?.trim() || '';
    if (!transcript) {
      return res.status(400).json({ error: 'Não foi possível transcrever o áudio.' });
    }

    const contextHint = (req.body?.contextHint as string) || '';

    const intentCompletion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${intentSystemPrompt}
Contexto de tela (pode usar para interpretar dias/semana/mês quando citado de forma relativa):
${contextHint}

Clientes cadastrados (referência para nomes parecidos; use aproximação): ${customersHint}
`,
        },
        { role: 'user', content: transcript },
      ],
      temperature: 0,
      max_tokens: 300,
    });

    let parsed: any = { intent: 'unknown', reason: 'sem resposta' };
    const content = intentCompletion.choices?.[0]?.message?.content;
    try {
      parsed = content ? JSON.parse(content) : parsed;
    } catch (err) {
      parsed = { intent: 'unknown', reason: 'parse_error' };
    }

    // Normalização de confirmação para agendamento (endTime não é obrigatório)
    if (parsed.intent === 'create_appointment') {
      const hasCustomer = !!parsed.payload?.customerName;
      const hasDate = !!parsed.payload?.date;
      const hasStart = !!parsed.payload?.startTime;
      const hasAll = hasCustomer && hasDate && hasStart;

      if (hasAll) {
        parsed.requiresConfirmation = false;
        parsed.reason = parsed.reason || 'all_required_fields_present';
      } else {
        parsed.requiresConfirmation = true;
        if (!parsed.summary) {
          const missing = [];
          if (!hasCustomer) missing.push('cliente');
          if (!hasDate) missing.push('data');
          if (!hasStart) missing.push('horário de início');
          parsed.summary = `Faltam ${missing.join(', ')} para criar o agendamento. Pode repetir?`;
        }
      }
    }

    return res.json({
      transcript,
      intent: parsed.intent,
      requiresConfirmation: parsed.requiresConfirmation ?? false,
      summary: parsed.summary,
      payload: parsed.payload,
      reason: parsed.reason,
    });
  } catch (error: any) {
    console.error('Erro no agent/audio:', error?.response?.data || error);
    return res.status(500).json({ error: 'Falha ao processar áudio.' });
  }
});

export default router;


