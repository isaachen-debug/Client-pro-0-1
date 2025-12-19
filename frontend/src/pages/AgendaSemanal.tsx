import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Phone, Mail, MapPin, Navigation } from 'lucide-react';
import { appointmentsApi, customersApi, teamApi } from '../services/api';
import { Appointment, AppointmentStatus, Customer, User } from '../types';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateToYMD, parseDateFromInput } from '../utils/date';
import CreateModal, { CreateFormState } from '../components/appointments/CreateModal';
import EditModal from '../components/appointments/EditModal';
import AgendaMensal from './AgendaMensal';
import AudioQuickAdd from '../components/AudioQuickAdd';
import { getGoogleStatus, syncGoogleEvent } from '../services/googleCalendar';

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
  const [filter] = useState('todos');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [helpers, setHelpers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateError, setDateError] = useState('');
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<Appointment[]>([]);
  const [showDayActions, setShowDayActions] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<Customer | null>(null);
  const [showEditOptions, setShowEditOptions] = useState(false);
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
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    [],
  );
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'month'>('week');
  const [googleConnected, setGoogleConnected] = useState(false);

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

  useEffect(() => {
    setSelectedDay(currentDate);
  }, [currentDate]);

  useEffect(() => {
    const loadGoogleStatus = async () => {
      try {
        const status = await getGoogleStatus();
        setGoogleConnected(Boolean(status.connected));
      } catch (error) {
        setGoogleConnected(false);
      }
    };
    loadGoogleStatus();
  }, []);

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

      const selectedCustomer = customers.find((c) => c.id === createForm.customerId);
      const priceNumber =
        createForm.price && createForm.price.trim() !== ''
          ? Number(createForm.price)
          : selectedCustomer?.defaultPrice ?? 0;

      const created = await appointmentsApi.create({
        customerId: createForm.customerId,
        date: composedDate,
        startTime: createForm.startTime,
        endTime: createForm.endTime || undefined,
        price: priceNumber,
        helperFee: createForm.helperFee ? Number(createForm.helperFee) : undefined,
        isRecurring: createForm.isRecurring,
        recurrenceRule: createForm.isRecurring ? createForm.recurrenceRule : undefined,
        notes: createForm.notes,
        assignedHelperId: createForm.assignedHelperId || undefined,
      });
      if (googleConnected) {
        const customerName = customers.find((c) => c.id === createForm.customerId)?.name ?? 'Agendamento';
        const customerEmail = customers.find((c) => c.id === createForm.customerId)?.email;
        const helperEmail =
          helpers.find((h) => h.id === createForm.assignedHelperId)?.email ||
          undefined;
        const startIso = new Date(`${composedDate}T${createForm.startTime || '08:00'}:00`).toISOString();
        const endIso = new Date(`${composedDate}T${createForm.endTime || createForm.startTime || '09:00'}:00`).toISOString();
        try {
          await syncGoogleEvent({
            summary: customerName,
            description: createForm.notes,
            start: startIso,
            end: endIso,
            appointmentId: created.id,
            attendees: [customerEmail, helperEmail].filter(Boolean) as string[],
          });
        } catch (err) {
          console.error('Falha ao sincronizar com Google Calendar (create):', err);
        }
      }
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
        price: editForm.price ? Number(editForm.price) : editingAppointment.price,
        helperFee: editForm.helperFee === '' ? undefined : Number(editForm.helperFee),
        notes: editForm.notes,
        status: editForm.status,
        assignedHelperId: editForm.assignedHelperId === '' ? null : editForm.assignedHelperId,
        isRecurring: editForm.isRecurring && !!editForm.recurrenceRule,
        recurrenceRule: editForm.isRecurring && editForm.recurrenceRule ? editForm.recurrenceRule : undefined,
      });
      if (googleConnected) {
        const customerName = editingAppointment.customer?.name ?? 'Agendamento';
        const customerEmail = editingAppointment.customer?.email;
        const helperEmail = helpers.find((h) => h.id === editForm.assignedHelperId)?.email;
        const startIso = new Date(`${editForm.date}T${editForm.startTime || '08:00'}:00`).toISOString();
        const endIso = new Date(`${editForm.date}T${editForm.endTime || editForm.startTime || '09:00'}:00`).toISOString();
        try {
          await syncGoogleEvent({
            summary: customerName,
            description: editForm.notes,
            start: startIso,
            end: endIso,
            appointmentId: editingAppointment.id,
            attendees: [customerEmail, helperEmail].filter(Boolean) as string[],
          });
        } catch (err) {
          console.error('Falha ao sincronizar com Google Calendar (update):', err);
        }
      }
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
      isRecurring: Boolean(appointment.isRecurring || appointment.recurrenceRule),
      recurrenceRule: appointment.recurrenceRule || '',
    });
    setShowEditModal(true);
  };

  const openCustomerInfo = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setCustomerInfo(appointment.customer);
    setShowEditOptions(false);
  };

  const openEditModalForCustomer = () => {
    if (!editingAppointment) return;
    openEditModal(editingAppointment);
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

  const statusToneClasses: Record<AppointmentStatus | 'PENDENTE', string> = {
    AGENDADO: 'bg-blue-50 text-blue-700 border-blue-100',
    EM_ANDAMENTO: 'bg-amber-50 text-amber-700 border-amber-100',
    CONCLUIDO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    CANCELADO: 'bg-red-50 text-red-700 border-red-100',
    PENDENTE: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  const statusDotBg: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-blue-500',
    EM_ANDAMENTO: 'bg-amber-500',
    CONCLUIDO: 'bg-emerald-500',
    CANCELADO: 'bg-red-500',
  };
  const statusSurfaces: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-blue-50 text-blue-700 border-blue-100',
    EM_ANDAMENTO: 'bg-amber-50 text-amber-700 border-amber-100',
    CONCLUIDO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    CANCELADO: 'bg-red-50 text-red-700 border-red-100',
  };

  const renderWeekSection = () => {
    const hasAny = weekDays.some((day) => getAgendamentosForDay(day).length > 0);

    return (
      <div className="space-y-4 px-4 md:px-5">
        {!hasAny && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 text-center">
            Nenhum agendamento nesta semana.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Semana</p>
            <p className="text-xl font-semibold text-slate-900 leading-tight">
              {format(weekDays[0], 'dd MMM', { locale: ptBR })} – {format(weekDays[6], 'dd MMM', { locale: ptBR })}
            </p>
          </div>

          {/* Grid de 7 dias */}
          <div className="grid grid-cols-7 gap-2 rounded-2xl bg-white border border-slate-100 p-2 shadow-sm sticky top-0 z-10">
            {weekDays.map((day, index) => {
              const dayAppointments = getAgendamentosForDay(day, false);
              const isSelected = isSameDay(day, selectedDay);
              const today = isToday(day);
              const weekdayLabels = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                      : today
                        ? 'bg-primary-50 text-primary-700 border border-primary-100'
                        : 'bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-[11px] font-semibold uppercase ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                    {weekdayLabels[index]}
                  </span>
                  <span className="text-lg font-semibold leading-none">{format(day, 'd')}</span>
                  {dayAppointments.length > 0 ? (
                    <div className="flex items-center gap-0.5">
                      {dayAppointments.slice(0, 3).map((ag) => (
                        <div
                          key={ag.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            statusDotBg[ag.status] ?? 'bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="h-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Lista de eventos do dia selecionado */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {format(selectedDay, 'EEEE', { locale: ptBR })}
                </p>
                <p className="text-base font-semibold text-slate-900">
                  {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDayCardClick(selectedDay)}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                + Agendar
              </button>
            </div>

            {getAgendamentosForDay(selectedDay, false).length === 0 ? (
              <p className="text-xs text-slate-400">Sem eventos</p>
            ) : (
              <div className="space-y-2">
                {getAgendamentosForDay(selectedDay, false)
                  .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                  .map((ag) => {
                    const start = ag.startTime || 'Dia todo';
                    const end = ag.endTime ? ` · ${ag.endTime}` : '';
                    return (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => openCustomerInfo(ag)}
                        className={`w-full text-left rounded-xl px-3 py-2 shadow-sm border transition ${
                          statusSurfaces[ag.status] ?? 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900 truncate">{ag.customer.name}</span>
                          <span className="text-xs text-slate-600">{start}</span>
                        </div>
                        {ag.notes ? <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ag.notes}</p> : null}
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {start}
                          {end}
                        </p>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTodayTimeline = () => {
    const dayAppointments = getAgendamentosForDay(selectedDay).sort(
      (a, b) => (a.startTime || '').localeCompare(b.startTime || ''),
    );

    const dotsColor = (status: AppointmentStatus) => {
      switch (status) {
        case 'CONCLUIDO':
          return 'border-emerald-500';
        case 'EM_ANDAMENTO':
          return 'border-amber-500';
        case 'CANCELADO':
          return 'border-red-500';
        default:
          return 'border-primary-500';
      }
    };

    return (
      <div className="space-y-4">
        {dayAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 text-center">
            Nenhum agendamento para hoje.
          </div>
        ) : (
          <div className="relative pl-10">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" aria-hidden />
            <div className="space-y-4">
              {dayAppointments.map((ag) => {
                const start = ag.startTime || 'Dia todo';
                const end = ag.endTime ? ` - ${ag.endTime}` : '';
                return (
                  <div key={ag.id} className="relative flex gap-4">
                    <div className="flex flex-col items-center w-10 shrink-0">
                      <span className="text-sm font-semibold text-slate-700">{start}</span>
                      <div className={`mt-1 h-3 w-3 rounded-full border-2 bg-white ${dotsColor(ag.status)}`} />
                    </div>
                    <div
                      className="flex-1 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                      onClick={() => openCustomerInfo(ag)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openCustomerInfo(ag);
                        }
                      }}
                    >
                      <p className="text-sm font-semibold text-slate-900">{`${ag.startTime || ''}${end}`}</p>
                      <p className="text-base font-semibold text-slate-900">{ag.customer.name}</p>
                      {ag.notes ? <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ag.notes}</p> : null}
                      <div
                        className={`mt-2 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full ${statusToneClasses[ag.status] ?? statusToneClasses.PENDENTE}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${statusDotBg[ag.status] ?? 'bg-slate-400'}`} aria-hidden />
                        {ag.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const pageSections = (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {!embedded && (
          <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">Agenda</p>
              <h1 className="text-xl md:text-3xl font-semibold text-slate-900">Agenda semanal</h1>
              <p className="hidden md:block text-sm text-slate-600">Acompanhe os serviços desta semana em um só lugar.</p>
          </div>
          )}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Hoje
            </button>
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm w-full sm:w-auto justify-between">
              <button
                onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-slate-800 min-w-[140px] text-center">
                {format(weekStart, 'dd MMM', { locale: ptBR })} - {format(weekEnd, 'dd MMM', { locale: ptBR })}
              </span>
              <button
                onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 shadow-sm">
            {['today', 'week', 'month'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as 'today' | 'week' | 'month')}
                className={`px-3 py-2 rounded-full transition ${
                  viewMode === mode ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {mode === 'today' ? 'Hoje' : mode === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className="space-y-6">
        {viewMode === 'today' && renderTodayTimeline()}
        {viewMode === 'week' && renderWeekSection()}
        {viewMode === 'month' && <AgendaMensal embedded />}
      </div>

      <AudioQuickAdd
        floatingWrapperClassName="fixed right-4 bottom-24 z-50 flex flex-col items-end gap-3"
        actionAboveVoice={{
          label: '+ Novo agendamento',
          onClick: () => handleDayCardClick(selectedDay || new Date()),
        }}
        contextHint={`Usuário está na visão semanal. Semana corrente: ${format(weekStart, 'yyyy-MM-dd')} até ${format(
          weekEnd,
          'yyyy-MM-dd',
        )}. Se ele disser "quinta-feira" ou "terça", use esta semana. Ano é o atual.`}
      />

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

  const mapLink =
    customerInfo && (customerInfo.latitude && customerInfo.longitude
      ? `https://www.google.com/maps?q=${customerInfo.latitude},${customerInfo.longitude}`
      : customerInfo.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customerInfo.address)}`
        : null);
  const wazeLink =
    customerInfo && (customerInfo.latitude && customerInfo.longitude
      ? `https://waze.com/ul?ll=${customerInfo.latitude}%2C${customerInfo.longitude}&navigate=yes`
      : customerInfo.address
        ? `https://waze.com/ul?q=${encodeURIComponent(customerInfo.address)}&navigate=yes`
        : null);

  const containerClasses = embedded ? 'space-y-6' : 'px-4 md:px-8 pt-0 pb-4 space-y-6';

  return (
    <div className={containerClasses}>
      {pageSections}
      {customerInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setCustomerInfo(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl z-10 w-full max-w-md p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Cliente</p>
                <p className="text-lg font-semibold text-slate-900">{customerInfo.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setCustomerInfo(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEditOptions((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                Editar
              </button>
            </div>
            {showEditOptions && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (customerInfo?.id) {
                      navigate(`/app/clientes?customerId=${customerInfo.id}`);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-primary-700 shadow-sm hover:bg-primary-50 transition"
                >
                  Endereço (clientes)
                </button>
                <button
                  type="button"
                  onClick={openEditModalForCustomer}
                  className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-primary-700 transition"
                >
                  Horário (agendamento)
                </button>
              </div>
            )}

            <div className="space-y-2 text-sm text-slate-700">
              {customerInfo.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-primary-600" />
                  <a href={`tel:${customerInfo.phone}`} className="font-semibold text-primary-700 hover:underline">
                    {customerInfo.phone}
                  </a>
                </div>
              )}
              {customerInfo.email && (
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-primary-600" />
                  <a href={`mailto:${customerInfo.email}`} className="font-semibold text-primary-700 hover:underline">
                    {customerInfo.email}
                  </a>
                </div>
              )}
              {(customerInfo.address || mapLink) && (
                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-primary-600 mt-0.5" />
                    <div className="space-y-1">
                      {customerInfo.address && <p className="font-semibold leading-snug">{customerInfo.address}</p>}
                      {(mapLink || wazeLink) && (
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                          {mapLink && (
                            <a
                              className="text-xs font-semibold text-primary-700 hover:underline"
                              href={mapLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir no mapa
                            </a>
                          )}
                          {wazeLink && (
                            <a
                              className="inline-flex items-center gap-2 rounded-full bg-[#33ccff] text-white px-3 py-1 text-[11px] font-semibold hover:brightness-110 transition ml-auto"
                              href={wazeLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Navigation size={14} />
                              Waze
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
          {mapLink && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <iframe
                title="Mapa do cliente"
                src={
                  customerInfo.latitude && customerInfo.longitude
                    ? `https://www.google.com/maps?q=${customerInfo.latitude},${customerInfo.longitude}&output=embed`
                    : `https://www.google.com/maps?q=${encodeURIComponent(customerInfo.address || '')}&output=embed`
                }
                className="w-full h-44"
                loading="lazy"
                allowFullScreen
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openEditModalForCustomer}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              Editar endereço/horário
            </button>
          </div>
                </div>
              )}
            </div>

            {customerInfo.notes && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {customerInfo.notes}
              </div>
            )}
            <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                void handleQuickStatus('CONCLUIDO');
                setCustomerInfo(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Go (iniciar limpeza)
            </button>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => handleDayCardClick(selectedDay || new Date())}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary-600 text-white text-2xl font-bold shadow-lg hover:bg-primary-700 transition"
        aria-label="Criar novo agendamento"
      >
        +
      </button>
    </div>
  );
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
