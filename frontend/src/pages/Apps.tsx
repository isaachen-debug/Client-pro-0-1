import { LayoutGrid, ArrowRight, Bot, Sparkles, Home } from 'lucide-react';
import { PageHeader, SurfaceCard, StatusBadge } from '../components/OwnerUI';
import { pageGutters, labelSm } from '../styles/uiTokens';

const appsList = [
  {
    title: 'Client Up (atual)',
    description: 'Versão focada em limpeza residencial com agenda, financeiro e portal.',
    status: 'Ativo',
    badgeTone: 'primary',
    icon: Home,
  },
  {
    title: 'Clean Up Agent',
    description: 'IA para responder dúvidas sobre clientes, agenda e financeiro.',
    status: 'Disponível',
    badgeTone: 'success',
    icon: Bot,
  },
  {
    title: 'Próxima vertical',
    description: 'Aplicação dedicada a outro tipo de serviço. Em breve.',
    status: 'Em breve',
    badgeTone: 'warning',
    icon: Sparkles,
  },
];

const Apps = () => {
  return (
    <div className={`${pageGutters} max-w-5xl mx-auto`}>
      <PageHeader
        label="APPS"
        title="Apps"
        subtitle="Outras versões do Client Up para diferentes serviços."
      />

      <SurfaceCard className="space-y-3">
        <p className={labelSm}>Workspace</p>
        <p className="text-sm text-slate-600">
          Gerencie as experiências disponíveis para seu time e futuros segmentos.
        </p>
      </SurfaceCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {appsList.map((app) => {
          const Icon = app.icon;
          const tone: any =
            app.badgeTone === 'primary'
              ? 'primary'
              : app.badgeTone === 'success'
                ? 'success'
                : 'warning';
          return (
            <SurfaceCard key={app.title} className="flex flex-col gap-3 hover:-translate-y-0.5 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">{app.title}</p>
                    <p className="text-sm text-slate-500">{app.description}</p>
                  </div>
                </div>
                <StatusBadge tone={tone}>{app.status}</StatusBadge>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700"
                disabled={app.status === 'Em breve'}
              >
                Abrir <ArrowRight size={14} />
              </button>
            </SurfaceCard>
          );
        })}
      </div>
    </div>
  );
};

export default Apps;

