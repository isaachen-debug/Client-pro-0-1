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
  externalDate?: Date;
  onDateChange?: (date: Date) => void;
};

const AgendaMensal = ({ embedded = false, externalDate, onDateChange }: AgendaMensalProps) => {
  const [currentDate, setCurrentDate] = useState(externalDate ?? new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(externalDate ?? new Date());
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
    isRecurring: false,
    recurrenceRule: '',
  });

  useEffect(() => {
    if (externalDate && !isSameDay(externalDate, currentDate)) {
      setCurrentDate(externalDate);
      setSelectedDay(externalDate);
    }
  }, [externalDate, currentDate]);

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
  ) => {
    if (status === 'CANCELADO') {
      const removed = await deleteSeriesAndRefresh(appointment);
      if (removed) {
        return;
      }
    }
    await appointmentsApi.changeStatus(appointment.id, status);
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
      isRecurring: appointment.isRecurring ?? false,
      recurrenceRule: appointment.recurrenceRule ?? '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;
    try {
      setSaving(true);
      const nextStatus = editForm.status === 'CONCLUIDO' ? 'EM_ANDAMENTO' : editForm.status;
      await appointmentsApi.update(editingAppointment.id, {
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime || undefined,
        price: parseFloat(editForm.price),
        helperFee: editForm.helperFee === '' ? undefined : Number(editForm.helperFee),
        notes: editForm.notes,
        status: nextStatus,
        assignedHelperId: editForm.assignedHelperId === '' ? null : editForm.assignedHelperId,
      });
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
      await handleStatusUpdate(editingAppointment, status);
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
  const monthGridDays = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd],
  );

  const getAgendamentosForDay = (day: Date) =>
    appointments.filter((ag) => isSameDay(parseDateFromInput(ag.date), day));

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
    onDateChange?.(today);
  };

  const statusAccents: Record<AppointmentStatus, string> = {
    AGENDADO: 'border-l-4 border-amber-300 dark:border-amber-600',
    NAO_CONFIRMADO: 'border-l-4 border-yellow-300 dark:border-yellow-600',
    EM_ANDAMENTO: 'border-l-4 border-blue-300 dark:border-blue-600',
    CONCLUIDO: 'border-l-4 border-blue-300 dark:border-blue-600',
    CANCELADO: 'border-l-4 border-red-300 dark:border-red-600',
  };
  const statusDotBg: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-amber-400',
    NAO_CONFIRMADO: 'bg-yellow-400',
    EM_ANDAMENTO: 'bg-blue-500',
    CONCLUIDO: 'bg-blue-500',
    CANCELADO: 'bg-red-500',
  };

  const headerCard = (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = subMonths(currentDate, 1);
              setCurrentDate(next);
              onDateChange?.(next);
            }}
            className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-bold text-slate-900 dark:text-white capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={() => {
              const next = addMonths(currentDate, 1);
              setCurrentDate(next);
              onDateChange?.(next);
            }}
            className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={handleToday}
          className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          Hoje
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1.5 px-0 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 px-0">
        {monthGridDays.map((day) => {
          const inMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDay);
          const dayAppointments = getAgendamentosForDay(day).sort((a, b) =>
            (a.startTime || '').localeCompare(b.startTime || ''),
          );
          const dots = dayAppointments.slice(0, 3);

          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => {
                setSelectedDay(day);
                onDateChange?.(day);
              }}
              className={`h-16 rounded-xl transition-all flex flex-col items-center justify-between p-1.5 text-sm border ${isSelected
                ? 'text-white bg-emerald-600 border-emerald-600 shadow-md shadow-emerald-500/20'
                : isToday
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : inMonth
                    ? 'text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                    : 'text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50 border-slate-50 dark:border-slate-900'
                }`}
            >
              <div className="flex items-center justify-center w-full">
                <span
                  className={`inline-flex items-center justify-center rounded-full w-7 h-7 text-sm font-bold ${isSelected
                    ? 'bg-emerald-500 text-white'
                    : isToday
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                      : 'bg-transparent'
                    }`}
                >
                  {format(day, 'd')}
                </span>
              </div>
              <div className="flex items-center justify-center gap-0.5 min-h-[8px]">
                {dots.map((appt, idx) => (
                  <span
                    key={idx}
                    className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white/80' : statusDotBg[appt.status] ?? 'bg-slate-400'
                      }`}
                  />
                ))}
                {dayAppointments.length > 3 && (
                  <span className={`text-[9px] font-bold ml-0.5 ${isSelected ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                    +{dayAppointments.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const eventsPanel = (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Eventos do dia</p>
          <p className="text-base font-bold text-slate-900 dark:text-white capitalize">
            {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={() => handleAddAppointmentForDay(selectedDay)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition"
        >
          <Plus size={14} />
          Novo
        </button>
      </div>

      {getAgendamentosForDay(selectedDay).length === 0 ? (
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          Nenhum evento neste dia
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {getAgendamentosForDay(selectedDay)
            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
            .map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() => openEditModal(appointment)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all hover:shadow-md ${statusAccents[appointment.status] ?? 'border-l-4 border-slate-200 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {appointment.customer.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDotBg[appointment.status] ?? 'bg-slate-400'}`} />
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {appointment.startTime}
                      {appointment.endTime ? ` - ${appointment.endTime}` : ''}
                    </span>
                  </div>
                </div>
                {appointment.notes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">
                    {appointment.notes}
                  </p>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
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
          formData={{ ...editForm, isRecurring: editForm.isRecurring ?? false, recurrenceRule: editForm.recurrenceRule ?? '' }}
          setFormData={(updater) =>
            setEditForm((prev) => {
              const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
              return { ...prev, ...next };
            })
          }
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
    <div className="space-y-4">
      {headerCard}
      {eventsPanel}
      {modals}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-emerald-500" />
      </div>
    );
  }

  return embedded ? layoutContent : <div className="px-4 md:px-8 pt-0 pb-4 space-y-6">{layoutContent}</div>;
};

export default AgendaMensal;
