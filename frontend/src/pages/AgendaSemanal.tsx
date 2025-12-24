import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Navigation,
  Send,
  Maximize2,
  Sparkles,
  Plus,
  PencilLine,
  Clock3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appointmentsApi, customersApi, teamApi } from '../services/api';
import { agentIntentApi, type AgentMessage } from '../services/agentIntent';
import {
  emitAgentChatSync,
  loadAgentChatMessages,
  saveAgentChatMessages,
  type AgentChatMessage,
} from '../utils/agentChat';
import { Appointment, AppointmentStatus, Customer, User } from '../types';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateToYMD, parseDateFromInput } from '../utils/date';
import CreateModal, { CreateFormState } from '../components/appointments/CreateModal';
import EditModal from '../components/appointments/EditModal';
import AgendaMensal from './AgendaMensal';
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

export type WeekSummary = {
  rangeLabel: string;
  confirmCount: number;
  scheduledCount: number;
  canceledCount: number;
  totalCount: number;
  uniqueCustomers: number;
};

export type WeekAppointmentItem = {
  id: string;
  customerName: string;
  dateLabel: string;
  timeLabel: string;
  status: AppointmentStatus;
  price?: number | null;
  notes?: string | null;
};

export type WeekDetails = {
  confirm: WeekAppointmentItem[];
  scheduled: WeekAppointmentItem[];
  canceled: WeekAppointmentItem[];
};

type AgendaSemanalProps = {
  embedded?: boolean;
  quickCreateNonce?: number;
  onWeekSummaryChange?: (summary: WeekSummary | null) => void;
  onWeekDetailsChange?: (details: WeekDetails | null) => void;
};

const DEFAULT_BOT_MESSAGE: AgentChatMessage = {
  role: 'assistant',
  text: 'Olá! Pode me dizer o que precisa agendar? Por exemplo: "cliente amanhã às 14h" ou "visita segunda-feira 10h".',
};

const normalizeValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const EmptyState = ({ title, subtitle, onClick }: { title: string; subtitle: string; onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full rounded-3xl border border-purple-100 bg-white px-4 py-6 text-center shadow-sm"
  >
    <div className="mx-auto mb-4 h-32 w-32 rounded-[28px] bg-purple-50 flex items-center justify-center relative overflow-hidden">
      <div className="absolute -top-5 -right-6 h-16 w-16 rounded-full bg-purple-100" />
      <div className="absolute bottom-3 left-4 h-8 w-8 rounded-full bg-white shadow-sm border border-purple-100" />
      <div className="absolute top-6 left-5 h-6 w-6 rounded-full bg-purple-200" />
      <div className="h-14 w-14 rounded-full bg-white border border-purple-200 shadow-sm" />
    </div>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
  </button>
);

const getInitialChat = (): AgentChatMessage[] => {
  const stored = loadAgentChatMessages();
  return stored.length ? stored : [DEFAULT_BOT_MESSAGE];
};

const AgendaSemanal = ({
  embedded = false,
  quickCreateNonce = 0,
  onWeekSummaryChange,
  onWeekDetailsChange,
}: AgendaSemanalProps) => {
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
  const [showEmptyActions, setShowEmptyActions] = useState(false);
  const navigate = useNavigate();
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
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'month' | 'chat'>('week');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<AgentChatMessage[]>(getInitialChat);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPendingIntent, setChatPendingIntent] = useState<{
    intent: string;
    summary?: string;
    payload?: any;
  } | null>(null);
  const chatSyncRef = useRef('');
  const chatSyncSource = 'agenda-chat';
  const [mentionMatches, setMentionMatches] = useState<Customer[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const weekTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [weekSwipeDirection, setWeekSwipeDirection] = useState<'left' | 'right' | null>(null);

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
    setSelectedDay(baseDate);
    setShowDayActions(false);
    setShowEditModal(false);
    setShowEmptyActions(true);
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

  useEffect(() => {
    if (!weekSwipeDirection) return;
    const timer = window.setTimeout(() => setWeekSwipeDirection(null), 260);
    return () => window.clearTimeout(timer);
  }, [weekSwipeDirection]);

  useEffect(() => {
    const payload = JSON.stringify(chatMessages);
    if (payload === chatSyncRef.current) {
      saveAgentChatMessages(chatMessages);
      return;
    }
    saveAgentChatMessages(chatMessages);
    emitAgentChatSync(chatMessages, chatSyncSource);
    chatSyncRef.current = payload;
  }, [chatMessages, chatSyncSource]);

  useEffect(() => {
    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent).detail as { messages?: AgentChatMessage[]; source?: string };
      if (!detail?.messages || detail.source === chatSyncSource) return;
      const payload = JSON.stringify(detail.messages);
      chatSyncRef.current = payload;
      setChatMessages(detail.messages);
      saveAgentChatMessages(detail.messages);
    };
    window.addEventListener('agent-chat-sync', handleSync as EventListener);
    return () => window.removeEventListener('agent-chat-sync', handleSync as EventListener);
  }, [chatSyncSource]);


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

  useEffect(() => {
    const handleRefresh = () => {
      fetchAgendamentos();
    };
    window.addEventListener('agent-appointments-updated', handleRefresh as EventListener);
    return () => window.removeEventListener('agent-appointments-updated', handleRefresh as EventListener);
  }, [fetchAgendamentos]);

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
      await appointmentsApi.changeStatus(appointment.id, newStatus);
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
      const nextStatus = editForm.status === 'CONCLUIDO' ? 'EM_ANDAMENTO' : editForm.status;
      await appointmentsApi.update(editingAppointment.id, {
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime || undefined,
        price: editForm.price ? Number(editForm.price) : editingAppointment.price,
        helperFee: editForm.helperFee === '' ? undefined : Number(editForm.helperFee),
        notes: editForm.notes,
        status: nextStatus,
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
      await fetchAgendamentos();
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

  const openEmptyActions = () => {
    setShowEmptyActions(true);
  };

  const handleEmptyAi = () => {
    setShowEmptyActions(false);
    setViewMode('chat');
  };

  const handleEmptyManual = () => {
    setShowEmptyActions(false);
    const day = selectedDay ?? new Date();
    prepareCreateForm(day);
    setShowCreateModal(true);
  };

  const handleDayActionAdd = () => {
    if (!selectedDay) return;
    prepareCreateForm(selectedDay);
    setShowDayActions(false);
    setShowCreateModal(true);
  };

  const handleDayActionAi = () => {
    setShowDayActions(false);
    setViewMode('chat');
  };

  useEffect(() => {
    const handleExternalEdit = (event: Event) => {
      const detail = (event as CustomEvent).detail as { id?: string };
      if (!detail?.id) return;
      const appointment = agendamentos.find((item) => item.id === detail.id);
      if (!appointment) return;
      openEditModal(appointment);
    };
    window.addEventListener('agenda-edit-appointment', handleExternalEdit as EventListener);
    return () => window.removeEventListener('agenda-edit-appointment', handleExternalEdit as EventListener);
  }, [agendamentos]);

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

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]);
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  );

  const viewLabel =
    viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
      : viewMode === 'today'
        ? format(selectedDay, "d 'de' MMMM", { locale: ptBR })
        : `${format(weekStart, 'dd MMM', { locale: ptBR })} – ${format(weekEnd, 'dd MMM', { locale: ptBR })}`;

  const weekSummary = useMemo<WeekSummary>(() => {
    const inWeek = agendamentos.filter((ag) => {
      const date = parseDateFromInput(ag.date);
      return date >= weekStart && date <= weekEnd;
    });
    const confirmCount = inWeek.filter((ag) => ag.status === 'AGENDADO').length;
    const scheduledCount = inWeek.filter(
      (ag) => ag.status === 'EM_ANDAMENTO' || ag.status === 'CONCLUIDO',
    ).length;
    const canceledCount = inWeek.filter((ag) => ag.status === 'CANCELADO').length;
    const uniqueCustomers = new Set(inWeek.map((ag) => ag.customerId).filter(Boolean)).size;
    return {
      rangeLabel: `${format(weekStart, 'dd MMM', { locale: ptBR })} – ${format(weekEnd, 'dd MMM', { locale: ptBR })}`,
      confirmCount,
      scheduledCount,
      canceledCount,
      totalCount: inWeek.length,
      uniqueCustomers,
    };
  }, [agendamentos, weekStart, weekEnd]);

  const weekDetails = useMemo<WeekDetails>(() => {
    const inWeek = agendamentos.filter((ag) => {
      const date = parseDateFromInput(ag.date);
      return date >= weekStart && date <= weekEnd;
    });
    const mapItem = (ag: Appointment): WeekAppointmentItem => ({
      id: ag.id,
      customerName: ag.customer?.name ?? 'Cliente',
      dateLabel: format(parseDateFromInput(ag.date), 'dd MMM', { locale: ptBR }),
      timeLabel: ag.startTime ? ag.startTime : 'Dia todo',
      status: ag.status,
      price: ag.price ?? null,
      notes: ag.notes,
    });
    const confirm = inWeek.filter((ag) => ag.status === 'AGENDADO').map(mapItem);
    const scheduled = inWeek
      .filter((ag) => ag.status === 'EM_ANDAMENTO' || ag.status === 'CONCLUIDO')
      .map(mapItem);
    const canceled = inWeek.filter((ag) => ag.status === 'CANCELADO').map(mapItem);
    const byTime = (a: WeekAppointmentItem, b: WeekAppointmentItem) => a.timeLabel.localeCompare(b.timeLabel);
    return {
      confirm: confirm.sort(byTime),
      scheduled: scheduled.sort(byTime),
      canceled: canceled.sort(byTime),
    };
  }, [agendamentos, weekStart, weekEnd]);

  useEffect(() => {
    if (!onWeekSummaryChange) return;
    if (viewMode !== 'week') {
      onWeekSummaryChange(null);
      return;
    }
    onWeekSummaryChange(weekSummary);
  }, [onWeekSummaryChange, viewMode, weekSummary]);

  useEffect(() => {
    if (!onWeekDetailsChange) return;
    if (viewMode !== 'week') {
      onWeekDetailsChange(null);
      return;
    }
    onWeekDetailsChange(weekDetails);
  }, [onWeekDetailsChange, viewMode, weekDetails]);

  const handlePrevRange = () => {
    if (viewMode === 'today') {
      setCurrentDate(subDays(currentDate, 1));
      return;
    }
    if (viewMode === 'week' || viewMode === 'chat') {
      if (viewMode === 'week') {
        setWeekSwipeDirection('right');
      }
      setCurrentDate(subWeeks(currentDate, 1));
      return;
    }
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNextRange = () => {
    if (viewMode === 'today') {
      setCurrentDate(addDays(currentDate, 1));
      return;
    }
    if (viewMode === 'week' || viewMode === 'chat') {
      if (viewMode === 'week') {
        setWeekSwipeDirection('left');
      }
      setCurrentDate(addWeeks(currentDate, 1));
      return;
    }
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const getAgendamentosForDay = (day: Date, applyStatusFilter = true) => {
    let filtered = agendamentos.filter((ag) => isSameDay(parseDateFromInput(ag.date), day));

    if (applyStatusFilter && filter !== 'todos') {
      filtered = filtered.filter((ag) => ag.status === filter);
    }

    return filtered;
  };

  const statusDotBg: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-amber-400',
    EM_ANDAMENTO: 'bg-blue-500',
    CONCLUIDO: 'bg-blue-500',
    CANCELADO: 'bg-red-500',
  };
  const statusSurfaces: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-amber-50 text-amber-700 border-amber-100',
    EM_ANDAMENTO: 'bg-blue-50 text-blue-700 border-blue-100',
    CONCLUIDO: 'bg-blue-50 text-blue-700 border-blue-100',
    CANCELADO: 'bg-red-50 text-red-700 border-red-100',
  };
  const statusAccents: Record<AppointmentStatus, string> = {
    AGENDADO: 'border-l-4 border-amber-300',
    EM_ANDAMENTO: 'border-l-4 border-blue-300',
    CONCLUIDO: 'border-l-4 border-blue-300',
    CANCELADO: 'border-l-4 border-red-300',
  };

  const formatStatusLabel = (status: AppointmentStatus) => {
    if (status === 'AGENDADO') return 'A confirmar';
    if (status === 'CANCELADO') return 'Cancelado';
    return 'Agendado';
  };

  const handleSendChat = async (value?: string) => {
    const text = (value ?? chatInput).trim();
    if (!text || chatLoading) return;

    const userMessage: AgentChatMessage = { role: 'user', text };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setMentionOpen(false);
    setMentionMatches([]);
    setMentionIndex(0);

    setChatLoading(true);
    try {
      const history = [...chatMessages, userMessage].map((msg) => ({
        role: msg.role,
        text: msg.text,
      })) as AgentMessage[];

      const response = await agentIntentApi.parse(text, history, {
        page: 'agenda-semanal',
        currentDate: currentDate.toISOString(),
        customerNames: customers.map((c) => c.name),
        guidance:
          'Se o nome do cliente estiver ambíguo ou diferente da lista, peça confirmação ou sugira o mais próximo.',
      });

      if (
        response.intent === 'create_appointment' &&
        !response.requiresConfirmation &&
        response.payload
      ) {
        const result = await agentIntentApi.execute(response.intent as any, response.payload);
        if (result.answer) {
          setChatMessages((prev) => [...prev, { role: 'assistant', text: result.answer! }]);
          window.dispatchEvent(new CustomEvent('agent-appointments-updated'));
          return;
        }
      }

      let botText = response.answer || response.summary;
      if (response.requiresConfirmation) {
        setChatPendingIntent({
          intent: response.intent,
          summary: response.summary,
          payload: response.payload,
        });
        botText = response.summary || 'Posso executar esta ação. Confirma?';
      }
      if (!botText) {
        if (response.error) {
          botText = 'Não entendi bem (nome/cliente ficou incerto). Pode confirmar o nome do cliente?';
        } else {
          botText =
            'Para seguir, preciso confirmar o nome do cliente e horário. Pode repetir com o nome exato ou corrigido?';
        }
      }

      setChatMessages((prev) => [...prev, { role: 'assistant', text: botText }]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Não consegui falar com o agente agora. Tente novamente em instantes.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatConfirm = async () => {
    if (!chatPendingIntent) return;
    setChatLoading(true);
    try {
      const result = await agentIntentApi.execute(chatPendingIntent.intent as any, chatPendingIntent.payload);
      if (result.answer) {
        setChatMessages((prev) => [...prev, { role: 'assistant', text: result.answer! }]);
        window.dispatchEvent(new CustomEvent('agent-appointments-updated'));
      }
      setChatPendingIntent(null);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Não consegui executar agora. Tente novamente.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const updateMentionState = (value: string) => {
    const match = value.match(/(^|\s)@([\wÀ-ÿ0-9._-]*)$/);
    if (!match || match[2].length < 1) {
      setMentionOpen(false);
      setMentionMatches([]);
      setMentionIndex(0);
      return;
    }
    const query = normalizeValue(match[2]);
    const matches = customers
      .filter((customer) => normalizeValue(customer.name).includes(query))
      .slice(0, 6);
    setMentionMatches(matches);
    setMentionOpen(matches.length > 0);
    setMentionIndex(0);
  };

  const applyMention = (name: string) => {
    const match = chatInput.match(/(^|\s)@([\wÀ-ÿ0-9._-]*)$/);
    if (!match) return;
    const query = match[2];
    const atIndex = chatInput.lastIndexOf(`@${query}`);
    if (atIndex === -1) return;
    const before = chatInput.slice(0, atIndex);
    const after = chatInput.slice(atIndex + query.length + 1);
    const nextValue = `${before}@${name} ${after}`.replace(/\s+/g, ' ').trimStart();
    setChatInput(nextValue);
    setMentionOpen(false);
    setMentionMatches([]);
    setMentionIndex(0);
  };

  const renderChatView = () => (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Chat</p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-agent'))}
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            <Maximize2 size={14} />
            Expandir
          </button>
        </div>
        <div className="flex flex-col gap-4 max-h-[72vh] overflow-y-auto pr-1">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-sm'
                    : 'bg-slate-50 text-slate-900 border border-slate-200 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {chatPendingIntent && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-2">
              <div>{chatPendingIntent.summary || 'Confirmar esta ação?'}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleChatConfirm}
                  className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold"
                  disabled={chatLoading}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setChatPendingIntent(null)}
                  className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={chatLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {chatMessages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {[
                '@Vito amanhã 10h limpeza',
                'Editar @Vito para amanhã 15h',
                'Cancelar @Vito dia 12 às 10h',
                'Quantos agendamentos hoje?',
                'Clientes com agendamentos futuros',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendChat(prompt)}
                  className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  updateMentionState(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (mentionOpen && mentionMatches.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setMentionIndex((prev) => (prev + 1) % mentionMatches.length);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setMentionIndex((prev) => (prev - 1 + mentionMatches.length) % mentionMatches.length);
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyMention(mentionMatches[mentionIndex].name);
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setMentionOpen(false);
                      return;
                    }
                  }
                  if (e.key === 'Enter') handleSendChat();
                }}
                placeholder="Ex: @Vito amanhã 10h limpeza"
                className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => handleSendChat()}
                disabled={chatLoading}
                className={`h-10 w-10 rounded-full flex items-center justify-center transition ${
                  chatLoading
                    ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
                aria-label="Enviar mensagem"
              >
                <Send size={16} />
              </button>
            </div>
            {mentionOpen && mentionMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20">
                {mentionMatches.map((customer, index) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => applyMention(customer.name)}
                    className={`w-full px-4 py-2 text-left text-sm transition ${
                      index === mentionIndex ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    @{customer.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[12px] text-slate-500 text-center">
            Dica: escreva naturalmente, como se estivesse anotando sua agenda.
          </p>
          {chatLoading && (
            <p className="text-[12px] text-slate-500 text-center">O agente está escrevendo...</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderWeekSection = () => {
    const hasAny = weekDays.some((day) => getAgendamentosForDay(day).length > 0);

    return (
      <div className="space-y-4 px-4 md:px-5">
        <div className="space-y-4">

          {/* Grid de 7 dias */}
          <div
            className={`grid grid-cols-7 gap-2 rounded-xl bg-white border border-slate-200 px-2 py-3 sticky top-0 z-10 ${
              weekSwipeDirection === 'left'
                ? 'animate-week-swipe-left'
                : weekSwipeDirection === 'right'
                  ? 'animate-week-swipe-right'
                  : ''
            }`}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              weekTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = weekTouchStartRef.current;
              weekTouchStartRef.current = null;
              if (!start) return;
              const touch = event.changedTouches[0];
              const deltaX = touch.clientX - start.x;
              const deltaY = touch.clientY - start.y;
              if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY)) {
                return;
              }
              if (deltaX < 0) {
                setWeekSwipeDirection('left');
                setCurrentDate(addWeeks(currentDate, 1));
                return;
              }
              setWeekSwipeDirection('right');
              setCurrentDate(subWeeks(currentDate, 1));
            }}
          >
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
                  className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 transition ${
                    isSelected ? 'bg-primary-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-primary-700' : 'text-slate-500'}`}>
                    {weekdayLabels[index]}
                  </span>
                  <span
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isSelected
                        ? 'bg-primary-600 text-white shadow-sm'
                        : today
                          ? 'bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                          : 'bg-white text-slate-900 border border-slate-200'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayAppointments.length > 0 ? (
                    <div className="flex items-center gap-1">
                      {dayAppointments.slice(0, 3).map((ag) => (
                        <div
                          key={ag.id}
                          className={`w-2 h-2 rounded-full ${
                            statusDotBg[ag.status] ?? 'bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="h-2" />
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {!hasAny ? (
          <EmptyState
            title="Ainda nao ha tarefas."
            subtitle="Toque em '+' para comecar a planejar a semana."
            onClick={openEmptyActions}
          />
        ) : (
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

            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                <span>A confirmar</span>
              </div>
              <span className="h-px w-6 bg-slate-200" aria-hidden />
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                <span>Agendado</span>
              </div>
            </div>

            {getAgendamentosForDay(selectedDay, false).length === 0 ? (
              <EmptyState
                title="Nenhum agendamento para este dia."
                subtitle="Toque em '+' para adicionar um novo."
                onClick={openEmptyActions}
              />
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
                        className={`w-full text-left rounded-xl px-3 py-2 shadow-sm border transition ${statusSurfaces[ag.status] ?? 'bg-slate-100 text-slate-800 border-slate-200'} ${statusAccents[ag.status] ?? 'border-l-4 border-slate-200'} pl-4`}
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
        )}
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
          return 'border-blue-500';
        case 'EM_ANDAMENTO':
          return 'border-blue-500';
        case 'AGENDADO':
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
          <EmptyState
            title="Ainda nao ha tarefas."
            subtitle="Toque em '+' para comecar a planejar o dia."
            onClick={openEmptyActions}
          />
        ) : (
          <div className="relative pl-10">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" aria-hidden />
            <div className="space-y-4">
              {dayAppointments.map((ag) => {
                const start = ag.startTime || 'Dia todo';
                const end = ag.endTime ? ` · ${ag.endTime}` : '';
                return (
                  <div key={ag.id} className="relative flex gap-4">
                    <div className="flex flex-col items-center w-12 shrink-0 gap-1">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <span>{start}</span>
                        {ag.endTime ? <span className="text-slate-400">{end}</span> : null}
                      </div>
                      <div className={`h-2 w-2 rounded-full border-2 bg-white ${dotsColor(ag.status)}`} />
                    </div>
                    <div
                      className={`flex-1 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm ${
                        statusAccents[ag.status] ?? 'border-l-4 border-slate-200'
                      }`}
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
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold text-slate-900 truncate">{ag.customer.name}</span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {formatStatusLabel(ag.status)}
                          </span>
                      </div>
                      {ag.notes ? <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ag.notes}</p> : null}
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
        <div className="-mx-3 sm:-mx-4 md:-mx-8 -mt-3 bg-white border-b border-slate-200 px-3 sm:px-4 md:px-8 pt-2 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-2 py-2">
              <button
                type="button"
                onClick={handlePrevRange}
                className="p-2 rounded-full text-slate-700 hover:bg-white"
                aria-label="Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-3 py-1.5 rounded-full bg-white text-sm font-semibold text-slate-900">
                {viewLabel}
              </div>
              <button
                type="button"
                onClick={handleNextRange}
                className="p-2 rounded-full text-slate-700 hover:bg-white"
                aria-label="Próximo"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setCurrentDate(today);
                  setSelectedDay(today);
                }}
                className="px-3 py-1.5 rounded-full bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
              >
                Hoje
              </button>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-semibold text-slate-700">
              {['today', 'week', 'month', 'chat'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as 'today' | 'week' | 'month' | 'chat')}
                  className={`px-3 py-2 rounded-full transition ${
                    viewMode === mode ? 'bg-primary-600 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  {mode === 'today' ? 'Hoje' : mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Chat'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {viewMode === 'today' && renderTodayTimeline()}
        {viewMode === 'week' && renderWeekSection()}
        {viewMode === 'month' && <AgendaMensal embedded />}
        {viewMode === 'chat' && renderChatView()}
      </div>

      {viewMode !== 'chat' && viewMode !== 'month' && (
        <button
          type="button"
          onClick={() => setShowEmptyActions(true)}
          className="fixed right-4 bottom-24 z-50 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 transition"
        >
          + Agendar
        </button>
      )}

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
          onAi={handleDayActionAi}
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
      {showEmptyActions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-6">
          <div
            className="fixed inset-0 bg-black/50 animate-sheet-fade"
            onClick={() => setShowEmptyActions(false)}
          />
          <div className="relative w-full max-w-md mx-4 rounded-3xl bg-white px-5 pt-4 pb-6 shadow-2xl animate-sheet-rise border border-slate-100">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleEmptyAi}
                className="w-full rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-fuchsia-50 px-4 py-3 text-left shadow-sm transition hover:border-indigo-200"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white flex items-center justify-center shadow-md">
                    <Sparkles size={20} />
                    <span className="absolute -top-1 -right-1 rounded-full bg-white text-[9px] font-semibold text-indigo-600 px-1.5 py-0.5 shadow">
                      PRO
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Criar com assistente de IA</p>
                    <p className="text-xs text-slate-500">Descreva o agendamento e eu monto pra você.</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={handleEmptyManual}
                className="w-full rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-100/70"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Plus size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Criar por mim mesmo</p>
                    <p className="text-xs text-emerald-700">Abrir o formulário de novo agendamento.</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
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

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowEditOptions((prev) => !prev)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-white"
              >
                Editar informações
                <span className="block text-xs font-normal text-slate-500">Endereço, horário e detalhes</span>
              </button>
              {showEditOptions && (
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (customerInfo?.id) {
                        navigate(`/app/clientes?customerId=${customerInfo.id}`);
                      }
                    }}
                    className="w-full rounded-2xl border border-primary-200 bg-white px-4 py-3 text-left text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-primary-50"
                  >
                    Editar endereço (clientes)
                  </button>
                  <button
                    type="button"
                    onClick={openEditModalForCustomer}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Editar horário (agendamento)
                  </button>
                </div>
              )}
            </div>

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
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
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
                  void handleQuickStatus('EM_ANDAMENTO');
                  setCustomerInfo(null);
                }}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Go (iniciar limpeza)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type DayActionsModalProps = {
  date: Date;
  appointments: Appointment[];
  onAi: () => void;
  onAdd: () => void;
  onEdit: (appointment: Appointment) => void;
  onClose: () => void;
  formatCurrency: (value: number) => string;
};

const DayActionsModal = ({ date, appointments, onAi, onAdd, onEdit, onClose, formatCurrency }: DayActionsModalProps) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center">
    <div className="fixed inset-0 bg-black/50 animate-sheet-fade" onClick={onClose} />
    <div className="relative z-10 w-full max-w-md rounded-t-[28px] bg-white shadow-2xl animate-sheet-rise">
      <div className="px-5 pt-4 pb-6 space-y-5">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Novo agendamento</p>
            <p className="text-base font-semibold text-slate-900">
              {format(date, "EEEE',' dd 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-xs text-slate-500">Escolha como deseja criar.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onAi}
            className="w-full rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-fuchsia-50 px-4 py-3 text-left transition hover:border-indigo-200"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white flex items-center justify-center shadow-md">
                <Sparkles size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Criar com assistente de IA</p>
                <p className="text-xs text-slate-500">Descreva o cliente e o horário.</p>
              </div>
              <span className="rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white">PRO</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onAdd}
            className="w-full rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-100/70"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <Plus size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Criar por mim mesmo</p>
                <p className="text-xs text-emerald-700">Abrir o formulário completo.</p>
              </div>
            </div>
          </button>
        </div>

        {appointments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ou edite um existente
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {appointments.map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => onEdit(appointment)}
                  className="w-full text-left rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-primary-300 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-slate-900/90 text-white flex items-center justify-center">
                      <PencilLine size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{appointment.customer.name}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(appointment.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock3 size={14} />
                      <span>{appointment.startTime}</span>
                    </div>
                  </div>
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
