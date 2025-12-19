import { useEffect, useState } from 'react';
import { Users, CalendarDays, DollarSign, Search, PlusCircle, ShieldCheck, ArrowRight, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pageGutters } from '../styles/uiTokens';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../services/api';
import type { DashboardOverview } from '../types';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const greeting = user?.name ? `Olá, ${user.name}` : 'Olá';
  const [metrics, setMetrics] = useState<DashboardOverview | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const numberFormatter = new Intl.NumberFormat('pt-BR');
  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await dashboardApi.getMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Erro ao carregar métricas do dashboard', error);
      } finally {
        setLoadingMetrics(false);
      }
    };
    loadMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f9fc]">
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 text-gray-900 pb-8 pt-4">
        <div className={`${pageGutters} flex items-center justify-between`}>
          <div>
            <h1 className="text-3xl font-bold leading-tight text-slate-900">{greeting}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full text-sm font-semibold border border-slate-200 shadow-sm">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold shadow-sm">
                ☀
              </span>
              <span className="text-slate-800">Hoje · {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-800 font-semibold shadow-sm">
              🙂
            </div>
          </div>
        </div>
      </div>

      <div className={`${pageGutters} -mt-10 space-y-5 pb-16`}>
        <div className="rounded-3xl border border-emerald-100 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] p-4 md:p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck size={24} />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-slate-900">Você tem 3 serviços hoje.</p>
            <p className="text-sm text-slate-600">Confirme horários ou crie um novo agendamento.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/semana')}
            className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition"
            aria-label="Ir para agenda de hoje"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Clientes ativos',
              value: loadingMetrics ? '...' : numberFormatter.format(metrics?.activeClientsCount ?? 0),
              help: 'Base atualizada',
              icon: Users,
              tone: 'text-primary-600',
            },
            {
              label: 'Serviços na semana',
              value: loadingMetrics ? '...' : numberFormatter.format(metrics?.scheduledServicesCount ?? 0),
              help: 'Próximos 7 dias',
              icon: CalendarDays,
              tone: 'text-amber-500',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-3xl border border-slate-100 bg-white px-4 py-4 shadow-sm flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <Icon size={18} className={item.tone} />
                  <span>{item.label}</span>
                </div>
                <div className="text-3xl font-bold text-slate-900">{item.value}</div>
                <p className="text-sm text-slate-500">{item.help}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1">
          <div className="rounded-3xl border border-slate-100 bg-white px-4 py-4 shadow-sm flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <DollarSign size={18} className="text-emerald-600" />
              <span>Pagamentos pendentes</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {loadingMetrics ? '...' : currencyFormatter.format(metrics?.pendingPaymentsMonth ?? 0)}
            </div>
            <p className="text-sm text-slate-500">Aguardando confirmação</p>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 text-white px-4 py-4 md:py-5 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <MessageCircle size={24} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold uppercase tracking-wide text-white/90">WhatsApp · IA</p>
              <p className="text-lg font-semibold leading-tight">Acesse seus agendamentos direto no WhatsApp</p>
              <p className="text-sm text-white/85">Vamos abrir um chat com IA para consultar clientes e horários.</p>
            </div>
          </div>
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-white text-emerald-700 px-4 py-2 font-semibold shadow hover:bg-white/90 transition"
          >
            Abrir WhatsApp
          </a>
        </div>
      </div>

      <button
        type="button"
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-200 flex items-center justify-center hover:bg-primary-600 transition"
        aria-label="Buscar"
      >
        <Search size={22} />
      </button>

      <button
        type="button"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-200 flex items-center justify-center hover:bg-primary-600 transition"
        aria-label="Criar"
      >
        <PlusCircle size={26} />
      </button>
    </div>
  );
};

export default Home;

