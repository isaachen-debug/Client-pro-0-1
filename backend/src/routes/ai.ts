import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

router.post('/', async (req, res) => {
  const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  if (!client) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });
  }

  const { message, context, image } = req.body || {};

  if ((!message || typeof message !== 'string') && !image) {
    return res.status(400).json({ error: 'Campo "message" ou "image" é obrigatório.' });
  }

  try {
    const messages: any[] = [
      {
        role: 'system',
        content: `
Você é o Assistente IA do app CleanUp (ClientPro), especialista em identificar oportunidades de venda em ambientes.
Quando receber uma imagem, analise-a e sugira um serviço de limpeza profissional adequado.
Retorne APENAS um JSON estrito (sem markdown) no seguinte formato:
{
  "serviceName": "Nome do Serviço (ex: Limpeza de Forno)",
  "price": 120.00,
  "message": "Mensagem persuasiva e curta para o cliente",
  "confidence": 0.9
}
Se não houver imagem, aja como o assistente geral descrito anteriormente.
        `,
      },
    ];

    if (image) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Analise esta imagem e encontre oportunidades de venda.' },
          { type: 'image_url', image_url: { url: image } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      temperature: 0.35,
      max_tokens: 700,
    });

    const answer = completion.choices?.[0]?.message?.content ?? 'Não consegui gerar uma resposta agora.';

    // Try to parse JSON if it looks like one (for the vision case)
    try {
      if (answer.trim().startsWith('{')) {
        return res.json(JSON.parse(answer));
      }
    } catch (e) {
      // ignore
    }

    return res.json({ answer });
  } catch (error: any) {
    console.error('Erro no agent:', error?.response?.data || error);
    return res.status(500).json({ error: 'Falha ao consultar o agente.' });
  }
});

export default router;

