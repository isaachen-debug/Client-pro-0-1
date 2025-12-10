import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Clock, Calendar, BellRing, X as CloseIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { dashboardApi, transactionsApi } from '../services/api';
import { PageHeader, SurfaceCard, StatusBadge } from '../components/OwnerUI';
import { pageGutters } from '../styles/uiTokens';
import { DashboardOverview, TransactionStatus } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateFromInput } from '../utils/date';
import usePushNotifications from '../hooks/usePushNotifications';
import { useNavigate } from 'react-router-dom';

const DASHBOARD_SUMMARY_STORAGE_KEY = 'clientepro:dashboard-summary';
const DASHBOARD_UPDATE_EVENT = 'clientepro:dashboard-update';

const Dashboard = () => {
  const navigate = useNavigate();

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
    <div className={`${pageGutters} max-w-6xl mx-auto`}>
      <div className="hidden sm:block">
        <PageHeader
          title="Dashboard"
          subtitle="Resumo da sua empresa hoje."
          subtitleHiddenOnMobile
          actions={
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-2 shadow-sm text-sm font-semibold text-slate-700">
              <Calendar size={16} className="text-primary-600" />
              {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
            </div>
          }
        />
      </div>

      {shouldShowPushPrompt && (
        <SurfaceCard className="border-dashed border-slate-200 bg-white/90">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BellRing size={16} className="text-primary-600" />
                Receba lembretes no seu celular
                <button
                  type="button"
                  onClick={handleDismissPushPrompt}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Fechar lembrete de notificações"
                >
                  <CloseIcon size={16} />
                </button>
              </p>
              <p className="text-xs text-slate-500">
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
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
            >
              {pushNotifications.status === 'loading' ? 'Ativando...' : 'Ativar notificações'}
            </button>
          </div>
        </SurfaceCard>
      )}

      <div className="space-y-4 md:space-y-6">
        <SurfaceCard className="rounded-[28px] bg-gradient-to-br from-primary-50 via-white to-accent-50 border-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.3em] font-semibold text-slate-600">Receita deste mês</p>
              <p className="text-4xl font-bold leading-tight text-slate-900">{formatCurrency(data.totalRevenueMonth)}</p>
              <p className="text-sm text-slate-600">Total confirmado até agora.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/financeiro')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary-600 text-white font-semibold shadow-md hover:-translate-y-0.5 transition"
            >
              Ver financeiro
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SurfaceCard className="rounded-2xl border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Pagamentos pendentes</p>
              <p className="text-2xl font-semibold mt-2 text-slate-900">{formatCurrency(data.pendingPaymentsMonth)}</p>
              <p className="text-xs text-slate-500">À espera de confirmação neste mês.</p>
            </SurfaceCard>
            <button
              type="button"
              onClick={() => navigate('/app/clientes')}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:shadow-sm transition"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Clientes ativos</p>
              <p className="text-2xl font-semibold mt-2 text-slate-900">{data.activeClientsCount}</p>
              <p className="text-xs text-slate-500">Base atualizada.</p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/start')}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:shadow-sm transition"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Serviços (24h)</p>
              <p className="text-2xl font-semibold mt-2 text-slate-900">{data.scheduledServicesCount}</p>
              <p className="text-xs text-slate-500">Hoje e próximas 24 horas.</p>
            </button>
            <SurfaceCard className="rounded-2xl border-slate-200 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Calendar size={18} className="text-slate-700" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Hoje</p>
                <p className="text-base font-semibold text-slate-900">{data.scheduledServicesCount} serviços</p>
              </div>
            </SurfaceCard>
          </div>
        </SurfaceCard>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-4 md:gap-6">
          <SurfaceCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">Financeiro</p>
                <p className="text-lg font-semibold text-slate-900">Status rápido</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/financeiro')}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
              >
                Abrir financeiro <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Pagamentos pendentes</p>
                  <Clock size={18} className="text-amber-500" />
                </div>
                <p className="text-2xl font-bold mt-2 text-slate-900">{formatCurrency(data.pendingPaymentsMonth)}</p>
                <p className="text-xs text-slate-500 mt-1">À espera de confirmação neste mês.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Receita confirmada</p>
                  <DollarSign size={18} className="text-emerald-600" />
                </div>
                <p className="text-2xl font-bold mt-2 text-slate-900">{formatCurrency(data.totalRevenueMonth)}</p>
                <p className="text-xs text-slate-500 mt-1">Total no mês</p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">Operação de hoje</p>
                <p className="text-lg font-semibold text-slate-900">Serviços e andamento</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/start')}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
              >
                Ver Today <ChevronRight size={14} />
              </button>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Hoje você tem {data.scheduledServicesCount} serviços
                  </p>
                  <p className="text-xs text-slate-500">
                    {completedList.length} concluídos, {Math.max(data.scheduledServicesCount - completedList.length, 0)} pendentes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-semibold">Progresso</p>
                  <p className="text-lg font-bold text-primary-600">
                    {data.scheduledServicesCount ? Math.min(100, Math.round((completedList.length / data.scheduledServicesCount) * 100)) : 0}%
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{
                    width: `${data.scheduledServicesCount ? Math.min(100, Math.round((completedList.length / data.scheduledServicesCount) * 100)) : 0}%`,
                  }}
                  aria-label="Progresso de conclusão"
                />
              </div>
            </div>
            <div className="space-y-3">
              {data.upcomingAppointments.slice(0, 3).length === 0 && (
                <div className="text-sm text-slate-500 text-center py-6">
                  Nenhum serviço para hoje. Que tal criar um novo?
                </div>
              )}
              {data.upcomingAppointments.slice(0, 3).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-semibold">
                    {appointment.customer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{appointment.customer.name}</p>
                    <p className="text-xs text-slate-500">
                      {format(parseDateFromInput(appointment.date), "dd 'de' MMM", { locale: ptBR })} às {appointment.startTime}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge tone="primary">{appointment.startTime}</StatusBadge>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(appointment.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>

        <SurfaceCard>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">Receita</p>
                  <p className="text-lg font-semibold text-slate-900">Semanas do mês</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.revenueByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis
                    stroke="#94a3b8"
                    domain={[0, chartCeiling]}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  />
                  <Bar dataKey="value" fill="#22c55e" radius={[10, 10, 6, 6]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">Clientes concluídos</p>
                  <p className="text-sm text-slate-600">Últimos serviços</p>
                </div>
                <StatusBadge tone="neutral">{completedList.length}</StatusBadge>
              </div>
              <div className="space-y-3">
                {visibleCompleted.map((appointment) => {
                  const paid = appointment.transactionStatus === 'PAGO';
                  return (
                    <div
                      key={appointment.id}
                      className="rounded-2xl border border-slate-100 bg-white px-3 py-2 flex items-start gap-3 shadow-sm"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
                        {appointment.customer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{appointment.customer.name}</p>
                        <p className="text-xs text-slate-500">
                          {format(parseDateFromInput(appointment.date), "dd 'de' MMM", { locale: ptBR })} às{' '}
                          {appointment.startTime}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(appointment.price)}</p>
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
                          className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${
                            paid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          } ${!appointment.transactionId ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'} ${
                            updatingPaymentId === appointment.id ? 'opacity-70' : ''
                          }`}
                        >
                          {updatingPaymentId === appointment.id ? 'Atualizando...' : paid ? 'Pago' : 'Pendente'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {completedList.length === 0 && (
                  <div className="text-sm text-slate-500 text-center py-6">Nenhum serviço concluído recentemente</div>
                )}
              </div>
              {completedList.length > 3 && (
                <button
                  type="button"
                  onClick={() => setCompletedExpanded((prev) => !prev)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
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
        </SurfaceCard>
      </div>
    </div>
  );
};

export default Dashboard;

