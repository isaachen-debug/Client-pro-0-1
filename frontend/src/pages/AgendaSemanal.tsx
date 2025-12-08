import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { appointmentsApi, customersApi, teamApi } from '../services/api';
import { Appointment, AppointmentStatus, Customer, User } from '../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { formatDateToYMD, parseDateFromInput } from '../utils/date';
import CreateModal, { CreateFormState } from '../components/appointments/CreateModal';
import EditModal from '../components/appointments/EditModal';

const pad = (value: number) => value.toString().padStart(2, '0');

const isSameSeries = (a: Appointment, b: Appointment) => {
  if (a.customerId !== b.customerId) return false;
  if (a.recurrenceSeriesId && b.recurrenceSeriesId) {
    return a.recurrenceSeriesId === b.recurrenceSeriesId;
  }
  if (a.recurrenceRule && b.recurrenceRule) {
    return a.recurrenceRule === b.recurrenceRule;
  }
  const sameStart = a.startTime === b.startTime;
  const samePrice = a.price === b.price;
  const recurringFlag = a.isRecurring || b.isRecurring;
  return sameStart && samePrice && recurringFlag;
};

type AgendaSemanalProps = {
  embedded?: boolean;
  quickCreateNonce?: number;
};

const AgendaSemanal = ({ embedded = false, quickCreateNonce = 0 }: AgendaSemanalProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [helpers, setHelpers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateError, setDateError] = useState('');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<Appointment[]>([]);
  const [showDayActions, setShowDayActions] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    price: '',
    helperFee: '',
    notes: '',
    status: 'AGENDADO' as AppointmentStatus,
    assignedHelperId: '',
  });
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    [],
  );

  const buildCreateForm = (baseDate: Date): CreateFormState => ({
    customerId: '',
    month: pad(baseDate.getMonth() + 1),
    day: pad(baseDate.getDate()),
    startTime: '',
    endTime: '',
    price: '',
  helperFee: '',
    isRecurring: false,
    recurrenceRule: '',
    notes: '',
    assignedHelperId: '',
  });

  const [createForm, setCreateForm] = useState<CreateFormState>(() => buildCreateForm(currentDate));
  const [createYear, setCreateYear] = useState(currentDate.getFullYear());

  const prepareCreateForm = (day: Date) => {
    setCreateForm((prev) => ({
      ...prev,
      month: pad(day.getMonth() + 1),
      day: pad(day.getDate()),
    }));
    setCreateYear(day.getFullYear());
    setDateError('');
  };

  useEffect(() => {
    fetchAgendamentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await customersApi.list();
        setCustomers(data);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      }
    };
    loadCustomers();
  }, []);

  useEffect(() => {
    const loadHelpers = async () => {
      try {
        const data = await teamApi.list();
        setHelpers(data.members.filter((member) => member.role === 'HELPER'));
      } catch (error) {
        console.error('Erro ao carregar helpers:', error);
      }
    };
    loadHelpers();
  }, []);
  useEffect(() => {
    if (!quickCreateNonce) return;
    const baseDate = new Date();
    prepareCreateForm(baseDate);
    setSelectedDay(baseDate);
    setShowDayActions(false);
    setShowEditModal(false);
    setShowCreateModal(true);
  }, [quickCreateNonce]);

  const fetchAgendamentos = async () => {
    try {
      const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 0 });
      const data = await appointmentsApi.listByWeek(formatDateToYMD(weekStartDate));
      setAgendamentos(data);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSeriesAndRefresh = async (appointment: Appointment) => {
    setSaving(true);
    try {
      await appointmentsApi.deleteSeries(appointment.id);
      await fetchAgendamentos();
      return true;
    } catch (error) {
      console.error('Erro ao remover série recorrente:', error);
      const confirmFallback = window.confirm(
        'Não foi possível remover automaticamente. Deseja remover todos os agendamentos deste cliente com o mesmo horário?',
      );
      if (!confirmFallback) {
        return false;
      }
      try {
        const customerAppointments = await appointmentsApi.listByCustomer(appointment.customerId);
        const sameSeriesAppointments = customerAppointments.filter((item) =>
          isSameSeries(item, appointment),
        );
        await Promise.all(sameSeriesAppointments.map((item) => appointmentsApi.remove(item.id)));
        await fetchAgendamentos();
        return true;
      } catch (fallbackError) {
        console.error('Erro no fallback de remoção:', fallbackError);
        alert('Ainda não foi possível remover a série completa. Tente novamente.');
        return false;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (appointment: Appointment, newStatus: AppointmentStatus) => {
    try {
      if (newStatus === 'CANCELADO') {
        const removed = await deleteSeriesAndRefresh(appointment);
        if (removed) return;
      }

      const wantsInvoice =
        newStatus === 'CONCLUIDO' &&
        window.confirm('Deseja enviar a cobrança por e-mail/copiar o link da fatura agora?');
      const updated = await appointmentsApi.changeStatus(
        appointment.id,
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const year = createYear;
      const monthNumber = Number(createForm.month);
      const dayNumber = Number(createForm.day);
      const daysInMonth = new Date(year, monthNumber, 0).getDate();

      if (
        Number.isNaN(monthNumber) ||
        Number.isNaN(dayNumber) ||
        monthNumber < 1 ||
        monthNumber > 12 ||
        dayNumber < 1 ||
        dayNumber > daysInMonth
      ) {
        setDateError('Selecione um dia válido para o mês escolhido.');
        setSaving(false);
        return;
      }

      setDateError('');
      const composedDate = formatDateToYMD(new Date(year, monthNumber - 1, dayNumber));

      await appointmentsApi.create({
        customerId: createForm.customerId,
        date: composedDate,
        startTime: createForm.startTime,
        endTime: createForm.endTime || undefined,
        price: parseFloat(createForm.price),
        helperFee: createForm.helperFee ? Number(createForm.helperFee) : undefined,
        isRecurring: createForm.isRecurring,
        recurrenceRule: createForm.isRecurring ? createForm.recurrenceRule : undefined,
        notes: createForm.notes,
        assignedHelperId: createForm.assignedHelperId || undefined,
      });

      setShowCreateModal(false);
      setCreateForm(buildCreateForm(new Date(year, monthNumber - 1, dayNumber)));
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;
    try {
      setSaving(true);
      const shouldPromptInvoice =
        editingAppointment.status !== 'CONCLUIDO' && editForm.status === 'CONCLUIDO';
      await appointmentsApi.update(editingAppointment.id, {
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime || undefined,
        price: parseFloat(editForm.price),
        helperFee: editForm.helperFee === '' ? undefined : Number(editForm.helperFee),
        notes: editForm.notes,
        status: editForm.status,
        assignedHelperId: editForm.assignedHelperId === '' ? null : editForm.assignedHelperId,
      });
      if (shouldPromptInvoice) {
        await handleStatusChange(editingAppointment, 'CONCLUIDO');
      } else {
        await fetchAgendamentos();
      }
      setShowEditModal(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (status: AppointmentStatus) => {
    if (!editingAppointment) return;
    try {
      setSaving(true);
      await handleStatusChange(editingAppointment, status);
      setShowEditModal(false);
      setEditingAppointment(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!editingAppointment) return;
    const confirmed = window.confirm('Deseja remover todos os agendamentos desta série recorrente?');
    if (!confirmed) return;
    const removed = await deleteSeriesAndRefresh(editingAppointment);
    if (removed) {
      setShowEditModal(false);
      setEditingAppointment(null);
    }
  };

  const handleDayCardClick = (day: Date) => {
    const appointmentsForDay = getAgendamentosForDay(day, false);
    setSelectedDay(day);
    setSelectedDayAppointments(appointmentsForDay);
    if (appointmentsForDay.length === 0) {
      prepareCreateForm(day);
      setShowCreateModal(true);
      return;
    }
    setShowDayActions(true);
  };

  const handleDayActionAdd = () => {
    if (!selectedDay) return;
    prepareCreateForm(selectedDay);
    setShowDayActions(false);
    setShowCreateModal(true);
  };

  const openEditModal = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setEditForm({
      date: formatDateToYMD(parseDateFromInput(appointment.date)),
      startTime: appointment.startTime,
      endTime: appointment.endTime || '',
      price: appointment.price.toString(),
      helperFee:
        appointment.helperFee !== null && appointment.helperFee !== undefined
          ? appointment.helperFee.toString()
          : '',
      notes: appointment.notes || '',
      status: appointment.status,
      assignedHelperId: appointment.assignedHelperId ?? '',
    });
    setShowEditModal(true);
  };

  const handleDayActionEdit = (appointment: Appointment) => {
    setShowDayActions(false);
    openEditModal(appointment);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setDateError('');
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  );

  const getAgendamentosForDay = (day: Date, applyStatusFilter = true) => {
    let filtered = agendamentos.filter((ag) => isSameDay(parseDateFromInput(ag.date), day));

    if (applyStatusFilter && filter !== 'todos') {
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

  const statusBg: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-[#d1ecff]',
    EM_ANDAMENTO: 'bg-[#ffecc7]',
    CONCLUIDO: 'bg-[#c8f3dd]',
    CANCELADO: 'bg-[#ffd9dd]',
  };
  const statusText: Record<AppointmentStatus, string> = {
    AGENDADO: 'text-[#0a4b78]',
    EM_ANDAMENTO: 'text-[#7a4a00]',
    CONCLUIDO: 'text-[#0f5b34]',
    CANCELADO: 'text-[#7a1024]',
  };

  const getStatusBadge = (status: AppointmentStatus) => (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  );

  const pageSections = (
    <>
      {/* Header */}
      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">Today</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Agenda semanal</h1>
          <p className="text-sm text-gray-600 mt-1">Acompanhe e organize os serviços da semana em um toque.</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="flex-1 min-w-[120px] px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Semana Atual
            </button>
            <button
              onClick={() => setCurrentDate(addWeeks(new Date(), 1))}
              className="flex-1 min-w-[140px] px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Próxima Semana
            </button>
          </div>
          <div className="flex items-center justify-between sm:justify-end space-x-2">
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
            <button
              onClick={() => handleDayCardClick(currentDate)}
              className="hidden md:inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Novo agendamento
            </button>
          </div>
        </div>
        <button
          onClick={() => handleDayCardClick(currentDate)}
          className="md:hidden inline-flex items-center justify-center w-full px-4 py-3 bg-gray-900 text-white text-sm font-semibold rounded-2xl shadow-lg hover:bg-black transition-colors"
        >
          Novo agendamento
        </button>
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

      {/* Week list em cards minimalista (estilo agenda vertical Google) */}
      <div className="space-y-3">
        {weekDays.map((day) => {
          const dayAgendamentos = getAgendamentosForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => handleDayCardClick(day)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleDayCardClick(day);
                }
              }}
              className={`bg-white rounded-3xl border border-gray-200 transition-transform focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                isToday ? 'ring-1 ring-primary-100' : ''
              } px-4 py-3 sm:px-5 sm:py-4 cursor-pointer hover:-translate-y-0.5`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase text-gray-500">{format(day, 'EEEE', { locale: ptBR })}</div>
                  <div className={`text-2xl font-bold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-xs text-gray-500">{format(day, 'MMM', { locale: ptBR })}</div>
                </div>
                {dayAgendamentos.length > 0 && (
                  <span className="text-xs font-semibold text-gray-500">{dayAgendamentos.length} serviços</span>
                )}
              </div>

              <div className="space-y-2">
                {dayAgendamentos.length > 0 ? (
                  [...dayAgendamentos]
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                    .map((ag) => (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(ag);
                        }}
                        className={`w-full text-left rounded-xl p-3 transition hover:translate-y-[-1px] ${statusBg[ag.status]} ${statusText[ag.status]}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold truncate">{ag.customer.name}</div>
                          <span className="text-[11px] font-semibold">
                            {ag.startTime} {ag.endTime ? `· ${ag.endTime}` : ''}
                          </span>
                        </div>
                        {ag.notes && <p className="text-[11px] mt-1 leading-snug opacity-80">{ag.notes}</p>}
                      </button>
                    ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8 leading-relaxed">
                    Sem agendamentos
                    <br />
                    <span className="text-xs text-gray-500">Toque para criar.</span>
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

      {showCreateModal && (
        <CreateModal
          title="Novo agendamento"
          customers={customers}
          helpers={helpers}
          formData={createForm}
          setFormData={setCreateForm}
          saving={saving}
          onClose={closeCreateModal}
          onSubmit={handleCreate}
          currentYear={createYear}
          dateError={dateError}
        />
      )}

      {showDayActions && selectedDay && (
        <DayActionsModal
          date={selectedDay}
          appointments={selectedDayAppointments}
          onClose={() => setShowDayActions(false)}
          onAdd={handleDayActionAdd}
          onEdit={handleDayActionEdit}
          formatCurrency={(value) => currencyFormatter.format(value)}
        />
      )}

      {showEditModal && editingAppointment && (
        <EditModal
          appointment={editingAppointment}
          formData={editForm}
          setFormData={setEditForm}
          helpers={helpers}
          saving={saving}
          onClose={() => {
            setShowEditModal(false);
            setEditingAppointment(null);
          }}
          onSubmit={handleUpdate}
          onQuickStatus={handleQuickStatus}
          canDeleteSeries
          onDeleteSeries={handleDeleteSeries}
        />
      )}
    </>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const containerClasses = embedded ? 'space-y-6' : 'p-4 md:p-8 space-y-6';

  return <div className={containerClasses}>{pageSections}</div>;
};

type DayActionsModalProps = {
  date: Date;
  appointments: Appointment[];
  onAdd: () => void;
  onEdit: (appointment: Appointment) => void;
  onClose: () => void;
  formatCurrency: (value: number) => string;
};

const DayActionsModal = ({ date, appointments, onAdd, onEdit, onClose, formatCurrency }: DayActionsModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/50" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-xl z-10 w-full max-w-md">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-gray-500">Dia selecionado</p>
            <p className="text-lg font-semibold text-gray-900">
              {format(date, "EEEE',' dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="w-full px-4 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
        >
          Adicionar novo agendamento
        </button>

        {appointments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Ou edite um existente</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {appointments.map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => onEdit(appointment)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-primary-400 hover:bg-primary-50/60 transition-colors"
                >
                  <p className="text-sm font-semibold text-gray-900">{appointment.customer.name}</p>
                  <p className="text-xs text-gray-500">
                    {appointment.startTime} • {formatCurrency(appointment.price)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default AgendaSemanal;

