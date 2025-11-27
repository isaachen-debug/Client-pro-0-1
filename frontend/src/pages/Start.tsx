import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { appointmentsApi } from '../services/api';
import { Appointment } from '../types';
import { differenceInMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlayCircle, CheckCircle2, Clock4, MapPin, RefreshCw, XCircle, Phone } from 'lucide-react';
import { parseDateFromInput } from '../utils/date';

const statusStyles: Record<string, string> = {
  AGENDADO: 'bg-gray-100 text-gray-700',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

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

const Start = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentsApi.listToday();
      setAppointments(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os serviços de hoje.');
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

  const getElapsedMinutes = (appointment: Appointment) => {
    if (!appointment.startedAt) return 0;
    const endReference =
      appointment.status === 'CONCLUIDO' && appointment.finishedAt
        ? new Date(appointment.finishedAt).getTime()
        : now;

    return Math.max(
      0,
      Math.floor((endReference - new Date(appointment.startedAt).getTime()) / 60000),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-8">
      <div>
        <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">
          Today
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Today
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-2 max-w-2xl">
          Veja os serviços marcados para hoje, inicie as limpezas e acompanhe seu
          progresso em tempo real.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <SummaryCard
          title="Serviços hoje"
          value={summary.totalAppointmentsToday}
          icon={<Clock4 className="text-primary-600" size={20} />}
        />
        <SummaryCard
          title="Em andamento"
          value={summary.inProgressCount}
          icon={<PlayCircle className="text-blue-600" size={20} />}
        />
        <SummaryCard
          title="Concluídos"
          value={summary.completedCount}
          icon={<CheckCircle2 className="text-green-600" size={20} />}
        />
        <SummaryCard
          title="Tempo estimado"
          value={formatMinutes(summary.estimatedTotalMinutes)}
          icon={<Clock4 className="text-gray-600" size={20} />}
        />
        <SummaryCard
          title="Tempo trabalhado"
          value={formatMinutes(summary.workedMinutesToday)}
          icon={<CheckCircle2 className="text-emerald-600" size={20} />}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Serviços de hoje
            </h2>
            <p className="text-sm text-gray-500">
              Organize sua rota e acompanhe o status de cada atendimento.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchAppointments}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <RefreshCw size={16} />
            <span>Atualizar</span>
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Nenhum serviço agendado para hoje.
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {appointment.customer.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {appointment.customer.serviceType ?? 'Serviço'} •{' '}
                      {format(parseDateFromInput(appointment.date), "EEEE',' dd MMM", {
                        locale: ptBR,
                      })}{' '}
                      às {appointment.startTime}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      statusStyles[appointment.status] || statusStyles.AGENDADO
                    }`}
                  >
                    {statusLabels[appointment.status] || appointment.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} className="text-gray-400 flex-shrink-0" />
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
                    <Phone size={16} className="text-gray-400 flex-shrink-0" />
                    {appointment.customer.phone ? (
                      <a href={`tel:${appointment.customer.phone}`} className="text-primary-600 hover:underline">
                        {appointment.customer.phone}
                      </a>
                    ) : (
                      <span>Telefone não informado</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Horário:</span>{' '}
                    {appointment.startTime}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Valor:</span> R${' '}
                    {appointment.price.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Duração estimada:</span>{' '}
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

                {appointment.status === 'EM_ANDAMENTO' && appointment.startedAt && (
                  <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                    Em execução há {formatMinutes(getElapsedMinutes(appointment))}
                  </p>
                )}

                {appointment.status === 'CONCLUIDO' &&
                  appointment.startedAt &&
                  appointment.finishedAt && (
                    <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                      Tempo total: {formatMinutes(getElapsedMinutes(appointment))}
                    </p>
                  )}

                <div className="flex flex-col md:flex-row gap-3">
                  {appointment.status === 'AGENDADO' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleStart(appointment.id)}
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                      >
                        <PlayCircle size={18} />
                        <span>Iniciar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(appointment.id)}
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
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
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <CheckCircle2 size={18} />
                        <span>Concluir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(appointment.id)}
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
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
                      className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed text-sm font-medium"
                    >
                      <CheckCircle2 size={18} />
                      <span>Finalizado</span>
                    </button>
                  )}
                  {appointment.status === 'CANCELADO' && (
                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
                      Serviço cancelado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

type SummaryCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
};

const SummaryCard = ({ title, value, icon }: SummaryCardProps) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 flex items-center space-x-4 shadow-sm">
    <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export default Start;

