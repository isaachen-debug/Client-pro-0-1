import { BookOpen, Clock, Shield, Smartphone } from 'lucide-react';
import { PageHeader, SurfaceCard, StatusBadge } from '../components/OwnerUI';
import { pageGutters, labelSm } from '../styles/uiTokens';

const helperLinks = [
  {
    title: 'Onboarding rápido',
    description: 'Passo a passo para novas helpers começarem no app.',
    icon: BookOpen,
  },
  {
    title: 'Checklists de rota',
    description: 'Liste o que cada visita precisa ter antes de sair.',
    icon: Clock,
  },
  {
    title: 'Segurança e boas práticas',
    description: 'Orientações de atendimento, conduta e equipamentos.',
    icon: Shield,
  },
  {
    title: 'App das helpers',
    description: 'Como acessar, atualizar status e falar com o time.',
    icon: Smartphone,
  },
];

const HelperResources = () => {
  return (
    <div className={`${pageGutters} max-w-5xl mx-auto`}>
      <PageHeader
        label="HELPER RESOURCES"
        title="Helper resources"
        subtitle="Material e guias rápidos para sua equipe."
      />

      <SurfaceCard className="space-y-3">
        <div className="flex items-center gap-2">
          <StatusBadge tone="primary">Em breve conteúdo adicional</StatusBadge>
          <p className="text-sm text-slate-600">Central dedicada para o time.</p>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {helperLinks.map((item) => {
          const Icon = item.icon;
          return (
            <SurfaceCard key={item.title} className="flex items-start gap-3 hover:-translate-y-0.5 transition">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Icon size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
            </SurfaceCard>
          );
        })}
      </div>
    </div>
  );
};

export default HelperResources;

