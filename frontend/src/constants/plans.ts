export type PlanId = 'free' | 'basic' | 'pro' | 'scale';

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceCents: number;
  maxClients: number | null;
  maxHelpers: number | null;
  clientPortal: boolean;
  notifications: boolean;
  description: string;
};

export const plans: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    priceCents: 0,
    maxClients: 10,
    maxHelpers: 0,
    clientPortal: false,
    notifications: false,
    description: 'Ideal para começar: até 10 clientes, sem helpers.',
  },
  {
    id: 'basic',
    name: 'Basic',
    priceCents: 1900,
    maxClients: 40,
    maxHelpers: 0,
    clientPortal: false,
    notifications: false,
    description: 'Escalone a base de clientes sem helpers dedicados.',
  },
  {
    id: 'pro',
    name: 'Pro',
    priceCents: 3900,
    maxClients: 150,
    maxHelpers: 3,
    clientPortal: true,
    notifications: true,
    description: 'Para equipes pequenas com portal do cliente e notificações.',
  },
  {
    id: 'scale',
    name: 'Scale',
    priceCents: 6900,
    maxClients: null,
    maxHelpers: 10,
    clientPortal: true,
    notifications: true,
    description: 'Limites altos e equipe maior; fale com vendas.',
  },
];

export const formatPrice = (priceCents: number) => {
  if (priceCents === 0) return 'Free';
  return (priceCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export const planFeatures = {
  maxClientsLabel: (plan: PlanDefinition) => (plan.maxClients ? `${plan.maxClients} clientes` : 'Ilimitado'),
  maxHelpersLabel: (plan: PlanDefinition) => (plan.maxHelpers === null ? 'Ilimitado' : `${plan.maxHelpers} helpers`),
};

export const localPlanStorageKey = 'clientup:current-plan';

