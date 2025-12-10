import { Building2, Grid, UserPlus2, Users, Wallet, ArrowRight, AppWindow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PageHeader, SurfaceCard } from '../components/OwnerUI';
import { pageGutters } from '../styles/uiTokens';
import { dashboardApi } from '../services/api';
import type { DashboardOverview } from '../types';

const exploreCards = [
  {
    title: 'Clientes',
    description: 'Veja e gerencie sua base de clientes.',
    icon: Users,
    action: '/app/clientes',
    metricKey: 'clientes',
  },
  {
    title: 'Financeiro',
    description: 'Receitas, pendências e visão geral.',
    icon: Wallet,
    action: '/app/financeiro',
  },
  {
    title: 'Empresa',
    description: 'Branding, dados oficiais e links.',
    icon: Building2,
    action: '/app/empresa',
  },
  {
    title: 'Equipe',
    description: 'Helpers, permissões e convites.',
    icon: UserPlus2,
    action: '/app/team',
  },
];

const Explore = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await dashboardApi.getMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Erro ao carregar métricas do dashboard', err);
      }
    };
    loadMetrics();
  }, []);

  return (
    <div className={`${pageGutters} max-w-full md:max-w-6xl mx-auto`}>
      <PageHeader
        label="EXPLORE"
        title="Hub da operação"
        subtitle="Acesse rápido clientes, financeiro, empresa e equipe."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-4 owner-grid-tight">
        {exploreCards.map((card) => {
          const Icon = card.icon;
          const metric =
            card.metricKey === 'clientes'
              ? metrics?.activeClientsCount
              : card.metricKey === 'financeiro'
              ? metrics?.pendingPaymentsMonth
              : undefined;
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => navigate(card.action)}
              className="text-left rounded-2xl border border-slate-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] p-4 md:p-5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Icon size={22} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-lg font-semibold text-slate-900">{card.title}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">{card.description}</p>
                    {metric !== undefined && (
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary-700">
                        {card.metricKey === 'financeiro'
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(metric)
                          : metric}
                        {card.metricKey === 'clientes' && <span className="text-xs font-medium text-slate-500">(ativos)</span>}
                      </p>
                    )}
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 mt-1" />
              </div>
            </button>
          );
        })}
      </div>

      <SurfaceCard className="mt-4 bg-gradient-to-br from-surface-50 via-white to-surface-100 border-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
              <Grid size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Atalhos rápidos</p>
              <p className="text-xs text-slate-500">Abra clientes, financeiro ou equipe com um toque.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/app/clientes')}
              className="px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition"
            >
              Abrir clientes
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/plans')}
              className="px-4 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              Plans & Billing
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 owner-grid-tight">
          {[
            { label: 'Clientes', icon: Users, path: '/app/clientes' },
            { label: 'Financeiro', icon: Wallet, path: '/app/financeiro' },
            { label: 'Empresa', icon: Building2, path: '/app/empresa' },
            { label: 'Equipe', icon: UserPlus2, path: '/app/team' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.path)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left hover:border-primary-200 hover:-translate-y-0.5 transition shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-2">
                  <Icon size={18} />
                </div>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard className="bg-gradient-to-r from-[#1f1432] via-[#1b1835] to-[#0e2a20] text-white border-transparent shadow-[0_22px_55px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
              <AppWindow size={20} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/70 font-semibold">Clean Up Agent</p>
              <p className="text-lg font-semibold">Use IA para responder dúvidas sobre sua operação.</p>
              <p className="text-sm text-white/80">Acesse o Agent pelo botão no topo, em qualquer tela.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/start')}
            className="px-4 py-2 rounded-full bg-white text-slate-900 font-semibold text-sm hover:translate-y-[-1px] transition"
          >
            Ver Today
          </button>
        </div>
      </SurfaceCard>
    </div>
  );
};

export default Explore;

