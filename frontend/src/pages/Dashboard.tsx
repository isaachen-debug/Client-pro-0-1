import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Clock, Users, Calendar, BellRing, X as CloseIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { dashboardApi, transactionsApi } from '../services/api';
import { DashboardOverview, TransactionStatus } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateFromInput } from '../utils/date';
import usePushNotifications from '../hooks/usePushNotifications';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '../contexts/PreferencesContext';

const DASHBOARD_SUMMARY_STORAGE_KEY = 'clientepro:dashboard-summary';
const DASHBOARD_UPDATE_EVENT = 'clientepro:dashboard-update';

const Dashboard = () => {
  const navigate = useNavigate();
  const { theme } = usePreferences();
  const isDarkTheme = theme === 'dark';
  const heroContainerClass = isDarkTheme
    ? 'bg-[#05070c] text-white rounded-3xl shadow-[0_30px_90px_rgba(3,5,12,0.6)] border border-white/10'
    : 'bg-white text-gray-900 rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.08)] border border-gray-100';
  const heroLabelClass = isDarkTheme ? 'text-white/60' : 'text-gray-500';
  const heroValueClass = isDarkTheme ? 'text-white' : 'text-gray-900';
  const heroChipClass = isDarkTheme
    ? 'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70'
    : 'inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600';
  const smallCardContainer = isDarkTheme
    ? 'rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between hover:bg-white/10 transition cursor-pointer'
    : 'rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition cursor-pointer';
  const smallCardIcon = isDarkTheme ? 'w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center' : 'w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center';

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const pushNotifications = usePushNotifications();
  const [pushPromptDismissed, setPushPromptDismissed] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('clientepro:pushPromptDismissed');
    if (stored === 'true') {
      setPushPromptDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (pushNotifications.status === 'enabled') {
      setPushPromptDismissed(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('clientepro:pushPromptDismissed', 'true');
      }
    }
  }, [pushNotifications.status]);

  const shouldShowPushPrompt = pushNotifications.status !== 'enabled' && !pushPromptDismissed;

  const handleDismissPushPrompt = () => {
    setPushPromptDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('clientepro:pushPromptDismissed', 'true');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardApi.getMetrics();
      setData(response);
      const snapshot = {
        activeClientsCount: response.activeClientsCount,
        scheduledServicesCount: response.scheduledServicesCount,
        totalRevenueMonth: response.totalRevenueMonth,
        pendingPaymentsMonth: response.pendingPaymentsMonth,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(DASHBOARD_SUMMARY_STORAGE_KEY, JSON.stringify(snapshot));
        window.dispatchEvent(new CustomEvent(DASHBOARD_UPDATE_EVENT, { detail: snapshot }));
      }
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
  const formatCurrency = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const completedList = data?.recentCompletedAppointments ?? [];
  const visibleCompleted = completedExpanded ? completedList : completedList.slice(0, 3);

  const handleToggleCompletedPayment = async (
    appointmentId: string,
    transactionId: string | null,
    currentStatus: TransactionStatus,
  ) => {
    if (!transactionId) {
      alert('Não há cobrança vinculada a este serviço.');
      return;
    }
    const nextStatus: TransactionStatus = currentStatus === 'PAGO' ? 'PENDENTE' : 'PAGO';
    try {
      setUpdatingPaymentId(appointmentId);
      await transactionsApi.updateStatus(transactionId, nextStatus);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recentCompletedAppointments: prev.recentCompletedAppointments.map((item) =>
            item.id === appointmentId ? { ...item, transactionStatus: nextStatus } : item,
          ),
        };
      });
    } catch (error) {
      console.error('Erro ao atualizar status do pagamento:', error);
      alert('Não foi possível atualizar o status. Tente novamente.');
    } finally {
      setUpdatingPaymentId(null);
    }
  };

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
      {shouldShowPushPrompt && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-4 sm:p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BellRing size={16} className="text-primary-600" />
              Receba lembretes no seu celular
              <button
                type="button"
                onClick={handleDismissPushPrompt}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fechar lembrete de notificações"
              >
                <CloseIcon size={16} />
              </button>
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

      {/* Hero Stats */}
      <div className="relative mt-1 sm:mt-2 md:mt-4">
        <div
          className={`${heroContainerClass} p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 border border-gray-100 rounded-[24px] sm:rounded-[28px] md:rounded-[36px] shadow-[0_20px_60px_rgba(15,23,42,0.05)]`}
        >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={`text-[10px] uppercase tracking-[0.4em] ${isDarkTheme ? 'text-emerald-200' : 'text-emerald-600'}`}>Overview</p>
            <h2 className={`text-2xl md:text-3xl font-bold ${heroValueClass}`}>Dashboard</h2>
            <p className={`text-sm ${heroLabelClass}`}>Resumo das operações do mês</p>
          </div>
          <div className={heroChipClass}>
            <Calendar size={16} />
            {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-[0.65fr,0.35fr]">
          <div className="rounded-[20px] sm:rounded-[24px] bg-gradient-to-br from-emerald-500 via-emerald-400 to-emerald-300 text-gray-900 p-3 sm:p-4 md:p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide">Receita do mês</span>
              <div className="w-10 h-10 rounded-2xl bg-white/40 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold mt-4">{formatCurrency(data.totalRevenueMonth)}</p>
            <p className="text-sm text-gray-900/70">Receita confirmada até o momento.</p>
          </div>
          <div className="rounded-xl border-l-4 border-purple-300 bg-white text-gray-900 p-3 sm:p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide">Pagamentos pendentes</span>
              <Clock size={20} className="text-purple-500" />
            </div>
            <p className="text-3xl font-bold mt-4">{formatCurrency(data.pendingPaymentsMonth)}</p>
            <p className="text-sm text-gray-600">Aguardando confirmação no mês atual.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <button
            type="button"
            onClick={() => navigate('/app/clientes')}
            className={`${smallCardContainer} md:rounded-[20px]`}
          >
            <div className="text-left">
              <p className={`text-[11px] uppercase tracking-wide ${heroLabelClass}`}>Clientes ativos</p>
              <p className={`text-2xl font-bold ${heroValueClass}`}>{data.activeClientsCount}</p>
              <p className={`text-[11px] ${heroLabelClass}`}>Base atualizada</p>
            </div>
            <div className={smallCardIcon}>
              <Users size={18} className={heroValueClass} />
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/agenda')}
            className={`${smallCardContainer} md:border-l-4 md:border-emerald-200 md:bg-white`}
          >
            <div className="text-left">
              <p className={`text-[11px] uppercase tracking-wide ${heroLabelClass}`}>Serviços agendados</p>
              <p className={`text-2xl font-bold ${heroValueClass}`}>{data.scheduledServicesCount}</p>
              <p className={`text-[11px] ${heroLabelClass}`}>Próximas 24 horas</p>
            </div>
            <div className={smallCardIcon}>
              <Calendar size={18} className={heroValueClass} />
            </div>
          </button>
        </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/start')}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-emerald-700 text-white px-4 py-4 sm:py-5 flex items-center justify-between shadow-[0_20px_50px_rgba(15,23,42,0.18)] border border-white/10 hover:translate-y-[-2px] transition-transform"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/70 font-semibold">Today</p>
            <p className="text-lg sm:text-xl font-semibold">Check your routes & helpers for today</p>
            <p className="text-sm text-white/80">See who is on the field right now.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            Open
            <ChevronRight size={16} />
          </div>
        </button>
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
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              />
              <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Próximos Agendamentos */}
        <div className="space-y-4">
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
                      {formatCurrency(appointment.price)}
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

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Clientes concluídos</h3>
            <p className="text-sm text-gray-500 mb-4">
              Você finalizou {completedList.length} serviços recentes.
            </p>
            <div className="space-y-4">
              {visibleCompleted.map((appointment) => {
                const paid = appointment.transactionStatus === 'PAGO';
                const statusClass = paid
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100';
                return (
                  <div key={appointment.id} className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gray-900/5 text-gray-900 rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                      {appointment.customer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{appointment.customer.name}</p>
                      <p className="text-xs text-gray-500">
                        {format(parseDateFromInput(appointment.date), "dd 'de' MMM", { locale: ptBR })} às{' '}
                        {appointment.startTime}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(appointment.price)}</p>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleCompletedPayment(
                            appointment.id,
                            appointment.transactionId,
                            appointment.transactionStatus,
                          )
                        }
                        disabled={!appointment.transactionId || updatingPaymentId === appointment.id}
                        className={`text-[11px] font-semibold px-3 py-1 rounded-full transition ${
                          statusClass
                        } ${
                          !appointment.transactionId
                            ? 'opacity-60 cursor-not-allowed'
                            : 'hover:shadow-md cursor-pointer'
                        } ${updatingPaymentId === appointment.id ? 'opacity-70' : ''}`}
                      >
                        {updatingPaymentId === appointment.id ? 'Atualizando...' : paid ? 'Pago' : 'Pendente'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {completedList.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  Nenhum serviço concluído recentemente
                </p>
              )}
            </div>
            {completedList.length > 3 && (
              <button
                type="button"
                onClick={() => setCompletedExpanded((prev) => !prev)}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                {completedExpanded ? 'Mostrar menos' : 'Ver todos'}
                <ChevronDown
                  size={16}
                  className={`transition-transform ${completedExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

