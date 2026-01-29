import { useState, useEffect } from 'react';
import {
  Users, Briefcase, XCircle, DollarSign, Wallet,
  TrendingUp, Calendar, ChevronDown, Bell
} from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { FinancialChart } from '../components/dashboard/FinancialChart';
import { pageGutters } from '../styles/uiTokens';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../services/api';
import type { DashboardOverview } from '../types';

// Dados simulados para preencher o visual "Pro" enquanto não temos histórico real no backend


const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Em um cenário real, o backend retornaria esses deltas
        const data = await dashboardApi.getMetrics();
        setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;

  return (
    <div className={`${pageGutters} max-w-7xl mx-auto pb-24`}>
      {/* Header Executivo */}
      <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            Visão Geral <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-lg">PRO</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Bem-vindo de volta, {user?.name?.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">
            <Calendar size={16} />
            <span>Este Mês</span>
            <ChevronDown size={14} />
          </button>
          <button className="p-2 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-colors">
            <Bell size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-8 animate-fade-in">

        {/* Seção 1: Indicadores de Cliente e Job (KPIs Operacionais) */}
        <div>
          <h2 className="text-sm font-bold text-purple-900 uppercase tracking-wider mb-4 opacity-70">Operacional</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Novos Clientes"
              value={metrics?.newClientsCount || 0}
              comparison={metrics?.newClientsComparison}
              icon={<Users size={20} />}
              color="blue"
            />
            <StatCard
              title="Total Clientes"
              value={metrics?.activeClientsCount || 0}
              comparison={metrics?.activeClientsComparison}
              icon={<Briefcase size={20} />}
              color="blue"
            />
            <StatCard
              title="Jobs Realizados"
              value={metrics?.scheduledServicesCount || 0}
              comparison={metrics?.scheduledServicesComparison}
              icon={<Briefcase size={20} />}
              color="purple"
            />
            <StatCard
              title="Cancelamentos"
              value={metrics?.cancellationsCount || 0}
              comparison={metrics?.cancellationsComparison}
              icon={<XCircle size={20} />}
              color="purple"
            />
          </div>
        </div>

        {/* Seção 2: Financeiro e Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-4 opacity-70">Financeiro</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <StatCard
                  title="Receita Total"
                  value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.totalRevenueMonth || 0)}
                  comparison={{ value: 'Meta', percent: 0, label: 'atualizado agora' }} // Meta comparison not yet implemented, keeping neutral
                  icon={<DollarSign size={20} />}
                  color="emerald"
                />
                <StatCard
                  title="Ticket Médio"
                  value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.averageTicket || 0)}
                  comparison={metrics?.averageTicketComparison}
                  icon={<TrendingUp size={20} />}
                  color="emerald"
                />
              </div>
              <FinancialChart data={metrics?.revenueByWeek || []} />
            </div>
          </div>

          {/* Seção 3: Lateral (Atividade e Pendências) */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 opacity-70">Atividade Recente</h2>
              <ActivityFeed items={metrics?.activityFeed || []} />
            </div>

            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-purple-200 text-xs font-bold uppercase tracking-widest">Saldo a receber</p>
                    <h3 className="text-3xl font-black mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.pendingPaymentsMonth || 0)}
                    </h3>
                  </div>
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                    <Wallet size={24} className="text-purple-300" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                    <span className="text-purple-200">Faturas em aberto</span>
                    <span className="font-bold">-</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                    <span className="text-purple-200">Atrasados (+7 dias)</span>
                    <span className="font-bold text-rose-300">-</span>
                  </div>
                </div>
                <button className="w-full mt-6 py-3 bg-white text-purple-900 font-bold rounded-xl hover:bg-purple-50 transition-colors shadow-lg">
                  Cobrar Pendentes
                </button>
              </div>

              {/* Background Decoration */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500 rounded-full blur-[60px] opacity-50"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
