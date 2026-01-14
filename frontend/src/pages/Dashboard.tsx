import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, XCircle, DollarSign, Wallet, 
  TrendingUp, Calendar, ChevronDown, Bell 
} from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityFeed, ActivityItem } from '../components/dashboard/ActivityFeed';
import { FinancialChart } from '../components/dashboard/FinancialChart';
import { pageGutters } from '../styles/uiTokens';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Dados simulados para preencher o visual "Pro" enquanto não temos histórico real no backend
const MOCK_ACTIVITY: ActivityItem[] = [
  { id: '1', type: 'contract', title: 'Michelle assinou contrato', description: 'Plano mensal recorrente', time: '14:10', user: 'Michelle' },
  { id: '2', type: 'payment', title: 'Pagamento recebido', description: 'Limpeza residencial - Stephen B.', time: 'Ontem', amount: 'R$ 260,00' },
  { id: '3', type: 'job_completed', title: 'Serviço concluído', description: 'Team 1 finalizou na Rua Malburn', time: 'Ontem', user: 'Team 1' },
  { id: '4', type: 'invoice', title: 'Fatura enviada', description: 'Para Ani Basak (#000977)', time: 'Ontem' },
];

const MOCK_CHART_DATA = [
  { name: 'Seg', income: 4000, expense: 2400, balance: 1600 },
  { name: 'Ter', income: 3000, expense: 1398, balance: 3202 },
  { name: 'Qua', income: 2000, expense: 9800, balance: -4598 },
  { name: 'Qui', income: 2780, expense: 3908, balance: -1128 },
  { name: 'Sex', income: 1890, expense: 4800, balance: -2910 },
  { name: 'Sáb', income: 2390, expense: 3800, balance: -1410 },
  { name: 'Dom', income: 3490, expense: 4300, balance: -810 },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

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
              value={metrics?.activeClientsCount || 0} 
              comparison={{ value: 16, percent: -12.5, label: 'mês anterior' }}
              icon={<Users size={20} />}
              color="blue"
            />
            <StatCard 
              title="Total Clientes" 
              value="126" 
              comparison={{ value: 120, percent: 5, label: 'mês anterior' }}
              icon={<Briefcase size={20} />}
              color="blue"
            />
            <StatCard 
              title="Jobs Realizados" 
              value={metrics?.scheduledServicesCount || 0} 
              comparison={{ value: 105, percent: -9, label: 'mês anterior' }}
              icon={<Briefcase size={20} />}
              color="purple"
            />
            <StatCard 
              title="Cancelamentos" 
              value="4" 
              comparison={{ value: 2, percent: -50, label: 'mês anterior' }} // Negativo aqui é ruim visualmente, mas bom pro negócio. O componente trata genericamente.
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
                  comparison={{ value: 'R$ 13.5k', percent: -15.9, label: 'vs meta' }}
                  icon={<DollarSign size={20} />}
                  color="emerald"
                />
                <StatCard 
                  title="Ticket Médio" 
                  value="R$ 185" 
                  comparison={{ value: 'R$ 180', percent: 2.4, label: 'mês anterior' }}
                  icon={<TrendingUp size={20} />}
                  color="emerald"
                />
              </div>
              <FinancialChart data={MOCK_CHART_DATA} />
            </div>
          </div>

          {/* Seção 3: Lateral (Atividade e Pendências) */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 opacity-70">Atividade</h2>
              <ActivityFeed items={MOCK_ACTIVITY} />
            </div>

            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-purple-200 text-xs font-bold uppercase tracking-widest">Saldo a receber</p>
                    <h3 className="text-3xl font-black mt-1">R$ {metrics?.pendingPaymentsMonth || '0,00'}</h3>
                  </div>
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                    <Wallet size={24} className="text-purple-300" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                    <span className="text-purple-200">Faturas em aberto</span>
                    <span className="font-bold">14</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                    <span className="text-purple-200">Atrasados (+7 dias)</span>
                    <span className="font-bold text-rose-300">3</span>
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
