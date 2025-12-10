import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

type Template = {
  id: string;
  label: string;
  category: 'lembrete' | 'confirmacao' | 'cobranca';
  body: string;
  variables: string[];
};

const templates: Template[] = [
  {
    id: 'lembrete-1',
    label: 'Lembrete de agendamento',
    category: 'lembrete',
    variables: ['cliente', 'data', 'hora', 'servico'],
    body: 'Olá {{cliente}}, lembrando do seu atendimento de {{servico}} em {{data}} às {{hora}}. Qualquer ajuste, me avise aqui. Obrigado!',
  },
  {
    id: 'confirmacao-1',
    label: 'Confirmação de agendamento',
    category: 'confirmacao',
    variables: ['cliente', 'data', 'hora', 'servico'],
    body: 'Oi {{cliente}}! Seu atendimento de {{servico}} está confirmado para {{data}} às {{hora}}. Estaremos no local combinado. Até lá!',
  },
  {
    id: 'cobranca-1',
    label: 'Cobrança/Link de pagamento',
    category: 'cobranca',
    variables: ['cliente', 'valor', 'link'],
    body: 'Olá {{cliente}}, segue o link para pagamento do serviço: {{link}}. Valor: {{valor}}. Qualquer dúvida, estou à disposição.',
  },
];

router.get('/', (_req, res) => {
  res.json({ items: templates });
});

export default router;


