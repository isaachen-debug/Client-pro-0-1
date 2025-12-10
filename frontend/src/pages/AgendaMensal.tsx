import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { appointmentsApi, customersApi, teamApi } from '../services/api';
import { Appointment, AppointmentStatus, Customer, User } from '../types';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

type AgendaMensalProps = {
  embedded?: boolean;
};

const AgendaMensal = ({ embedded = false }: AgendaMensalProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [helpers, setHelpers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState<CreateFormState>({
    customerId: '',
    month: pad(new Date().getMonth() + 1),
    day: pad(new Date().getDate()),
    startTime: '',
    endTime: '',
    price: '',
    helperFee: '',
    isRecurring: false,
    recurrenceRule: '',
    notes: '',
    assignedHelperId: '',
  });
  const [createYear, setCreateYear] = useState(new Date().getFullYear());
  const [dateError, setDateError] = useState('');
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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const [appointmentsRes, customersRes] = await Promise.all([
        appointmentsApi.listByMonth(month, year),
        customersApi.list(),
      ]);
      setAppointments(appointmentsRes);
      setCustomers(customersRes);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (baseDate: Date = currentDate) => {
    setFormData({
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
    setDateError('');
    setCreateYear(baseDate.getFullYear());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const year = createYear;
      const monthNumber = Number(formData.month);
      const dayNumber = Number(formData.day);
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

      const composedDate = `${year}-${pad(monthNumber)}-${pad(dayNumber)}`;

      await appointmentsApi.create({
        customerId: formData.customerId,
        date: composedDate,
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        price: parseFloat(formData.price),
        helperFee: formData.helperFee ? Number(formData.helperFee) : undefined,
        isRecurring: formData.isRecurring,
        recurrenceRule: formData.isRecurring ? formData.recurrenceRule : undefined,
        notes: formData.notes,
        assignedHelperId: formData.assignedHelperId || undefined,
      });
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteSeriesAndRefresh = async (appointment: Appointment) => {
    setSaving(true);
    try {
      await appointmentsApi.deleteSeries(appointment.id);
      fetchData();
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
        fetchData();
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

  const handleStatusUpdate = async (
    appointment: Appointment,
    status: AppointmentStatus,
    promptInvoice: boolean,
  ) => {
    if (status === 'CANCELADO') {
      const removed = await deleteSeriesAndRefresh(appointment);
      if (removed) {
        return;
      }
    }

    let sendInvoice = false;
    if (promptInvoice) {
      sendInvoice = window.confirm('Deseja enviar a cobrança por e-mail/copiar o link da fatura agora?');
    }
    const updated = await appointmentsApi.changeStatus(
      appointment.id,
      status,
      sendInvoice ? { sendInvoice: true } : undefined,
    );
    if (sendInvoice && updated.invoiceUrl) {
      try {
        await navigator.clipboard.writeText(updated.invoiceUrl);
        alert('Link da fatura copiado para a área de transferência.');
      } catch {
        alert(`Link da fatura: ${updated.invoiceUrl}`);
      }
    }
  };

  const handleAddAppointmentForDay = (day: Date) => {
    resetForm(day);
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
        await handleStatusUpdate(editingAppointment, 'CONCLUIDO', true);
      }
      setShowEditModal(false);
      setEditingAppointment(null);
      fetchData();
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
      await handleStatusUpdate(editingAppointment, status, status === 'CONCLUIDO');
      setShowEditModal(false);
      setEditingAppointment(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd],
  );
  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd],
  );

  const getAgendamentosForDay = (day: Date) =>
    appointments.filter((ag) => isSameDay(parseDateFromInput(ag.date), day));

  const statusSurfaces: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-blue-50 text-blue-700',
    EM_ANDAMENTO: 'bg-amber-50 text-amber-700',
    CONCLUIDO: 'bg-emerald-50 text-emerald-700',
    CANCELADO: 'bg-red-50 text-red-700',
  };

  const headerAndGrid = (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">Agenda</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Agenda mensal</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-medium text-slate-800 min-w-[150px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm(currentDate);
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-full hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* Mobile grid estilo Google Calendar */}
      <div className="md:hidden rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 text-[11px] font-semibold text-gray-500 border-b border-gray-100">
          {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => (
            <div key={d} className="px-2 py-2 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-gray-100">
          {calendarDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const inMonth = isSameMonth(day, currentDate);
            const dayAppointments = getAgendamentosForDay(day);
            const visible = dayAppointments.slice(0, 2);
            const extra = dayAppointments.length - visible.length;
            return (
              <div
                key={day.getTime()}
                className={`relative border-r border-b border-gray-100 px-1.5 py-1.5 min-h-[78px] ${
                  inMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                }`}
                onClick={() => handleAddAppointmentForDay(day)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      isToday
                        ? 'text-white bg-primary-500 rounded-full w-6 h-6 flex items-center justify-center'
                        : 'text-gray-800'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  {visible.map((appointment) => (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(appointment);
                      }}
                      className={`w-full text-left text-[11px] px-2 py-1 rounded-md ${statusSurfaces[appointment.status]}`}
                    >
                      <div className="font-semibold truncate">{appointment.customer.name}</div>
                      <div className="text-[10px]">
                        {appointment.startTime} {appointment.endTime ? `· ${appointment.endTime}` : ''}
                      </div>
                    </button>
                  ))}
                  {extra > 0 && (
                    <div className="text-[10px] text-gray-500 font-semibold">+{extra} eventos</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop grid anterior */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {monthDays.map((day) => {
            const dayAppointments = getAgendamentosForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.getTime()}
                className={`rounded-lg p-4 min-h-[150px] border ${
                  isToday ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className={`text-lg font-bold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-2">
                  {dayAppointments.length > 0 &&
                    dayAppointments
                      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                      .map((appointment) => (
                        <button
                          type="button"
                          key={appointment.id}
                          onClick={() => openEditModal(appointment)}
                          className={`w-full text-left text-xs p-2 rounded-xl transition hover:-translate-y-0.5 ${statusSurfaces[appointment.status]}`}
                        >
                          <div className="font-semibold text-sm truncate">{appointment.customer.name}</div>
                          <div className="text-[11px] mt-1">
                            {appointment.startTime} {appointment.endTime ? `· ${appointment.endTime}` : ''}
                          </div>
                        </button>
                      ))}
                  <button
                    type="button"
                    onClick={() => handleAddAppointmentForDay(day)}
                    className={`w-full text-xs rounded-lg transition-colors ${
                      dayAppointments.length === 0
                        ? 'text-gray-500 border-2 border-dashed border-gray-200 py-6 text-center hover:border-primary-400 hover:text-primary-600'
                        : 'text-primary-600 border border-primary-100 py-2 hover:bg-primary-50'
                    }`}
                  >
                    + Adicionar agendamento
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  const modals = (
    <>
      {showCreateModal && (
        <CreateModal
          title="Novo Agendamento"
          customers={customers}
          helpers={helpers}
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          currentYear={currentDate.getFullYear()}
          dateError={dateError}
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

  const layoutContent = (
    <div className="space-y-6">
      {headerAndGrid}
      {modals}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return embedded ? layoutContent : <div className="px-4 md:px-8 pt-0 pb-4 space-y-6">{layoutContent}</div>;
};

export default AgendaMensal;
