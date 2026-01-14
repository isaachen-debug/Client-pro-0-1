import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MOCK_TEAM, MOCK_APPOINTMENTS_UPDATE } from '../constants/mocks';
import { AnimatePresence } from 'framer-motion';

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MapPin,
  Navigation,
  Phone,
  Send,
  Sparkles,
  Plus,
  PencilLine,
  Clock3,
  Calendar,
  Search,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { LayoutGroup, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { appointmentsApi, customersApi, teamApi, transactionsApi } from '../services/api';
import { agentIntentApi } from '../services/agentIntent';
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
import { JobCardModal } from '../components/appointments/JobCardModal';
import CreateModal, { CreateFormState } from '../components/appointments/CreateModal';
import EditModal from '../components/appointments/EditModal';
import CompletionModal from '../components/appointments/CompletionModal';
import AgendaMensal from './AgendaMensal';
import { getGoogleStatus, syncGoogleEvent } from '../services/googleCalendar';
import { usePreferences } from '../contexts/PreferencesContext';
import { NavigationChoiceModal } from '../components/ui/NavigationChoiceModal';

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
  initialMode?: 'today' | 'week' | 'month' | 'chat';
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

const pad = (value: number) => value.toString().padStart(2, '0');

const buildGoogleEventPayload = (appointment: Appointment) => {
  try {
    // Parse the date properly - appointment.date might be a timestamp or ISO string
    const appointmentDate = typeof appointment.date === 'string'
      ? appointment.date.split('T')[0]  // Get just the date part if it's ISO
      : appointment.date;

    const start = new Date(`${appointmentDate}T${appointment.startTime}`);

    // Validate the date is valid
    if (isNaN(start.getTime())) {
      console.error('Invalid start date/time:', appointmentDate, appointment.startTime);
      return null;
    }

    const end = appointment.endTime
      ? new Date(`${appointmentDate}T${appointment.endTime}`)
      : new Date(start.getTime() + 60 * 60 * 1000);

    const customerName = appointment.customer?.name || 'Agendamento';
    const serviceLabel = appointment.customer?.serviceType;
    const summary = serviceLabel ? `${customerName} - ${serviceLabel}` : customerName;
    const description = appointment.notes || undefined;
    const location = appointment.customer?.address || undefined;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
    const formatDateTime = (value: Date) => format(value, "yyyy-MM-dd'T'HH:mm:ss");

    return {
      summary,
      description,
      start: formatDateTime(start),
      end: formatDateTime(end),
      timeZone,
      location,
      appointmentId: appointment.id,
    };
  } catch (error) {
    console.error('Error building Google event payload:', error);
    return null;
  }
};

const EmptyState = ({ title, subtitle, onClick }: { title: string; subtitle: string; onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full rounded-3xl border border-purple-100 dark:border-purple-900/30 bg-white dark:bg-slate-800 px-4 py-6 text-center shadow-sm"
  >
    <div className="mx-auto mb-4 h-32 w-32 rounded-[28px] bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/30 shadow-sm flex items-center justify-center overflow-hidden">
      <img
        src="/images/empty-state-cleanup.svg"
        alt="Mascote vassoura limpando com nuvem e check"
        loading="lazy"
        className="h-full w-full object-contain"
      />
    </div>
    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
  </button>
);

const getInitialChat = (): AgentChatMessage[] => {
  const stored = loadAgentChatMessages();
  return stored.length ? stored : [DEFAULT_BOT_MESSAGE];
};

const AgendaSemanal = ({
  quickCreateNonce = 0,
  initialMode,
  onWeekSummaryChange,
  onWeekDetailsChange,
}: AgendaSemanalProps) => {
  const { isTeamMode } = useOutletContext<{ isTeamMode: boolean }>();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { theme } = usePreferences();
  const isDark = theme === 'dark';
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
  const [selectedJob, setSelectedJob] = useState<Appointment | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<Customer | null>(null);
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
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'month' | 'chat'>(
    () => initialMode ?? 'week',
  );
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
  const [createYear, setCreateYear] = useState(new Date().getFullYear());
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionMatches, setMentionMatches] = useState<Customer[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    customerId: '',
    month: format(new Date(), 'MM'),
    day: format(new Date(), 'dd'),
    startTime: '',
    endTime: '',
    price: '',
    helperFee: '',
    notes: '',
    isRecurring: false,
    recurrenceRule: '',
    assignedHelperId: '',
  });

  const [navigationModal, setNavigationModal] = useState<{ isOpen: boolean; address: string | null }>({
    isOpen: false,
    address: null,
  });

  const handleNavigate = (address: string | null) => {
    if (address) {
      setNavigationModal({ isOpen: true, address });
    }
  };

  useEffect(() => {
    if (quickCreateNonce > 0) {
      handleDayActionAdd();
    }
  }, [quickCreateNonce]);

  useEffect(() => {
    const checkGoogle = async () => {
      try {
        const result = await getGoogleStatus();
        setGoogleConnected(!!result);
      } catch (e) {
        console.error(e);
      }
    };
    checkGoogle();
  }, []);

  const { user } = useAuth();

  const fetchAgendamentos = async () => {
    try {
      setLoading(true);
      let data: Appointment[] = [];
      if (viewMode === 'month') {
        data = await appointmentsApi.listByMonth(
          currentDate.getMonth() + 1,
          currentDate.getFullYear(),
        );
      } else {
        const start = format(
          startOfWeek(currentDate, { weekStartsOn: 0 }),
          'yyyy-MM-dd',
        );
        data = await appointmentsApi.listByWeek(start);
      }
      setAgendamentos(data);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
  }, [currentDate, viewMode]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cData, tData] = await Promise.all([customersApi.list(), teamApi.list()]);
        setCustomers(cData);
        setHelpers((tData as any).members || tData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    loadData();
  }, []);

  // Synchronize dates when switching views
  const previousViewMode = useRef(viewMode);
  useEffect(() => {
    // Only sync when viewMode actually changes
    if (previousViewMode.current !== viewMode) {
      if (viewMode === 'today') {
        // When switching TO Today view, sync selectedDay with currentDate
        setSelectedDay(currentDate);
      } else {
        // When switching FROM Today view, sync currentDate with selectedDay
        setCurrentDate(selectedDay);
      }
      previousViewMode.current = viewMode;
    }
  }, [viewMode, currentDate, selectedDay]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !createForm.customerId ||
      !createForm.month ||
      !createForm.day ||
      !createForm.startTime ||
      !createForm.price
    ) {
      return;
    }
    const monthNumber = Number(createForm.month);
    const dayNumber = Number(createForm.day);
    const daysInMonth = new Date(createYear, monthNumber, 0).getDate();

    if (
      Number.isNaN(monthNumber) ||
      Number.isNaN(dayNumber) ||
      monthNumber < 1 ||
      monthNumber > 12 ||
      dayNumber < 1 ||
      dayNumber > daysInMonth
    ) {
      setDateError('Selecione um dia válido para o mês escolhido.');
      return;
    }

    const composedDate = `${createYear}-${pad(monthNumber)}-${pad(dayNumber)}`;
    const selectedDate = parseDateFromInput(composedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setDateError('A data não pode ser no passado.');
      return;
    }
    setDateError('');
    setSaving(true);
    try {
      const payload: any = {
        customerId: createForm.customerId,
        date: composedDate,
        startTime: createForm.startTime,
        endTime: createForm.endTime || undefined,
        price: Number(createForm.price),
        status: 'AGENDADO',
        notes: createForm.notes,
        isRecurring: createForm.isRecurring,
        recurrenceRule: createForm.isRecurring ? createForm.recurrenceRule : undefined,
      };
      if (createForm.helperFee) payload.helperFee = Number(createForm.helperFee);
      if (createForm.assignedHelperId) payload.assignedHelperId = createForm.assignedHelperId;
      const newAppt = await appointmentsApi.create(payload);
      if (googleConnected) {
        try {
          const googlePayload = buildGoogleEventPayload(newAppt);
          if (googlePayload) {
            await syncGoogleEvent(googlePayload);
          }
        } catch (googleError) {
          console.warn('Failed to sync with Google Calendar, but appointment was created:', googleError);
        }
      }
      setShowCreateModal(false);
      fetchAgendamentos();
      setCreateForm({
        customerId: '',
        month: format(new Date(), 'MM'),
        day: format(new Date(), 'dd'),
        startTime: '',
        endTime: '',
        price: '',
        helperFee: '',
        notes: '',
        isRecurring: false,
        recurrenceRule: '',
        assignedHelperId: '',
      });
    } catch (error) {
      console.error('Erro ao criar:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!editingAppointment) return;
    if (!window.confirm('Tem certeza que deseja excluir TODA a série?')) return;
    try {
      await appointmentsApi.deleteSeries(editingAppointment.id);
      setShowEditModal(false);
      setEditingAppointment(null);
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao excluir série:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;
    setSaving(true);
    try {
      const payload: any = {
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        price: Number(editForm.price),
        status: editForm.status,
        notes: editForm.notes,
        isRecurring: editForm.isRecurring,
        recurrenceRule: editForm.isRecurring ? editForm.recurrenceRule : undefined,
      };
      if (editForm.helperFee) payload.helperFee = Number(editForm.helperFee);
      payload.assignedHelperId = editForm.assignedHelperId || null;
      const updated = await appointmentsApi.update(editingAppointment.id, payload);
      if (googleConnected) {
        try {
          const googlePayload = buildGoogleEventPayload(updated);
          if (googlePayload) {
            await syncGoogleEvent(googlePayload);
          }
        } catch (googleError) {
          console.warn('Failed to sync with Google Calendar, but appointment was updated:', googleError);
        }
      }
      setShowEditModal(false);
      setEditingAppointment(null);
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao editar:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (status: AppointmentStatus) => {
    if (!editingAppointment) return;
    setSaving(true);
    try {
      await appointmentsApi.changeStatus(editingAppointment.id, status);
      setShowEditModal(false);
      setEditingAppointment(null);
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDayCardClick = (day: Date) => {
    setSelectedDay(day);
    const apps = getAgendamentosForDay(day);
    setSelectedDayAppointments(apps);
    setShowDayActions(true);
  };

  const handleSendChat = async (text: string) => {
    // Basic chat sending logic
    console.log('Sending chat:', text);
  };

  const handleDayActionAi = () => {
    setShowDayActions(false);
    setViewMode('chat');
    setTimeout(() => {
      handleSendChat(
        `O que tenho para dia ${format(selectedDay, 'dd/MM')}? Sugira melhorias.`,
      );
    }, 500);
  };

  const openCreateModal = (
    preSelectedDate?: Date,
    preSelectedCustomer?: Customer,
    preSelectedHelper?: User,
  ) => {
    const baseDate = preSelectedDate ?? new Date();
    setCreateYear(baseDate.getFullYear());
    setCreateForm((prev) => ({
      ...prev,
      month: format(baseDate, 'MM'),
      day: format(baseDate, 'dd'),
      customerId: preSelectedCustomer?.id || '',
      assignedHelperId: preSelectedHelper?.id || '',
      price: preSelectedCustomer?.defaultPrice?.toString() || '',
    }));
    setShowCreateModal(true);
  };

  const handleDayActionAdd = () => {
    setShowDayActions(false);
    openCreateModal(selectedDay);
  };

  const openEmptyActions = () => {
    setShowEmptyActions(true);
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
    // Open directly instead of intermediate modal
    setShowEditModal(true);
  };

  const openCustomerInfo = (appointment: Appointment) => {
    setSelectedJob(appointment);
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

  const handleCompleteService = async (data: {
    finalPrice: number;
    paymentStatus: 'PENDENTE' | 'PAGO';
    sendInvoice: boolean;
    shareVia: 'none' | 'sms' | 'email';
  }) => {
    if (!editingAppointment) return;
    setSaving(true);
    try {
      // 1. Atualizar agendamento (status e preço se mudou)
      const result = await appointmentsApi.changeStatus(editingAppointment.id, 'CONCLUIDO', {
        sendInvoice: data.sendInvoice
      });

      // 2. Se o status de pagamento for PAGO, precisamos atualizar a transação
      // Como o backend cria como PENDENTE por padrão, vamos precisar de uma chamada extra
      // ou ajustar o backend depois.
      if (data.paymentStatus === 'PAGO') {
        // Buscar a transação recém criada
        const appointmentDetails = await appointmentsApi.get(editingAppointment.id);
        const transaction = appointmentDetails.transactions?.find((t: any) => t.type === 'RECEITA');
        if (transaction) {
          await transactionsApi.updateStatus(transaction.id, 'PAGO');
        }
      }

      if (data.sendInvoice && data.shareVia !== 'none' && result.invoiceUrl) {
        const message = `Olá! Sua fatura da limpeza está pronta: ${result.invoiceUrl}`;
        if (data.shareVia === 'sms' && editingAppointment.customer.phone) {
          window.location.href = `sms:${editingAppointment.customer.phone.replace(/\D/g, '')}?body=${encodeURIComponent(message)}`;
        } else if (data.shareVia === 'email' && editingAppointment.customer.email) {
          window.location.href = `mailto:${editingAppointment.customer.email}?subject=Fatura da Limpeza&body=${encodeURIComponent(message)}`;
        }
      }

      setShowCompletionModal(false);
      setEditingAppointment(null);
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao concluir serviço:', error);
    } finally {
      setSaving(false);
    }
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
        ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR })
        : viewMode === 'chat'
          ? 'Mensagens'
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

  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    if (viewMode === 'today') {
      setCurrentDate((prev) => (newDirection > 0 ? addDays(prev, 1) : subDays(prev, 1)));
    } else if (viewMode === 'week' || viewMode === 'chat') {
      setCurrentDate((prev) => (newDirection > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1)));
    } else if (viewMode === 'month') {
      setCurrentDate((prev) => (newDirection > 0 ? addMonths(prev, 1) : subMonths(prev, 1)));
    }
  };

  const handlePrevRange = () => {
    setDirection(-1);
    if (viewMode === 'today') {
      setSelectedDay((prev) => {
        const nextDate = subDays(prev, 1);
        setCurrentDate(nextDate);
        return nextDate;
      });
      return;
    }
    if (viewMode === 'week' || viewMode === 'chat') {
      setCurrentDate((prev) => subWeeks(prev, 1));
      return;
    }
    setCurrentDate((prev) => subMonths(prev, 1));
  };

  const handleNextRange = () => {
    setDirection(1);
    if (viewMode === 'today') {
      setSelectedDay((prev) => {
        const nextDate = addDays(prev, 1);
        setCurrentDate(nextDate);
        return nextDate;
      });
      return;
    }
    if (viewMode === 'week' || viewMode === 'chat') {
      setCurrentDate((prev) => addWeeks(prev, 1));
      return;
    }
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  const getAgendamentosForDay = (day: Date, applyStatusFilter = true) => {
    let filtered = agendamentos.filter((ag) => isSameDay(parseDateFromInput(ag.date), day));

    // Team Mode Logic
    if (isTeamMode) {
      filtered = MOCK_APPOINTMENTS_UPDATE(filtered);
      if (selectedMemberId) {
        filtered = filtered.filter(a => a.assignedTo?.includes(selectedMemberId));
      }
    }

    if (applyStatusFilter && filter !== 'todos') {
      filtered = filtered.filter((ag) => ag.status === filter);
    }

    return filtered;
  };

  const statusDotBg: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-amber-400',
    NAO_CONFIRMADO: 'bg-yellow-400',
    EM_ANDAMENTO: 'bg-blue-500',
    CONCLUIDO: 'bg-emerald-500',
    CANCELADO: 'bg-red-500',
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  const statusSurfaces: Record<AppointmentStatus, string> = {
    AGENDADO: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
    NAO_CONFIRMADO: 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800',
    EM_ANDAMENTO: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
    CONCLUIDO: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800',
    CANCELADO: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800',
  };
  const statusAccents: Record<AppointmentStatus, string> = {
    AGENDADO: 'border-l-4 border-amber-300 dark:border-amber-600',
    NAO_CONFIRMADO: 'border-l-4 border-yellow-300 dark:border-yellow-600',
    EM_ANDAMENTO: 'border-l-4 border-blue-300 dark:border-blue-600',
    CONCLUIDO: 'border-l-4 border-emerald-300 dark:border-emerald-600',
    CANCELADO: 'border-l-4 border-red-300 dark:border-red-600',
  };

  const formatStatusLabel = (status: AppointmentStatus) => {
    if (status === 'NAO_CONFIRMADO') return 'Não confirmado';
    if (status === 'AGENDADO') return 'Agendado';
    if (status === 'CANCELADO') return 'Cancelado';
    if (status === 'CONCLUIDO') return 'Feito';
    return 'Agendado';
  };

  const [selectedChatCustomer, setSelectedChatCustomer] = useState<Customer | null>(null);

  const renderChatView = () => {
    if (selectedChatCustomer) {
      return (
        <div className={`h-full flex flex-col rounded-3xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedChatCustomer(null)}
                className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <ChevronLeft size={20} />
              </button>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${isDark ? 'bg-indigo-600' : 'bg-indigo-500'}`}>
                {getInitials(selectedChatCustomer.name)}
              </div>
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedChatCustomer.name}</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Online agora</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${selectedChatCustomer.phone}`} className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}>
                <Phone size={20} />
              </a>
            </div>
          </div>

          <div className={`flex-1 p-4 overflow-y-auto space-y-4 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
            <div className="flex justify-center">
              <span className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>Hoje</span>
            </div>
            <div className="flex justify-start">
              <div className={`max-w-[80%] rounded-2xl rounded-tl-none px-4 py-3 shadow-sm ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-800'}`}>
                <p className="text-sm">Olá, {selectedChatCustomer.name.split(' ')[0]}! Tudo certo para o serviço?</p>
                <span className={`text-[10px] block mt-1 text-right ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>09:41</span>
              </div>
            </div>
          </div>

          <div className={`p-3 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
            <div className="flex items-center gap-2">
              <button className={`p-2 rounded-full ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
                <Plus size={20} />
              </button>
              <div className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <input
                  type="text"
                  placeholder="Mensagem..."
                  className={`bg-transparent flex-1 outline-none text-sm ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
                />
              </div>
              <button className={`p-2.5 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all`}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`h-full flex flex-col rounded-3xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <Search size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
            <input
              type="text"
              placeholder="Buscar conversas..."
              className={`bg-transparent flex-1 outline-none text-sm ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {customers.map((customer, i) => (
            <button
              key={customer.id}
              onClick={() => setSelectedChatCustomer(customer)}
              className={`w-full flex items-center gap-4 p-4 border-b transition-colors ${isDark ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-50 hover:bg-slate-50'}`}
            >
              <div className="relative">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${['bg-pink-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500'][i % 5]
                  }`}>
                  {getInitials(customer.name)}
                </div>
                {i < 2 && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
                    {2 - i}
                  </div>
                )}
              </div>

              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{customer.name}</h3>
                  <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {['09:41', 'Ontem', 'Seg', 'Dom'][i % 4]}
                  </span>
                </div>
                <p className={`text-sm truncate ${i < 2 ? (isDark ? 'text-white font-semibold' : 'text-slate-900 font-semibold') : (isDark ? 'text-slate-500' : 'text-slate-500')}`}>
                  {['Oi! Tudo confirmado para amanhã?', 'Pode me enviar o comprovante?', 'Precisamos remarcar a próxima visita.', 'Ótimo trabalho hoje, obrigada!'][i % 4]}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const getDuration = (start?: string, end?: string) => {
    if (!start || !end) return '';
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}m dur.` : `${h}h dur.`) : `${m}m dur.`;
  };

  const renderCustomerName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    const first = parts[0];
    const rest = parts.slice(1).join(' ');
    return (
      <div className="truncate min-w-0">
        <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{first}</span>
        {rest && (
          <span className={`hidden min-[450px]:inline font-normal ml-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {rest}
          </span>
        )}
      </div>
    );
  };

  const renderWeekSection = () => {
    const hasAny = weekDays.some((day) => getAgendamentosForDay(day).length > 0);

    return (
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={format(currentDate, 'yyyy-MM-dd') + '-content'}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          dragDirectionLock
          onDragEnd={(event, { offset, velocity }) => {
            void event;
            const swipe = swipePower(offset.x, velocity.x);

            if (swipe < -10000) {
              paginate(1);
            } else if (swipe > 10000) {
              paginate(-1);
            }
          }}
          className="space-y-4 px-2 md:px-5"
        >
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
                  <p className={`text-[11px] uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {format(selectedDay, 'EEEE', { locale: ptBR })}
                  </p>
                  <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {user?.teamEnabled && helpers.length > 0 && (
                    <div className="flex -space-x-2 mb-1">
                      {helpers.map((helper) => (
                        <div
                          key={helper.id}
                          className={`h-6 w-6 rounded-full border-2 ${isDark ? 'border-slate-900' : 'border-white'} overflow-hidden bg-slate-200`}
                          title={helper.name}
                        >
                          {helper.avatarUrl ? (
                            <img src={helper.avatarUrl} alt={helper.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-slate-500">
                              {getInitials(helper.name)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDayCardClick(selectedDay)}
                    className={`text-xs font-semibold ${isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-primary-600 hover:text-primary-700'}`}
                  >
                    + Agendar
                  </button>
                </div>
              </div>

              <div className={`flex items-center gap-2 text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                  <span>Não confirmado</span>
                </div>
                <span className={`h-px w-6 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} aria-hidden />
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
                <div className="relative space-y-4">
                  {getAgendamentosForDay(selectedDay, false)
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                    .map((ag, idx, arr) => {
                      const start = ag.startTime || 'Dia todo';
                      const end = ag.endTime ? ` · ${ag.endTime}` : '';
                      const isLast = idx === arr.length - 1;
                      const initials = getInitials(ag.customer.name);
                      return (
                        <div
                          key={ag.id}
                          className="relative animate-cascade"
                          style={{ animationDelay: `${idx * 100}ms` }}
                        >
                          <div className="relative flex gap-3 pb-2">
                            <div className="flex flex-col items-end w-10 text-right shrink-0">
                              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{start}</span>
                              <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {getDuration(start, ag.endTime)}
                              </span>
                            </div>
                            <div className={`relative border-l-2 ${isDark ? 'border-slate-800' : 'border-slate-200'} ml-3 pl-3 pb-4 flex-1`}>
                              <div className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ${statusDotBg[ag.status] ?? 'bg-slate-400'}`} />
                              <button
                                type="button"
                                onClick={() => openCustomerInfo(ag)}
                                className={`w-full text-left rounded-xl p-3 shadow-sm border transition-transform duration-150 active:scale-95 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm bg-indigo-500`}>
                                      {initials}
                                    </div>
                                    <div className="min-w-0">
                                      <h3 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{ag.customer.name}</h3>
                                      <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ag.customer.serviceType || 'Limpeza Padrão'}</p>
                                      {isTeamMode && ag.assignedTo && ag.assignedTo.length > 0 ? (
                                        <div className="flex -space-x-1.5 mt-1.5">
                                          {MOCK_TEAM.filter(m => ag.assignedTo?.includes(m.id)).map(member => (
                                            <div key={member.id} className={`h-5 w-5 rounded-full ring-2 ${isDark ? 'ring-slate-900' : 'ring-white'} flex items-center justify-center text-[8px] font-bold text-white shadow-sm ${member.avatarColor}`} title={member.name}>
                                              {member.name.substring(0, 1)}
                                            </div>
                                          ))}
                                        </div>
                                      ) : ag.assignedHelper && (
                                        <div className="mt-1">
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                                            {ag.assignedHelper.name}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {ag.customer.address && (
                                  <div className={`flex items-center gap-1.5 text-[10px] mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <MapPin size={10} className="shrink-0" />
                                    <span className="truncate">{ag.customer.address}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-100 dark:border-slate-800">
                                  <span className={`font-bold text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    {currencyFormatter.format(ag.price)}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider ${ag.status === 'AGENDADO'
                                    ? 'text-amber-500'
                                    : ag.status === 'CONCLUIDO'
                                      ? 'text-emerald-500'
                                      : ag.status === 'CANCELADO'
                                        ? 'text-red-500'
                                        : 'text-blue-500'
                                    }`}>
                                    {ag.status === 'AGENDADO' ? 'CONFIRMADO' : formatStatusLabel(ag.status).toUpperCase()}
                                  </span>
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderTodayTimeline = () => {
    const dayAppointments = getAgendamentosForDay(selectedDay, false).sort(
      (a, b) => (a.startTime || '').localeCompare(b.startTime || ''),
    );

    return (
      <div className="px-2 md:px-5 space-y-3">
        {dayAppointments.length === 0 ? (
          <EmptyState
            title="Nada agendado para hoje."
            subtitle="Aproveite o dia livre ou adicione uma tarefa."
            onClick={openEmptyActions}
          />
        ) : (
          <div className="relative space-y-4">
            {dayAppointments.map((ag, idx) => {
              const start = ag.startTime || 'Dia todo';
              const initials = getInitials(ag.customer.name);
              return (
                <div key={ag.id} className="relative animate-cascade" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="relative flex gap-3 pb-2">
                    <div className="flex flex-col items-end w-10 text-right shrink-0">
                      <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{start}</span>
                      <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {getDuration(start, ag.endTime)}
                      </span>
                    </div>
                    <div className={`relative border-l-2 ${isDark ? 'border-slate-800' : 'border-slate-200'} ml-3 pl-3 pb-4 flex-1`}>
                      <div className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ${statusDotBg[ag.status] ?? 'bg-slate-400'}`} />
                      <button
                        type="button"
                        onClick={() => openCustomerInfo(ag)}
                        className={`w-full text-left rounded-xl p-3 shadow-sm border transition-transform duration-150 active:scale-95 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm bg-indigo-500`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h3 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{ag.customer.name}</h3>
                              <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ag.customer.serviceType || 'Limpeza Padrão'}</p>
                              {isTeamMode && ag.assignedTo && ag.assignedTo.length > 0 ? (
                                <div className="flex -space-x-1.5 mt-1.5">
                                  {MOCK_TEAM.filter(m => ag.assignedTo?.includes(m.id)).map(member => (
                                    <div key={member.id} className={`h-5 w-5 rounded-full ring-2 ${isDark ? 'ring-slate-900' : 'ring-white'} flex items-center justify-center text-[8px] font-bold text-white shadow-sm ${member.avatarColor}`} title={member.name}>
                                      {member.name.substring(0, 1)}
                                    </div>
                                  ))}
                                </div>
                              ) : ag.assignedHelper && (
                                <div className="mt-1">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                                    {ag.assignedHelper.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {ag.customer.address && (
                          <div className={`flex items-center gap-1.5 text-[10px] mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            <MapPin size={10} className="shrink-0" />
                            <span className="truncate">{ag.customer.address}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-100 dark:border-slate-800">
                          <span className={`font-bold text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {currencyFormatter.format(ag.price)}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${ag.status === 'AGENDADO'
                            ? 'text-amber-500'
                            : ag.status === 'CONCLUIDO'
                              ? 'text-emerald-500'
                              : ag.status === 'CANCELADO'
                                ? 'text-red-500'
                                : 'text-blue-500'
                            }`}>
                            {ag.status === 'AGENDADO' ? 'CONFIRMADO' : formatStatusLabel(ag.status).toUpperCase()}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const DayActionsModal = ({
    date,
    appointments: dayApps,
    onClose,
    onAi,
    onAdd,
    onEdit,
    formatCurrency,
  }: {
    date: Date;
    appointments: Appointment[];
    onClose: () => void;
    onAi: () => void;
    onAdd: () => void;
    onEdit: (apt: Appointment) => void;
    formatCurrency: (val: number) => string;
  }) => (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative rounded-t-[32px] p-6 animate-sheet-up space-y-5 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>AÇÕES PARA</p>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{format(date, "dd 'de' MMMM", { locale: ptBR })}</h3>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <ChevronLeft className="rotate-[-90deg]" size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onAdd}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition ${isDark ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400 hover:bg-emerald-900/30' : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-200 text-emerald-700'}`}>
              <Plus size={20} />
            </div>
            <span className="text-sm font-bold">Novo Agendamento</span>
          </button>
          <button
            onClick={onAi}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition ${isDark ? 'bg-indigo-900/20 border-indigo-800 text-indigo-400 hover:bg-indigo-900/30' : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-200 text-indigo-700'}`}>
              <Sparkles size={20} />
            </div>
            <span className="text-sm font-bold">Assistente IA</span>
          </button>
        </div>

        {dayApps.length > 0 && (
          <div className="space-y-3">
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>NESTE DIA</p>
            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
              {dayApps.map((ap) => (
                <button
                  key={ap.id}
                  onClick={() => onEdit(ap)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition text-left ${isDark ? 'bg-slate-800 border-slate-700 hover:border-emerald-600/50' : 'border-slate-100 bg-slate-50 hover:border-emerald-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full bg-emerald-400" />
                    <div>
                      <p className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{ap.customer.name}</p>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ap.startTime} • {formatCurrency(ap.price)}</p>
                    </div>
                  </div>
                  <PencilLine size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`}>
      <div className="px-4 md:px-8 pt-0 pb-4 space-y-4">
        <div className="-mx-4 md:-mx-8">
          <div className="pt-0 px-4 md:px-8 pb-0 md:py-3 flex flex-col gap-3 mt-[3px] mb-[3px]">
            <div className="flex items-start justify-between mt-[5px]">
              <div>
                <p className={`text-[10px] uppercase tracking-[0.28em] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {createYear}
                </p>
                <h1 className={`text-lg md:text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {viewLabel}
                </h1>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openEmptyActions}
                  className="h-9 w-9 rounded-full text-white shadow-lg flex items-center justify-center transition bg-emerald-600 hover:bg-emerald-500"
                  aria-label="Adicionar novo"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 -mt-2">
          <div className={`-mx-4 md:-mx-8 rounded-b-[28px] rounded-t-[0px] border shadow-[0_18px_40px_-32px_rgba(15,23,42,0.32)] px-4 pt-[5px] pb-[1px] space-y-[5px] -mt-3 -mb-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            {isTeamMode && (
              <div className={`-mx-4 md:-mx-8 px-4 py-2 border-b flex items-center gap-3 overflow-x-auto no-scrollbar ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'}`}>
                <button
                  onClick={() => setSelectedMemberId(null)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-colors ${!selectedMemberId
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Users size={14} />
                  Todos
                </button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                {MOCK_TEAM.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
                    className={`relative group flex items-center gap-2 pr-3 pl-1 py-1 rounded-full border transition-all ${selectedMemberId === member.id
                      ? 'bg-indigo-500/10 border-indigo-500/50 pr-4'
                      : isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'
                      }`}
                  >
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm ${member.avatarColor}`}>
                      {member.name.substring(0, 2)}
                    </div>
                    <span className={`text-xs font-semibold ${selectedMemberId === member.id ? 'text-indigo-600 dark:text-indigo-400' : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>
                      {member.name.split(' ')[0]}
                    </span>
                    {selectedMemberId === member.id && (
                      <span className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className={`flex items-center gap-2 border rounded-xl p-1 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button
                  type="button"
                  onClick={handlePrevRange}
                  className={`h-9 w-9 rounded-lg flex items-center justify-center transition ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
                  aria-label="Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className={`text-sm font-semibold px-2 min-w-[80px] text-center ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  {viewMode === 'today' ? 'Hoje' : viewMode === 'week' ? 'Semana' : 'Mês'}
                </span>
                <button
                  type="button"
                  onClick={handleNextRange}
                  className={`h-9 w-9 rounded-lg flex items-center justify-center transition ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
                  aria-label="Próximo"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setCurrentDate(today);
                    setSelectedDay(today);
                  }}
                  className={`h-9 w-9 rounded-xl border flex items-center justify-center transition ${isDark ? 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  title="Voltar para Hoje"
                >
                  <Calendar size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app/rotas')}
                  className={`h-9 px-4 rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/20 text-white transition hover:-translate-y-0.5 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700`}
                >
                  <MapPin size={14} />
                  Maps
                </button>
              </div>
            </div>
            <div className={`flex items-center rounded-full border p-1 gap-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              {['today', 'week', 'month', 'chat'].map((mode) => {
                const label = mode === 'today' ? 'Hoje' : mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Chat';
                const active = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as 'today' | 'week' | 'month' | 'chat')}
                    className={`flex-1 h-10 rounded-full text-sm font-semibold transition ${active
                      ? 'bg-emerald-500 text-white shadow-[0_12px_30px_-18px_rgba(16,185,129,0.7)]'
                      : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-700 hover:bg-white'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {viewMode === 'week' && (
              <LayoutGroup id="week-day-selector">
                <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                    key={format(currentDate, 'yyyy-MM-dd')} // Unique key for AnimatePresence
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: 'spring', stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={(event, { offset, velocity }) => {
                      void event;
                      const swipe = swipePower(offset.x, velocity.x);

                      if (swipe < -10000) {
                        paginate(1);
                      } else if (swipe > 10000) {
                        paginate(-1);
                      }
                    }}
                    className="grid grid-cols-7 gap-2 px-1 py-[1px] mb-[1px]"
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
                          className={`flex flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2 transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                        >
                          <span className={`text-[10px] font-semibold uppercase ${isSelected ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500' : 'text-slate-500')}`}>
                            {weekdayLabels[index]}
                          </span>
                          {isSelected ? (
                            <motion.span
                              layoutId="day-pill"
                              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border shadow-sm ${isDark ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20' : 'bg-slate-900 text-white border-slate-900 shadow-slate-900/20'}`}
                            >
                              {format(day, 'd')}
                            </motion.span>
                          ) : (
                            <span
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border transition ${today
                                ? isDark ? 'bg-slate-900 text-emerald-400 border-emerald-900/50 ring-2 ring-emerald-900/30' : 'bg-white text-emerald-600 border-emerald-200 ring-2 ring-emerald-100'
                                : isDark ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-white text-slate-900 border-slate-200'
                                }`}
                            >
                              {format(day, 'd')}
                            </span>
                          )}
                          {dayAppointments.length > 0 ? (
                            <div className="flex items-center gap-1 h-2">
                              {dayAppointments.slice(0, 3).map((ag) => (
                                <div
                                  key={ag.id}
                                  className={`w-2 h-2 rounded-full ${statusDotBg[ag.status] ?? 'bg-slate-400'
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
                  </motion.div>
                </AnimatePresence>
              </LayoutGroup>
            )}
            {viewMode === 'month' && (
              <div className={`mt-2 rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <AgendaMensal
                  embedded
                  externalDate={currentDate}
                  onDateChange={(date) => {
                    setCurrentDate(date);
                    setSelectedDay(date);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {viewMode === 'today' && renderTodayTimeline()}
          {viewMode === 'week' && renderWeekSection()}
          {viewMode === 'chat' && renderChatView()}
        </div>

        {viewMode !== 'chat' && viewMode !== 'month' && (
          <button
            type="button"
            onClick={() => setShowEmptyActions(true)}
            className={`fixed right-4 bottom-24 z-50 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition ${isDark ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'}`}
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
            helpers={helpers}
            formData={editForm}
            setFormData={setEditForm}
            saving={saving}
            onClose={() => {
              setShowEditModal(false);
              setEditingAppointment(null);
            }}
            onSubmit={handleEditSubmit}
            onQuickStatus={handleQuickStatus}
            canDeleteSeries={Boolean(editingAppointment.isRecurring || editingAppointment.recurrenceRule)}
            onDeleteSeries={handleDeleteSeries}
          />
        )}

        {customerInfo && editingAppointment && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setCustomerInfo(null)} />
            <div className={`relative rounded-t-[32px] p-6 animate-sheet-up space-y-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>DETALHES DO CLIENTE</p>
                  <h2 className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{customerInfo.name}</h2>
                  {customerInfo.address && (
                    <div className={`flex items-center gap-1.5 text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <MapPin size={14} className="text-emerald-500" />
                      <span>{customerInfo.address}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setCustomerInfo(null)}
                  className={`p-2 rounded-full transition ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <ChevronLeft className="rotate-[-90deg]" size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {customerInfo.phone && (
                  <a
                    href={`sms:${customerInfo.phone.replace(/\D/g, '')}`}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    <MessageCircle size={18} />
                    SMS
                  </a>
                )}
                {customerInfo.address && (
                  <button
                    type="button"
                    onClick={() => handleNavigate(customerInfo.address || null)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    <Navigation size={18} />
                    Navegar
                  </button>
                )}
              </div>

              {editingAppointment.notes && (
                <div className={`rounded-2xl p-4 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-xs font-bold uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>NOTAS DA VISITA</p>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{editingAppointment.notes}</p>
                </div>
              )}

              <div className={`pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} flex flex-col gap-3`}>
                <button
                  onClick={() => {
                    setCustomerInfo(null);
                    setShowCompletionModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
                >
                  <CheckCircle2 size={20} />
                  Concluir Serviço
                </button>
                <button
                  onClick={openEditModalForCustomer}
                  className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                >
                  <PencilLine size={20} />
                  Editar Agendamento
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedJob && (
          <JobCardModal
            appointment={selectedJob}
            onClose={() => setSelectedJob(null)}
            onEdit={() => {
              setSelectedJob(null);
              openEditModal(selectedJob);
            }}
            onStatusChange={async (status) => {
              if (status === 'IN_ROUTE') {
                alert('Notificação enviada: A caminho!');
              } else if (status === 'CONCLUIDO') {
                setEditingAppointment(selectedJob);
                setShowCompletionModal(true);
                setSelectedJob(null);
              } else {
                setEditingAppointment(selectedJob);
                await handleQuickStatus(status);
                setSelectedJob(null);
              }
            }}
            helpers={helpers}
            isTeamMode={isTeamMode}
          />
        )}

        {showCompletionModal && editingAppointment && (
          <CompletionModal
            appointment={editingAppointment}
            onClose={() => {
              setShowCompletionModal(false);
              setEditingAppointment(null);
            }}
            onConfirm={handleCompleteService}
            saving={saving}
          />
        )}

        {showEmptyActions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => setShowEmptyActions(false)}
            />
            <div className={`relative w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-zoom-in space-y-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="text-center space-y-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Plus size={32} className={isDark ? 'text-white' : 'text-slate-900'} />
                </div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Adicionar Novo</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>O que você gostaria de criar agora?</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowEmptyActions(false);
                    openCreateModal(selectedDay);
                  }}
                  className={`w-full p-4 flex items-center gap-4 rounded-2xl transition border group ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-100'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock3 size={20} />
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Agendamento</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Marcar visita para cliente</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowEmptyActions(false);
                    navigate('/app/clientes');
                  }}
                  className={`w-full p-4 flex items-center gap-4 rounded-2xl transition border group ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-100'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus size={20} />
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Novo Cliente</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cadastrar cliente na base</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowEmptyActions(false)}
                className={`w-full py-3 text-sm font-semibold transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
      <NavigationChoiceModal
        isOpen={navigationModal.isOpen}
        onClose={() => setNavigationModal({ isOpen: false, address: null })}
        address={navigationModal.address}
      />
    </div>
  );
};

export default AgendaSemanal;
