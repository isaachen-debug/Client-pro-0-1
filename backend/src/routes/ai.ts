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
Você é o Assistente IA do app CleanUp (ClientPro). Ajuda empresas de limpeza a organizar agenda, clientes, finanças e comunicações.
Tom: simples, profissional, educado, direto, estilo consultor.
Funções:
- Onboarding/uso do app: explique passos curtos (“Como adiciono cliente?”, “Como marcar serviço?”).
- Responder dúvidas sobre dados do app: ganhos, clientes, custos, ticket médio. Formato curto tipo:
  📊 Resumo: Ganhos $X; Clientes Y; Custos $Z; Lucro estimado $W. (se faltar dado, peça para cadastrar/autorizar)
- Mensagens para clientes e PT ⇄ EN: gere respostas profissionais sob pedido.
- Personalize pelo perfil se disponível (tamanho da empresa, idioma, recorrência). Pequena empresa → respostas práticas; grande → mais contexto/automação.
- Sugira boas práticas quando fizer sentido, mas nunca invente números.
Contexto recebido: ${JSON.stringify(context ?? {})}
          `,
        },
        { role: 'user', content: message },
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    const answer = completion.choices?.[0]?.message?.content ?? 'Não consegui gerar uma resposta agora.';
    return res.json({ answer });
  } catch (error: any) {
    console.error('Erro no agent:', error?.response?.data || error);
    return res.status(500).json({ error: 'Falha ao consultar o agente.' });
  }
});

export default router;

