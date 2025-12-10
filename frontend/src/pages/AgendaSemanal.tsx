import type { MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { appointmentsApi, customersApi, teamApi } from '../services/api';
import { Appointment, AppointmentStatus, Customer, User } from '../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
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
    isRecurring: false,
    recurrenceRule: '',
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

      const selectedCustomer = customers.find((c) => c.id === createForm.customerId);
      const priceNumber =
        createForm.price && createForm.price.trim() !== ''
          ? Number(createForm.price)
          : selectedCustomer?.defaultPrice ?? 0;

      await appointmentsApi.create({
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

  const statusBg: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-blue-50',
    EM_ANDAMENTO: 'bg-amber-50',
    CONCLUIDO: 'bg-emerald-50',
    CANCELADO: 'bg-red-50',
  };
  const statusText: Record<AppointmentStatus, string> = {
    AGENDADO: 'text-blue-700',
    EM_ANDAMENTO: 'text-amber-700',
    CONCLUIDO: 'text-emerald-700',
    CANCELADO: 'text-red-700',
  };

  const startHour = 0;
  const endHour = 23;
  const minuteHeight = 0.9; // px per minute
  const defaultDuration = 60; // minutes
  const dayColumnHeight = (endHour - startHour) * 60 * minuteHeight;

  const parseMinutes = (time?: string | null) => {
    if (!time) return null;
    const [h, m] = time.split(':');
    const hours = Number(h);
    const minutes = Number(m);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const getEventPosition = (appointment: Appointment) => {
    const startMinutes = parseMinutes(appointment.startTime) ?? startHour * 60;
    const endMinutes = parseMinutes(appointment.endTime) ?? startMinutes + defaultDuration;
    const duration = Math.max(endMinutes - startMinutes, 30);
    const top = (startMinutes - startHour * 60) * minuteHeight;
    const height = duration * minuteHeight;
    return { top, height };
  };

  const openCreateAt = (day: Date, startTotalMinutes: number) => {
    const minStart = startHour * 60;
    const maxStart = endHour * 60 - 15;
    const clampedStart = Math.max(minStart, Math.min(startTotalMinutes, maxStart));
    const endTotalMinutes = Math.min(clampedStart + 60, endHour * 60);

    const startHourStr = pad(Math.floor(clampedStart / 60));
    const startMinStr = pad(clampedStart % 60);
    const endHourStr = pad(Math.floor(endTotalMinutes / 60));
    const endMinStr = pad(endTotalMinutes % 60);

    prepareCreateForm(day);
    setCreateYear(day.getFullYear());
    setCreateForm((prev) => ({
      ...prev,
      startTime: `${startHourStr}:${startMinStr}`,
      endTime: `${endHourStr}:${endMinStr}`,
    }));
    setSelectedDay(day);
    setSelectedDayAppointments(getAgendamentosForDay(day, false));
    setShowDayActions(false);
    setShowEditModal(false);
    setDateError('');
    setShowCreateModal(true);
  };

  const handleDesktopSlotClick = (day: Date, event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-event-button="true"]')) return;

    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = event.clientY - rect.top;
    const totalMinutesAvailable = (endHour - startHour) * 60;
    const minuteHeightDynamic = totalMinutesAvailable > 0 ? rect.height / totalMinutesAvailable : minuteHeight;
    const minutesFromTop = y / minuteHeightDynamic;
    const snapped = Math.round(minutesFromTop / 15) * 15;
    const totalMinutes = startHour * 60 + snapped;
    openCreateAt(day, totalMinutes);
  };

  const mobileList = (
    <div className="md:hidden space-y-3 px-3 owner-grid-tight">
        {weekDays.map((day) => {
          const dayAgendamentos = getAgendamentosForDay(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
            className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]"
            onClick={() => handleDayCardClick(day)}
              role="button"
              tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                  handleDayCardClick(day);
                }
              }}
          >
            <div className={`flex flex-col items-center justify-center w-16 rounded-xl ${isToday ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-700'} dark:bg-white/8 dark:text-[var(--text-primary)]`}>
              <span className="text-[11px] uppercase font-semibold tracking-wide">{format(day, 'EEE', { locale: ptBR })}</span>
              <span className="text-2xl font-bold leading-tight">{format(day, 'd')}</span>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 dark:text-[var(--text-primary)]">
                    {isToday ? 'Hoje' : format(day, 'eeee', { locale: ptBR })}
                </span>
                  <span className="text-xs text-gray-500 dark:text-[var(--text-secondary)]">Toque para adicionar ou editar</span>
              </div>
              <button
                type="button"
                  className="text-xs font-semibold text-primary-600 px-2 py-1 rounded-lg hover:bg-primary-50 transition dark:hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDayCardClick(day);
                  }}
              >
                + add
              </button>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-2 owner-grid-tight">
              {dayAgendamentos.length === 0 && (
                <p className="col-span-2 text-sm text-gray-500 dark:text-[var(--text-secondary)]">
                  Nenhum atendimento encontrado.
                </p>
              )}
              {dayAgendamentos
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                    .map((ag) => {
          const cardTone = {
            AGENDADO: 'bg-white border-gray-100',
            EM_ANDAMENTO: 'bg-amber-50 border-amber-100',
            CONCLUIDO: 'bg-emerald-50 border-emerald-100',
            CANCELADO: 'bg-red-50 border-red-100',
          }[ag.status] || 'bg-white border-gray-100';
                      return (
                        <button
                          key={ag.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(ag);
                          }}
              className={`w-full text-left rounded-xl px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-sm transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-white/12 dark:bg-white/5 ${cardTone}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-gray-900 dark:text-[var(--text-primary)]">
                              {ag.startTime ? `${ag.startTime}${ag.endTime ? ` - ${ag.endTime}` : ''}` : 'Dia todo'}
                            </span>
                    </div>
                          <p className="mt-1 text-[13px] font-semibold truncate text-gray-900 dark:text-[var(--text-primary)]">
                            {ag.customer.name}
                          </p>
                    </button>
                      );
                    })}
            </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const desktopGrid = (
    <div className="hidden md:block rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[960px] grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
          <div className="border-r border-gray-100 relative" style={{ height: `${dayColumnHeight}px` }}>
            {Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index).map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 flex items-start justify-end pr-3 text-[11px] text-gray-400"
                style={{ top: `${(hour - startHour) * 60 * minuteHeight}px` }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {weekDays.map((day) => {
            const dayAgendamentos = getAgendamentosForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`relative border-l border-gray-100 bg-white ${isToday ? 'bg-primary-50/50' : ''}`}
                style={{ height: `${dayColumnHeight}px` }}
              >
                <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase text-gray-500">{format(day, 'EEE', { locale: ptBR })}</span>
                    <span className={`text-base font-semibold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                </div>

                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index).map((hour) => (
                    <div
                      key={`line-${hour}`}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: `${(hour - startHour) * 60 * minuteHeight}px` }}
                    />
                  ))}
                </div>

                <div className="relative h-full w-full" onClick={(event) => handleDesktopSlotClick(day, event)}>
                  {dayAgendamentos.length === 0 && (
                    <button
                      type="button"
                      className="absolute inset-0 w-full text-left text-xs text-gray-400 px-3 py-2"
                      onClick={() => handleDayCardClick(day)}
                    >
                      Toque para criar
                    </button>
                  )}

                    {dayAgendamentos
                      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                      .map((ag) => {
                        const { top, height } = getEventPosition(ag);
                        return (
                          <button
                            key={ag.id}
                            type="button"
                            data-event-button="true"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(ag);
                            }}
                            className={`absolute left-1 right-1 rounded-xl px-3 py-2 text-left shadow-sm border ${statusBg[ag.status]} ${statusText[ag.status]}`}
                            style={{ top, height }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold truncate">{ag.customer.name}</div>
                          <span className="text-[11px] font-semibold">
                            {ag.startTime} {ag.endTime ? `· ${ag.endTime}` : ''}
                          </span>
                        </div>
                            {ag.notes && <p className="text-[11px] mt-1 leading-snug opacity-80 line-clamp-2">{ag.notes}</p>}
                      </button>
                        );
                      })}
                </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );

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

        <div
          className={`flex flex-wrap items-center gap-2 ${embedded ? 'hidden md:flex' : ''}`}
        >
          <div className="hidden md:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs md:text-sm font-semibold text-slate-700 shadow-sm">
            <CalendarIcon size={16} className="text-primary-500" />
            Semana atual · {format(weekStart, 'dd MMM', { locale: ptBR })} - {format(weekEnd, 'dd MMM yyyy', { locale: ptBR })}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'todos', label: 'Todos', color: 'bg-slate-900 text-white', alt: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
              { key: 'AGENDADO', label: 'Agendado', color: 'bg-blue-600 text-white', alt: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
              { key: 'EM_ANDAMENTO', label: 'Em andamento', color: 'bg-amber-500 text-white', alt: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
              { key: 'CONCLUIDO', label: 'Concluído', color: 'bg-emerald-600 text-white', alt: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as any)}
                className={`px-3 py-2 rounded-full text-sm font-semibold transition ${
                  filter === item.key ? item.color : item.alt
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleDayCardClick(currentDate)}
            className="ml-auto inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-full shadow-sm hover:bg-primary-700 transition"
          >
            Novo agendamento
          </button>
        </div>
      </div>

      {mobileList}
      {desktopGrid}

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

  const containerClasses = embedded ? 'space-y-6' : 'px-4 md:px-8 pt-0 pb-4 space-y-6';

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

