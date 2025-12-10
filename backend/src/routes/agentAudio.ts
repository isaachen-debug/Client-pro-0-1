import { Router } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { authenticate } from '../middleware/auth';

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
Se faltar info crítica, marcar requiresConfirmation=true e summary explicando.
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

    const filename = `audio.${req.file.mimetype.split('/')[1] || 'webm'}`;
    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file: await toFile(req.file.buffer, filename, { type: req.file.mimetype }),
      language: 'pt',
    });

    const transcript = transcription.text?.trim() || '';
    if (!transcript) {
      return res.status(400).json({ error: 'Não foi possível transcrever o áudio.' });
    }

    const contextHint = (req.body?.contextHint as string) || '';

    const intentCompletion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${intentSystemPrompt}
Contexto de tela (pode usar para interpretar dias/semana/mês quando citado de forma relativa):
${contextHint}
`,
        },
        { role: 'user', content: transcript },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    let parsed: any = { intent: 'unknown', reason: 'sem resposta' };
    const content = intentCompletion.choices?.[0]?.message?.content;
    try {
      parsed = content ? JSON.parse(content) : parsed;
    } catch (err) {
      parsed = { intent: 'unknown', reason: 'parse_error' };
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


