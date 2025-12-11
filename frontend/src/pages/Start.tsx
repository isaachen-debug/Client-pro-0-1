import { useEffect, useMemo, useState } from 'react';
import { appointmentsApi } from '../services/api';
import { Appointment } from '../types';
import { differenceInMinutes, format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlayCircle, CheckCircle2, MapPin, RefreshCw, XCircle, Phone, Navigation2, ChevronRight, ChevronDown } from 'lucide-react';
import { formatDateToYMD, parseDateFromInput } from '../utils/date';
import { PageHeader, SurfaceCard, StatusBadge } from '../components/OwnerUI';
import { pageGutters } from '../styles/uiTokens';
import { useNavigate } from 'react-router-dom';

const statusLabels: Record<string, string> = {
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

const formatMinutes = (minutes: number) => {
  if (!minutes) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins ? `${mins}min` : ''}`.trim();
  }
  return `${mins}min`;
};

const workingClockColors = {
  base: '#22c55e',
  background: 'rgba(255, 255, 255, 0.12)',
  text: 'var(--text-primary)',
};

const buildMapsLink = (appointment: Appointment) => {
  const destination =
    appointment.customer.latitude && appointment.customer.longitude
      ? `${appointment.customer.latitude},${appointment.customer.longitude}`
      : appointment.customer.address;
  if (!destination) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
};

const buildWazeLink = (appointment: Appointment) => {
  const destination =
    appointment.customer.latitude && appointment.customer.longitude
      ? `${appointment.customer.latitude},${appointment.customer.longitude}`
      : appointment.customer.address;
  if (!destination) return null;
  if (appointment.customer.latitude && appointment.customer.longitude) {
    return `https://waze.com/ul?ll=${appointment.customer.latitude},${appointment.customer.longitude}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
};

const Start = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openMapId, setOpenMapId] = useState<string | null>(null);
  const usdFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    [],
  );

  useEffect(() => {
    fetchAppointments(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async (date: Date) => {
    try {
      setLoading(true);
      const data = await appointmentsApi.listByDate(formatDateToYMD(date));
      setAppointments(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os serviços do dia selecionado.');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointment = (updated: Appointment) => {
    setAppointments((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const handleStart = async (id: string) => {
    try {
      const data = await appointmentsApi.start(id);
      updateAppointment(data);
    } catch (err) {
      console.error(err);
      setError('Não foi possível iniciar este serviço.');
    }
  };

  const handleFinish = async (id: string) => {
    try {
      const data = await appointmentsApi.finish(id);
      updateAppointment(data);
    } catch (err) {
      console.error(err);
      setError('Não foi possível concluir este serviço.');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const data = await appointmentsApi.changeStatus(id, 'CANCELADO');
      updateAppointment(data);
    } catch (err) {
      console.error(err);
      setError('Não foi possível cancelar este serviço.');
    }
  };

  const summary = useMemo(() => {
    const toMinutes = (start?: string, end?: string, fallback?: number) => {
      if (!start || !end) return fallback ?? 0;
      const diff = differenceInMinutes(new Date(`1970-01-01T${end}:00`), new Date(`1970-01-01T${start}:00`));
      return Math.max(diff, fallback ?? 0);
    };

    const totalAppointmentsToday = appointments.length;
    const inProgressCount = appointments.filter((item) => item.status === 'EM_ANDAMENTO').length;
    const completedCount = appointments.filter((item) => item.status === 'CONCLUIDO').length;

    const estimatedTotalMinutes = appointments.reduce((total, item) => {
      return total + toMinutes(item.startTime, item.endTime, item.estimatedDurationMinutes ?? 0);
    }, 0);

    const workedMinutesToday = appointments.reduce((total, item) => {
      if (item.status !== 'CONCLUIDO') return total;
      return total + toMinutes(item.startTime, item.endTime, item.estimatedDurationMinutes ?? 0);
    }, 0);

    return {
      totalAppointmentsToday,
      inProgressCount,
      completedCount,
      estimatedTotalMinutes,
      workedMinutesToday,
    };
  }, [appointments]);

  const liveWorkedSeconds = useMemo(() => {
    return appointments.reduce((total, appointment) => {
      if (!appointment.startedAt) return total;
      if (appointment.status !== 'EM_ANDAMENTO' && appointment.status !== 'CONCLUIDO') return total;
      const endReference =
        appointment.status === 'CONCLUIDO' && appointment.finishedAt
          ? new Date(appointment.finishedAt).getTime()
          : now;
      const elapsed = Math.max(0, Math.floor((endReference - new Date(appointment.startedAt).getTime()) / 1000));
      return total + elapsed;
    }, 0);
  }, [appointments, now]);

  const getElapsedMinutes = (appointment: Appointment) => {
    if (!appointment.startedAt) return 0;
    if (appointment.status !== 'EM_ANDAMENTO' && appointment.status !== 'CONCLUIDO') return 0;
    const endReference =
      appointment.status === 'CONCLUIDO' && appointment.finishedAt
        ? new Date(appointment.finishedAt).getTime()
        : now;

    return Math.max(
      0,
      Math.floor((endReference - new Date(appointment.startedAt).getTime()) / 60000),
    );
  };

  const selectedDateLabel = isSameDay(selectedDate, new Date())
    ? 'Hoje'
    : isSameDay(selectedDate, addDays(new Date(), 1))
      ? 'Amanhã'
      : format(selectedDate, "dd 'de' MMMM", { locale: ptBR });
  const progressPercent = summary.totalAppointmentsToday
    ? Math.min(100, Math.round(((summary.completedCount + summary.inProgressCount * 0.4) / summary.totalAppointmentsToday) * 100))
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className={`${pageGutters} max-w-full md:max-w-6xl mx-auto`}>
      <PageHeader
        label="HOJE"
        title="Today"
        subtitle="Serviços do dia, em tempo real."
        subtitleHiddenOnMobile
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedDateLabel}</span>
            <button
              type="button"
              onClick={() => fetchAppointments(selectedDate)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
            >
              <RefreshCw size={16} />
              Atualizar
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => {
          const dateChip = addDays(new Date(), index);
          const isActive = isSameDay(dateChip, selectedDate);
          const label = isSameDay(dateChip, new Date())
            ? 'Hoje'
            : isSameDay(dateChip, addDays(new Date(), 1))
              ? 'Amanhã'
              : 'Próximos dias';
          return (
            <button
              key={dateChip.toISOString()}
              onClick={() => setSelectedDate(dateChip)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-200 hover:text-primary-600'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <SurfaceCard className="border border-red-100 bg-red-50 text-red-700">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => fetchAppointments(selectedDate)}
              className="text-sm font-semibold underline"
            >
              Tentar novamente
            </button>
          </div>
        </SurfaceCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr,0.8fr] gap-4 md:gap-5 owner-grid-tight">
        <SurfaceCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[var(--text-secondary)]">Resumo do dia</p>
              <p className="text-lg font-semibold text-[var(--text-primary)] hidden sm:block">
                Acompanhe os serviços de hoje em tempo real.
              </p>
              <p className="text-sm text-[var(--text-secondary)] hidden sm:block">
                {summary.totalAppointmentsToday} agendados · {summary.inProgressCount} em andamento · {summary.completedCount} concluídos
              </p>
            </div>
            <StatusBadge tone="primary">{selectedDateLabel}</StatusBadge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 owner-grid-tight">
                <StatCard label="Serviços hoje" subtitle="Agendados para hoje." value={summary.totalAppointmentsToday} />
                <StatCard label="Em andamento" subtitle="Já iniciados pela equipe." value={summary.inProgressCount} />
                <StatCard label="Concluídos" subtitle="Finalizados e prontos para revisar." value={summary.completedCount} />
                <StatCard label="Tempo estimado" subtitle="Soma do tempo de todos os serviços." value={formatMinutes(summary.estimatedTotalMinutes)} />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-primary)] mb-2">
              <span>Progresso</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
                aria-label={`Progresso ${progressPercent}%`}
              />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[var(--text-secondary)]">Ações</p>
              <p className="text-sm text-[var(--text-secondary)]">Gerencie o dia em um toque</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/agenda')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition"
            >
              Ver agenda completa
              <ChevronRight size={14} />
            </button>
          </div>
          <WorkingClockCard seconds={liveWorkedSeconds} />
        </SurfaceCard>
      </div>

      <SurfaceCard className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-[var(--text-secondary)]">Serviços do dia</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Organize a rota, acompanhe status e abra mapas rapidamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchAppointments(selectedDate)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-10 text-slate-500 space-y-3">
            <p className="text-lg font-semibold text-slate-900">Nenhum serviço para hoje.</p>
            <p className="text-sm">Use a Agenda para criar novos atendimentos.</p>
            <button
              type="button"
              onClick={() => navigate('/app/agenda?quick=create')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition"
            >
              Criar novo agendamento
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="border border-slate-100 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                      {appointment.customer.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {appointment.customer.serviceType ?? 'Serviço'} •{' '}
                      {format(parseDateFromInput(appointment.date), "EEEE',' dd MMM", {
                        locale: ptBR,
                      })}{' '}
                      às {appointment.startTime}
                    </p>
                  </div>
                  <StatusBadge tone={appointment.status === 'CONCLUIDO' ? 'success' : appointment.status === 'CANCELADO' ? 'error' : appointment.status === 'AGENDADO' ? 'primary' : 'warning'}>
                    {statusLabels[appointment.status] || appointment.status}
                  </StatusBadge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs sm:text-sm text-slate-600">
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                    {appointment.customer.address ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          appointment.customer.address,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {appointment.customer.address}
                      </a>
                    ) : (
                      <span>Endereço não informado</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone size={16} className="text-slate-400 flex-shrink-0" />
                    {appointment.customer.phone ? (
                      <a href={`tel:${appointment.customer.phone}`} className="text-primary-600 hover:underline">
                        {appointment.customer.phone}
                      </a>
                    ) : (
                      <span>Telefone não informado</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Horário:</span>{' '}
                    {appointment.startTime}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Valor:</span>{' '}
                    {usdFormatter.format(appointment.price)}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Duração estimada:</span>{' '}
                    {appointment.endTime
                      ? formatMinutes(
                          differenceInMinutes(
                            new Date(`1970-01-01T${appointment.endTime}:00`),
                            new Date(`1970-01-01T${appointment.startTime}:00`),
                          ),
                        )
                      : appointment.estimatedDurationMinutes
                      ? formatMinutes(appointment.estimatedDurationMinutes)
                      : '—'}
                  </div>
                </div>

                {(appointment.customer.latitude || appointment.customer.longitude || appointment.customer.address) && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setOpenMapId((prev) => (prev === appointment.id ? null : appointment.id))}
                      className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <span className="inline-flex items-center gap-2">
                        <MapPin size={16} />
                        Ver mapa e rotas
                      </span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${openMapId === appointment.id ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {openMapId === appointment.id && (
                      <div className="relative h-40 sm:h-48 rounded-2xl overflow-hidden border border-slate-100">
                    {(() => {
                      const mapsLink = buildMapsLink(appointment);
                      const wazeLink = buildWazeLink(appointment);
                      return (
                        <>
                          <div className="absolute right-3 top-3 z-10 flex gap-2">
                            {mapsLink && (
                              <button
                                type="button"
                                onClick={() => window.open(mapsLink, '_blank')}
                                    className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-white"
                              >
                                <Navigation2 size={14} /> Maps
                              </button>
                            )}
                            {wazeLink && (
                              <button
                                type="button"
                                onClick={() => window.open(wazeLink, '_blank')}
                                    className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-white"
                              >
                                <Navigation2 size={14} /> Waze
                              </button>
                            )}
                          </div>
                          <iframe
                            title={`Mapa - ${appointment.customer.name}`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            src={`https://www.google.com/maps?q=${
                              appointment.customer.latitude && appointment.customer.longitude
                                ? `${appointment.customer.latitude},${appointment.customer.longitude}`
                                : encodeURIComponent(appointment.customer.address ?? '')
                            }&z=15&output=embed`}
                            allowFullScreen
                            loading="lazy"
                          />
                          {mapsLink && (
                            <button
                              type="button"
                              onClick={() => window.open(mapsLink, '_blank')}
                              className="absolute inset-0 z-0"
                              aria-label="Abrir endereço no Maps"
                            >
                              <span className="sr-only">Abrir no Maps</span>
                            </button>
                          )}
                        </>
                      );
                    })()}
                      </div>
                    )}
                  </div>
                )}

                {appointment.status === 'EM_ANDAMENTO' && appointment.startedAt && (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    Em execução há {formatMinutes(getElapsedMinutes(appointment))}
                  </p>
                )}

                {appointment.status === 'CONCLUIDO' &&
                  appointment.startedAt &&
                  appointment.finishedAt && (
                    <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                      Tempo total: {formatMinutes(getElapsedMinutes(appointment))}
                    </p>
                  )}

                <div className="flex flex-col md:flex-row gap-3">
                  {appointment.status === 'AGENDADO' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleStart(appointment.id)}
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors text-sm font-medium"
                      >
                        <PlayCircle size={18} />
                        <span>Iniciar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(appointment.id)}
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <XCircle size={18} />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  )}
                  {appointment.status === 'EM_ANDAMENTO' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleFinish(appointment.id)}
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors text-sm font-medium"
                      >
                        <CheckCircle2 size={18} />
                        <span>Concluir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(appointment.id)}
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <XCircle size={18} />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  )}
                  {appointment.status === 'CONCLUIDO' && (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-full cursor-not-allowed text-sm font-medium"
                    >
                      <CheckCircle2 size={18} />
                      <span>Finalizado</span>
                    </button>
                  )}
                  {appointment.status === 'CANCELADO' && (
                    <span className="inline-flex items-center px-4 py-2 rounded-full bg-red-50 text-red-600 text-sm font-medium">
                      Serviço cancelado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
};

const StatCard = ({ label, subtitle, value }: { label: string; subtitle?: string; value: string | number }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">{label}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-1 hidden sm:block">{subtitle}</p>}
    <p className="text-lg font-semibold text-slate-900 mt-1">{value}</p>
  </div>
);

const WorkingClockCard = ({ seconds }: { seconds: number }) => {
  const display = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}m ${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}s`;
  const secondsProgress = seconds % 3600;
  const dashArray = 2 * Math.PI * 45;
  const dashOffset = dashArray - (secondsProgress / 3600) * dashArray;
  return (
    <div className="relative flex flex-col items-center justify-center bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Tempo trabalhado</p>
      <div className="relative w-24 h-24 sm:w-28 sm:h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="transparent" stroke={workingClockColors.background} strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            stroke={workingClockColors.base}
            strokeWidth="6"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col text-sm font-semibold text-gray-900">
          <span className="text-base">{display}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">Atualiza quando você conclui serviços</p>
    </div>
  );
};

export default Start;

