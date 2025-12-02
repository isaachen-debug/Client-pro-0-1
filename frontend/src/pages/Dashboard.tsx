import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Clock, Users, Calendar, BellRing } from 'lucide-react';
import { dashboardApi } from '../services/api';
import { DashboardOverview } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateFromInput } from '../utils/date';
import usePushNotifications from '../hooks/usePushNotifications';

const Dashboard = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const pushNotifications = usePushNotifications();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardApi.getMetrics();
      setData(response);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const revenueValues = data?.revenueByWeek?.map((week) => week.value) ?? [];
  const maxRevenueValue =
    revenueValues.length > 0 ? Math.max(...revenueValues) : 0;
  const chartBase = 800;
  const chartMaxTarget = Math.max(data?.totalRevenueMonth ?? 0, maxRevenueValue, chartBase);
  const chartCeiling = Math.ceil(chartMaxTarget / 100) * 100 || chartBase;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">Overview</p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {pushNotifications.status !== 'enabled' && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-4 sm:p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BellRing size={16} className="text-primary-600" />
              Receba lembretes no seu celular
            </p>
            <p className="text-xs text-gray-500">
              Avisaremos um dia antes das limpezas para confirmar Clients e orientar Partners.
            </p>
            {pushNotifications.status === 'unsupported' && (
              <p className="text-xs text-red-500 mt-1">
                O navegador atual não suporta notificações push. Tente usar o Chrome/Edge.
              </p>
            )}
            {pushNotifications.status === 'denied' && (
              <p className="text-xs text-amber-600 mt-1">
                Você bloqueou notificações. Reative nas configurações do navegador e tente novamente.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={pushNotifications.enable}
            disabled={pushNotifications.status === 'loading'}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50"
          >
            {pushNotifications.status === 'loading' ? 'Ativando...' : 'Ativar notificações'}
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total de Ganhos */}
        <div className="bg-gradient-to-br from-[#e8fff5] via-white to-white rounded-2xl shadow-md border border-green-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">Receita do mês</span>
            <div className="p-2 bg-white rounded-xl border border-green-100 shadow-sm">
              <DollarSign size={18} className="text-green-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">
              R$ {data.totalRevenueMonth.toFixed(2)}
            </h2>
            <p className="text-xs text-gray-500">Receita confirmada</p>
          </div>
        </div>

        {/* Pagamentos Pendentes */}
        <div className="bg-gradient-to-br from-[#fff3e6] via-white to-white rounded-2xl shadow-md border border-orange-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">Pagamentos Pendentes</span>
            <div className="p-2 bg-white rounded-xl border border-orange-100 shadow-sm">
              <Clock size={18} className="text-orange-500" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">
              R$ {data.pendingPaymentsMonth.toFixed(2)}
            </h2>
            <p className="text-xs text-gray-500">Aguardando confirmação</p>
          </div>
        </div>

        {/* Clientes Ativos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">Clientes Ativos</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-gray-900">
              {data.activeClientsCount}
            </h2>
            <p className="text-sm text-gray-500">Clientes ativos na base</p>
          </div>
        </div>

        {/* Serviços Agendados */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Serviços agendados</span>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Calendar size={20} className="text-purple-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-gray-900">
              {data.scheduledServicesCount}
            </h2>
            <p className="text-sm text-gray-500">Serviços previstos para hoje</p>
          </div>
        </div>
      </div>

      {/* Charts and Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Gráfico */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Receita semanal do mês</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.revenueByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" stroke="#6b7280" />
              <YAxis
                stroke="#6b7280"
                domain={[0, chartCeiling]}
                tickFormatter={(value) =>
                  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Ganhos']}
              />
              <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Próximos Agendamentos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Próximos Agendamentos</h3>
          <p className="text-sm text-gray-500 mb-4">
            Você tem {data.upcomingAppointments.length} agendamentos futuros.
          </p>
          <div className="space-y-4">
            {data.upcomingAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">
                    {appointment.customer.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {appointment.customer.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(parseDateFromInput(appointment.date), "dd 'de' MMM", { locale: ptBR })} às{' '}
                    {appointment.startTime}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    R$ {appointment.price.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {data.upcomingAppointments.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhum agendamento futuro
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

