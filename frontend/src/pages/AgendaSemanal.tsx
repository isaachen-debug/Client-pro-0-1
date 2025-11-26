import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { appointmentsApi } from '../services/api';
import { Appointment, AppointmentStatus } from '../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const AgendaSemanal = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');

  useEffect(() => {
    fetchAgendamentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const fetchAgendamentos = async () => {
    try {
      const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 0 });
      const data = await appointmentsApi.listByWeek(weekStartDate.toISOString().split('T')[0]);
      setAgendamentos(data);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    try {
      const wantsInvoice =
        newStatus === 'CONCLUIDO' &&
        window.confirm('Deseja enviar a cobrança por e-mail/copiar o link da fatura agora?');
      const updated = await appointmentsApi.changeStatus(
        id,
        newStatus,
        wantsInvoice ? { sendInvoice: true } : undefined,
      );
      if (wantsInvoice && updated.invoiceUrl) {
        try {
          await navigator.clipboard.writeText(updated.invoiceUrl);
          alert('Link da fatura copiado para a área de transferência.');
        } catch {
          alert(`Link da fatura: ${updated.invoiceUrl}`);
        }
      }
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  );

  const getAgendamentosForDay = (day: Date) => {
    let filtered = agendamentos.filter((ag) => isSameDay(new Date(ag.date), day));
    
    if (filter !== 'todos') {
      filtered = filtered.filter((ag) => ag.status === filter);
    }
    
    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return '#3b82f6';
      case 'EM_ANDAMENTO':
        return '#2563eb';
      case 'CONCLUIDO':
        return '#22c55e';
      case 'CANCELADO':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const statusLabels: Record<AppointmentStatus, string> = {
    AGENDADO: 'Agendado',
    EM_ANDAMENTO: 'Em andamento',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Cancelado',
  };

  const statusColors: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-blue-100 text-blue-700',
    EM_ANDAMENTO: 'bg-indigo-100 text-indigo-700',
    CONCLUIDO: 'bg-green-100 text-green-700',
    CANCELADO: 'bg-red-100 text-red-700',
  };

  const getStatusBadge = (status: AppointmentStatus) => (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Agenda Semanal</h1>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Semana Atual
            </button>
            <button
              onClick={() => setCurrentDate(addWeeks(new Date(), 1))}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Próxima Semana
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
              {format(weekStart, 'dd MMM', { locale: ptBR })} - {format(weekEnd, 'dd MMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('todos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'todos'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('AGENDADO')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'AGENDADO'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Agendado
          </button>
          <button
            onClick={() => setFilter('EM_ANDAMENTO')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'EM_ANDAMENTO'
                ? 'bg-indigo-500 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Em andamento
          </button>
          <button
            onClick={() => setFilter('CONCLUIDO')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'CONCLUIDO'
                ? 'bg-green-500 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            Concluído
          </button>
          <button
            onClick={() => setFilter('CANCELADO')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'CANCELADO'
                ? 'bg-red-500 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Cancelado
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayAgendamentos = getAgendamentosForDay(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={day.toString()}
              className={`bg-white rounded-xl shadow-sm border ${
                isToday ? 'border-primary-500' : 'border-gray-200'
              } p-4`}
            >
              <div className="mb-4">
                <div className="text-sm text-gray-600 capitalize">
                  {format(day, 'EEEE', { locale: ptBR })}
                </div>
                <div className={`text-2xl font-bold ${
                  isToday ? 'text-primary-600' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="text-xs text-gray-500">
                  {format(day, 'MMM', { locale: ptBR })}
                </div>
              </div>
              
              <div className="space-y-3">
                {dayAgendamentos.length > 0 ? (
                  dayAgendamentos.map((ag) => (
                    <div
                      key={ag.id}
                      className="border-l-4 pl-3 py-2 space-y-2"
                      style={{ borderColor: getStatusColor(ag.status) }}
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {ag.customer.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {ag.startTime} • R$ {ag.price.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {getStatusBadge(ag.status)}
                        {ag.isRecurring && (
                          <span className="text-xs text-gray-500">🔄</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <Link to={`/invoice/${ag.id}`} className="text-primary-600 font-semibold hover:underline inline-flex items-center space-x-1">
                          <FileText size={12} />
                          <span>Ver fatura</span>
                        </Link>
                      </div>
                      
                      {ag.status === 'AGENDADO' && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleStatusChange(ag.id, 'EM_ANDAMENTO')}
                            className="flex-1 text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors"
                          >
                            Iniciar
                          </button>
                          <button
                            onClick={() => handleStatusChange(ag.id, 'CONCLUIDO')}
                            className="flex-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                          >
                            Concluir
                          </button>
                          <button
                            onClick={() => handleStatusChange(ag.id, 'CANCELADO')}
                            className="flex-1 text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                      {ag.status === 'EM_ANDAMENTO' && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleStatusChange(ag.id, 'CONCLUIDO')}
                            className="flex-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                          >
                            Concluir
                          </button>
                          <button
                            onClick={() => handleStatusChange(ag.id, 'CANCELADO')}
                            className="flex-1 text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Sem agendamentos
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-gray-700">Legenda:</span>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600">Agendado</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-indigo-500 rounded"></div>
            <span className="text-gray-600">Em andamento</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">Concluído</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600">Cancelado</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">🔄 Recorrente</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgendaSemanal;

