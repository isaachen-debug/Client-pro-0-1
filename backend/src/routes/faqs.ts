import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

type Faq = { id: string; question: string; answer: string; tags?: string[] };

const faqs: Faq[] = [
  {
    id: 'agenda-horarios',
    question: 'Como marcar um atendimento?',
    answer: 'Vá em Agenda > Novo agendamento, selecione cliente, data, horário e valor. Salve para registrar.',
    tags: ['agenda', 'agendamento'],
  },
  {
    id: 'cobrancas',
    question: 'Como ver cobranças pendentes?',
    answer: 'Abra Financeiro para ver pendências/pagas. No dashboard você vê o resumo rápido do mês.',
    tags: ['financeiro', 'cobrancas'],
  },
  {
    id: 'clientes',
    question: 'Como adicionar clientes?',
    answer: 'Em Clientes, clique em Adicionar e preencha nome, contato e endereço (opcional).',
    tags: ['clientes', 'cadastro'],
  },
  {
    id: 'mensagens',
    question: 'Como enviar lembretes?',
    answer: 'Use o Agent para gerar o texto e envie pelo seu canal (WhatsApp/email). Integrações diretas podem ser ativadas depois.',
    tags: ['mensagens', 'lembretes'],
  },
];

router.get('/', (_req, res) => {
  res.json({ items: faqs });
});

export default router;


