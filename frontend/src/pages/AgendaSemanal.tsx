import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  Navigation,
  Send,
  Sparkles,
  Plus,
  PencilLine,
  Clock3,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appointmentsApi, customersApi, teamApi } from '../services/api';
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
import CreateModal, { CreateFormState } from '../components/appointments/CreateModal';
import EditModal from '../components/appointments/EditModal';
import AgendaMensal from './AgendaMensal';
import { getGoogleStatus, syncGoogleEvent } from '../services/googleCalendar';
import { LayoutGroup, motion } from 'framer-motion';

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
    <div className="mx-auto mb-4 h-32 w-32 rounded-[28px] bg-white border border-purple-100 shadow-sm flex items-center justify-center overflow-hidden">
      <img
        src="/images/empty-state-cleanup.svg"
        alt="Mascote vassoura limpando com nuvem e check"
        loading="lazy"
        className="h-full w-full object-contain"
      />
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
  const [createYear] = useState(new Date().getFullYear());
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionMatches, setMentionMatches] = useState<Customer[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    customerId: '',
    date: '',
    startTime: '',
    price: '',
    helperFee: '',
    notes: '',
    isRecurring: false,
    recurrenceRule: '',
    assignedHelperId: '',
  });

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.customerId || !createForm.date || !createForm.startTime || !createForm.price) {
      return;
    }
    const selectedDate = parseDateFromInput(createForm.date);
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
        date: formatDateToYMD(selectedDate),
        startTime: createForm.startTime,
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
        await syncGoogleEvent(newAppt.id);
      }
      setShowCreateModal(false);
      fetchAgendamentos();
      setCreateForm({
        customerId: '',
        date: '',
        startTime: '',
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

  const handleDelete = async () => {
    if (!editingAppointment) return;
    if (
      !window.confirm(
        'Tem certeza que deseja excluir? Se for recorrente, apenas este será removido.',
      )
    )
      return;
    try {
      await appointmentsApi.remove(editingAppointment.id);
      if (googleConnected) {
        // google sync handled by backend
      }
      setShowEditModal(false);
      setEditingAppointment(null);
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao excluir:', error);
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
      await appointmentsApi.update(editingAppointment.id, payload);
      if (googleConnected) {
        await syncGoogleEvent(editingAppointment.id);
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

  const handleDayCardClick = (day: Date) => {
    setSelectedDay(day);
    const apps = getAgendamentosForDay(day);
    setSelectedDayAppointments(apps);
    setShowDayActions(true);
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
    setCreateForm((prev) => ({
      ...prev,
      date: preSelectedDate
        ? format(preSelectedDate, 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
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
    setShowEditModal(true);
  };

  const openCustomerInfo = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setCustomerInfo(appointment.customer);
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

    const userMsg: AgentChatMessage = { role: 'user', text };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setChatLoading(true);
    setChatPendingIntent(null);

    if (chatSyncRef.current !== JSON.stringify(newHistory)) {
      emitAgentChatSync(chatSyncSource, newHistory);
      chatSyncRef.current = JSON.stringify(newHistory);
    }

    try {
      const response = await agentIntentApi.parse(text); 
      if (response.reply) {
        const botMsg: AgentChatMessage = { role: 'assistant', text: response.reply };
        const updated = [...newHistory, botMsg];
        setChatMessages(updated);
        saveAgentChatMessages(updated);
        chatSyncRef.current = JSON.stringify(updated);
      }
      if (response.intent && response.intent !== 'unknown') {
        if (response.intent === 'create_appointment' || response.intent === 'reschedule' || response.intent === 'cancel') {
          if (response.requiresConfirmation) {
            setChatPendingIntent({
              intent: response.intent,
              summary: response.reply, 
              payload: response.payload
            });
          }
        }
      }
    } catch (error) {
      console.error('Erro no chat:', error);
      const errorMsg: AgentChatMessage = { role: 'assistant', text: 'Desculpe, tive um erro ao processar.' };
      setChatMessages([...newHistory, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatConfirm = async () => {
    if (!chatPendingIntent) return;
    setChatLoading(true);
    try {
      const botMsg: AgentChatMessage = { role: 'assistant', text: 'Ação confirmada e realizada!' };
      const updated = [...chatMessages, botMsg];
      setChatMessages(updated);
      saveAgentChatMessages(updated);
      setChatPendingIntent(null);
      fetchAgendamentos(); 
    } catch (error) {
      console.error(error);
    } finally {
      setChatLoading(false);
    }
  };

  const updateMentionState = (text: string) => {
    const match = text.match(/(^|\s)@([\wÀ-ÿ0-9._-]*)$/);
    if (!match) {
      setMentionOpen(false);
      return;
    }
    const query = match[2].toLowerCase();
    const filtered = customers.filter(
      (c) =>
        normalizeValue(c.name).includes(normalizeValue(query)) ||
        (c.address && normalizeValue(c.address).includes(normalizeValue(query))),
    );
    if (filtered.length > 0) {
      setMentionMatches(filtered);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
    setMentionIndex(0);
  };

  const applyMention = (name: string) => {
    const match = chatInput.match(/(^|\s)@([\wÀ-ÿ0-9._-]*)$/);
    if (match) {
      const prefix = chatInput.substring(0, match.index! + match[1].length);
      const suffix = chatInput.substring(match.index! + match[0].length);
      setChatInput(`${prefix}@${name} ${suffix}`);
      setMentionOpen(false);
    }
  };

  const renderChatView = () => (
    <div className="h-[500px] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <div className="flex flex-col gap-3">
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
                        className="relative pl-6 animate-cascade"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="absolute left-2 top-2 bottom-0 w-px bg-slate-200" aria-hidden />
                        {isLast && <div className="absolute left-2 bottom-0 w-px h-2 bg-white" aria-hidden />}
                        <div className="relative flex gap-3 pb-2">
                          <div className="flex flex-col items-center w-12 shrink-0">
                            <span className="text-xs font-semibold text-slate-600">{start}</span>
                            <div className="relative">
                              <div className="h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow" />
                              {!isLast && <div className="absolute left-1/2 top-3 h-full w-px -translate-x-1/2 bg-slate-200" aria-hidden />}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openCustomerInfo(ag)}
                            className={`flex-1 min-w-0 text-left rounded-2xl px-3 py-3 shadow-sm border transition-transform duration-150 active:scale-95 ${statusSurfaces[ag.status] ?? 'bg-slate-100 text-slate-800 border-slate-200'} ${statusAccents[ag.status] ?? 'border-l-4 border-slate-200'} pl-4 overflow-hidden`}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold">
                                {initials || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="w-full flex items-center justify-between gap-2 overflow-hidden">
                                  <span className="text-sm font-semibold text-slate-900 truncate min-w-0">{ag.customer.name}</span>
                                  <span className="text-[11px] font-semibold text-slate-500 shrink-0 whitespace-nowrap">{formatStatusLabel(ag.status)}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                  {start}
                                  {end}
                                </p>
                                {ag.notes ? <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ag.notes}</p> : null}
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
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
      <div className="px-4 md:px-5 space-y-4">
        {dayAppointments.length === 0 ? (
          <EmptyState
            title="Nada agendado para hoje."
            subtitle="Aproveite o dia livre ou adicione uma tarefa."
            onClick={openEmptyActions}
          />
        ) : (
          <div className="relative space-y-4">
            {dayAppointments.map((ag, idx, arr) => {
              const start = ag.startTime || 'Dia todo';
              const isLast = idx === arr.length - 1;
              return (
                <div key={ag.id} className="relative pl-4">
                  <div className="absolute left-[7px] top-2 bottom-0 w-px bg-slate-200" aria-hidden />
                  {isLast && <div className="absolute left-[7px] bottom-0 w-px h-full bg-white" aria-hidden />}
                  <div className="relative flex gap-3">
                    <div className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-white ${dotsColor(ag.status)} shadow-sm z-10`} />
                    <div className="flex-1 pb-4">
                      <button
                        type="button"
                        onClick={() => openCustomerInfo(ag)}
                        className={`w-full text-left rounded-2xl p-4 shadow-sm border transition active:scale-95 ${statusSurfaces[ag.status]}`}
                      >
                        <div className="flex justify-between items-start mb-1 overflow-hidden gap-2">
                          <h3 className="font-bold text-sm truncate min-w-0">{ag.customer.name}</h3>
                          <span className="text-[10px] font-bold uppercase tracking-wide opacity-70 shrink-0 whitespace-nowrap">{ag.status}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-80 mb-2">
                          <Clock3 size={12} />
                          <span>{start} {ag.endTime ? `- ${ag.endTime}` : ''}</span>
                        </div>
                        {ag.customer.address && (
                          <div className="flex items-start gap-1.5 text-xs opacity-70">
                            <MapPin size={12} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-1">{ag.customer.address}</span>
                          </div>
                        )}
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
      <div className="relative bg-white rounded-t-[32px] p-6 animate-sheet-up space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AÇÕES PARA</p>
            <h3 className="text-lg font-bold text-slate-900">{format(date, "d 'de' MMMM", { locale: ptBR })}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200">
            <ChevronLeft className="rotate-[-90deg]" size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onAdd}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700">
              <Plus size={20} />
            </div>
            <span className="text-sm font-bold">Novo Agendamento</span>
          </button>
          <button
            onClick={onAi}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700">
              <Sparkles size={20} />
            </div>
            <span className="text-sm font-bold">Assistente IA</span>
          </button>
        </div>

        {dayApps.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">NESTE DIA</p>
            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
              {dayApps.map((ap) => (
                <button
                  key={ap.id}
                  onClick={() => onEdit(ap)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-200 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full bg-emerald-400" />
                    <div>
                      <p className="text-sm font-bold text-slate-700">{ap.customer.name}</p>
                      <p className="text-xs text-slate-500">{ap.startTime} • {formatCurrency(ap.price)}</p>
                    </div>
                  </div>
                  <PencilLine size={16} className="text-slate-400" />
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f6f7fb]">
      <div className="px-4 md:px-8 pt-0 pb-6 space-y-5 sm:space-y-6">
        <div className="-mx-4 md:-mx-8">
          <div className="pt-0 px-4 md:px-8 pb-0 md:py-6 flex flex-col gap-4 md:gap-6 mt-[3px] mb-[3px]">
            <div className="flex items-start justify-between mt-[5px]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] font-semibold text-slate-500">
                  {createYear}
                </p>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {viewLabel}
                </h1>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openEmptyActions}
                  className="h-10 w-10 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center hover:bg-slate-800 transition"
                  aria-label="Adicionar novo"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 -mt-4">
          <div className="-mx-4 md:-mx-8 rounded-b-[28px] rounded-t-[0px] bg-white border border-slate-100 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.32)] px-4 pt-[5px] pb-[1px] space-y-[5px] -mt-4 -mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={handlePrevRange}
                  className="h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center justify-center"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-slate-700 px-2 min-w-[80px] text-center">
                  {viewMode === 'today' ? 'Hoje' : viewMode === 'week' ? 'Semana' : 'Mês'}
                </span>
                <button
                  type="button"
                  onClick={handleNextRange}
                  className="h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center justify-center"
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
                  className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 transition"
                  title="Voltar para Hoje"
                >
                  <Calendar size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app/rotas')}
                  className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-sm hover:bg-slate-800 transition flex items-center gap-2"
                >
                  <MapPin size={14} />
                  Rota
                </button>
              </div>
            </div>
            <div className="flex items-center rounded-full bg-slate-50 border border-slate-200 p-1 gap-1">
              {['today', 'week', 'month', 'chat'].map((mode) => {
                const label = mode === 'today' ? 'Hoje' : mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Chat';
                const active = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as 'today' | 'week' | 'month' | 'chat')}
                    className={`flex-1 h-10 rounded-full text-sm font-semibold transition ${
                      active
                        ? 'bg-emerald-500 text-white shadow-[0_12px_30px_-18px_rgba(16,185,129,0.7)]'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {viewMode === 'week' && (
              <LayoutGroup id="week-day-selector">
                <div className="grid grid-cols-7 gap-2 px-1 py-[1px] mb-[1px]">
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
                      className="flex flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2 transition hover:bg-slate-50"
                    >
                      <span className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                        {weekdayLabels[index]}
                      </span>
                      {isSelected ? (
                        <motion.span
                          layoutId="day-pill"
                          transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border bg-slate-900 text-white border-slate-900 shadow-sm shadow-slate-900/20"
                        >
                          {format(day, 'd')}
                        </motion.span>
                      ) : (
                        <span
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border transition ${
                            today
                              ? 'bg-white text-emerald-600 border-emerald-200 ring-2 ring-emerald-100'
                              : 'bg-white text-slate-900 border-slate-200'
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
              </LayoutGroup>
            )}
            {viewMode === 'month' && (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <AgendaMensal embedded />
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
            customers={customers}
            helpers={helpers}
            formData={editForm}
            setFormData={setEditForm}
            saving={saving}
            onClose={() => {
              setShowEditModal(false);
              setEditingAppointment(null);
            }}
            onSubmit={handleEditSubmit}
            onDelete={handleDelete}
            onDeleteSeries={editingAppointment.isRecurring ? handleDeleteSeries : undefined}
          />
        )}

        {customerInfo && editingAppointment && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setCustomerInfo(null)} />
            <div className="relative bg-white rounded-t-[32px] p-6 animate-sheet-up space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">DETALHES DO CLIENTE</p>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">{customerInfo.name}</h2>
                  {customerInfo.address && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1">
                      <MapPin size={14} className="text-emerald-500" />
                      <span>{customerInfo.address}</span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setCustomerInfo(null)}
                  className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
                >
                  <ChevronLeft className="rotate-[-90deg]" size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {customerInfo.phone && (
                  <a
                    href={`tel:${customerInfo.phone}`}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
                  >
                    <Phone size={18} />
                    Ligar
                  </a>
                )}
                {customerInfo.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(customerInfo.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
                  >
                    <Navigation size={18} />
                    Navegar
                  </a>
                )}
              </div>

              {editingAppointment.notes && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">NOTAS DA VISITA</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{editingAppointment.notes}</p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={openEditModalForCustomer}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
                >
                  <PencilLine size={20} />
                  Editar Agendamento
                </button>
              </div>
            </div>
          </div>
        )}

        {showEmptyActions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
              onClick={() => setShowEmptyActions(false)}
            />
            <div className="relative w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl animate-zoom-in space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus size={32} className="text-slate-900" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Adicionar Novo</h3>
                <p className="text-sm text-slate-500">O que você gostaria de criar agora?</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowEmptyActions(false);
                    openCreateModal(selectedDay);
                  }}
                  className="w-full p-4 flex items-center gap-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition border border-slate-100 group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock3 size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">Agendamento</p>
                    <p className="text-xs text-slate-500">Marcar visita para cliente</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowEmptyActions(false);
                    navigate('/app/clientes');
                  }}
                  className="w-full p-4 flex items-center gap-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition border border-slate-100 group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">Novo Cliente</p>
                    <p className="text-xs text-slate-500">Cadastrar cliente na base</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowEmptyActions(false)}
                className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendaSemanal;