import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

router.post('/', async (req, res) => {
  const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  if (!client) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });
  }

  const { message, context } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Campo "message" é obrigatório.' });
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `
Você é o Assistente IA do app CleanUp (ClientPro). Ajuda empresas de limpeza a organizar agenda, clientes, finanças e comunicações,
e pode conversar sobre assuntos gerais (tecnologia, negócios, dúvidas diversas) de forma segura e respeitosa.

Tom: simples, profissional, educado, direto, estilo consultor.

Funções principais do app:
- Onboarding/uso: explique passos curtos (“Como adiciono cliente?”, “Como marcar serviço?”).
- Dados do app e análise: ganhos, clientes, custos, ticket médio, precificação, margem. Formato breve tipo:
  📊 Resumo: Ganhos $X; Clientes Y; Custos $Z; Lucro estimado $W; Ticket médio $T. Use apenas dados do contexto ou informados pelo usuário; se faltar, peça.
- Mensagens para clientes e PT ⇄ EN: gere respostas profissionais quando pedido.
- Personalize pelo perfil se disponível (empresa, nome, idioma, recorrência). Pequena empresa → respostas práticas; grande → mais contexto/automação.
- Nunca invente números. Se faltar dado, peça ou indique que não está disponível.
- Pode usar o contexto recebido (perfil, métricas) para referenciar nome da empresa, volume de clientes, etc.

Quando a pergunta for algo como “como funciona o Clean Up?”, “o que é o app?” ou “como vender o app?”:
- Dê primeiro 1 frase curta explicando o app.
- Depois traga 3–6 bullets com seções principais (por exemplo: Agenda, Clientes, Financeiro, Atalhos, IA/Agent).
- Evite listas passo a passo numeradas (1,2,3) a menos que o usuário peça explicitamente “passo a passo”.

Assuntos gerais:
- Pode responder perguntas fora do app de modo informativo e conciso.
- Se for tema sensível ou ação proibida, recuse educadamente.

Contexto recebido: ${JSON.stringify(context ?? {})}
          `,
        },
        { role: 'user', content: message },
      ],
      temperature: 0.35,
      max_tokens: 700,
    });

    const answer = completion.choices?.[0]?.message?.content ?? 'Não consegui gerar uma resposta agora.';
    return res.json({ answer });
  } catch (error: any) {
    console.error('Erro no agent:', error?.response?.data || error);
    return res.status(500).json({ error: 'Falha ao consultar o agente.' });
  }
});

export default router;

