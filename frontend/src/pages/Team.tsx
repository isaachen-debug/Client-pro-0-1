import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  Loader2,
  Mail,
  MessageCircle,
  Navigation2,
  Phone,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { teamApi } from '../services/api';
import type { HelperAppointment, HelperDayResponse, User } from '../types';
import { useNavigate } from 'react-router-dom';
import { PageHeader, SurfaceCard } from '../components/OwnerUI';
import { pageGutters } from '../styles/uiTokens';

const roleLabels: Record<string, string> = {
  OWNER: 'Administradora',
  HELPER: 'Helper',
  CLIENT: 'Cliente',
};

const normalizePhone = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length ? digits : null;
};

type DayKey = 'today' | 'tomorrow';
type HelperPayoutMode = 'FIXED' | 'PERCENTAGE';

const Team = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Helper Details Application State
  const [expandedHelperId, setExpandedHelperId] = useState<string | null>(null);
  const [helperDayData, setHelperDayData] = useState<
    Record<string, Record<DayKey, { loading: boolean; data: HelperDayResponse | null; error: string }>>
  >({});
  const [helperSelectedDay, setHelperSelectedDay] = useState<Record<string, DayKey>>({});
  const [newChecklistTitles, setNewChecklistTitles] = useState<Record<string, string>>({});
  const [checklistActionId, setChecklistActionId] = useState<string | null>(null);
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [notesSavingId, setNotesSavingId] = useState<string | null>(null);
  const [payoutModal, setPayoutModal] = useState<{ isOpen: boolean; helper: User | null; mode: HelperPayoutMode; value: string }>({
    isOpen: false,
    helper: null,
    mode: 'FIXED',
    value: '',
  });
  const [submitting, setSubmitting] = useState(false); // Used for payout save


  const teamMembers = useMemo(() => members.filter((member) => member.role !== 'CLIENT'), [members]);
  const clientMembers = useMemo(() => members.filter((member) => member.role === 'CLIENT'), [members]);
  const helpers = useMemo(() => teamMembers.filter((member) => member.role === 'HELPER'), [teamMembers]);
  const usdFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    [],
  );



  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await teamApi.list();
      setMembers(data.members);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível carregar a equipe.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);



  const fetchHelperDay = async (helperId: string, day: DayKey) => {
    setHelperDayData((prev) => ({
      ...prev,
      [helperId]: {
        today: prev[helperId]?.today ?? { loading: false, data: null, error: '' },
        tomorrow: prev[helperId]?.tomorrow ?? { loading: false, data: null, error: '' },
        [day]: { ...(prev[helperId]?.[day] ?? { data: null }), loading: true, error: '' },
      },
    }));
    try {
      const targetDate = new Date();
      if (day === 'tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      const data = await teamApi.getHelperDay(helperId, targetDate.toISOString());
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: {
          ...(prev[helperId] ?? { today: { loading: false, data: null, error: '' }, tomorrow: { loading: false, data: null, error: '' } }),
          [day]: { loading: false, error: '', data },
        },
      }));
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível carregar a rota da helper.';
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: {
          ...(prev[helperId] ?? { today: { loading: false, data: null, error: '' }, tomorrow: { loading: false, data: null, error: '' } }),
          [day]: { loading: false, error: message, data: null },
        },
      }));
    }
  };

  const toggleHelperDetails = (helperId: string) => {
    if (expandedHelperId === helperId) {
      setExpandedHelperId(null);
      return;
    }
    setExpandedHelperId(helperId);
    if (!helperDayData[helperId]) {
      setHelperSelectedDay((prev) => ({ ...prev, [helperId]: 'today' }));
      fetchHelperDay(helperId, 'today');
      fetchHelperDay(helperId, 'tomorrow');
    }
  };

  const getChecklistProgress = (appointment: HelperAppointment) => {
    const total = appointment.checklist.length || 1;
    const completed = appointment.checklist.filter((item) => item.completedAt).length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  };
  const handleAddChecklistItem = async (helperId: string, appointmentId: string) => {
    const title = (newChecklistTitles[appointmentId] ?? '').trim();
    if (!title) return;
    setChecklistActionId(appointmentId);
    try {
      await teamApi.addChecklistItem(appointmentId, title);
      setNewChecklistTitles((prev) => ({ ...prev, [appointmentId]: '' }));
      const day = helperSelectedDay[helperId] ?? 'today';
      await fetchHelperDay(helperId, day);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível adicionar o item.';
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: { ...(prev[helperId] ?? { data: null }), error: message, loading: false },
      }));
    } finally {
      setChecklistActionId(null);
    }
  };

  const handleRemoveChecklistItem = async (helperId: string, appointmentId: string, taskId: string) => {
    setChecklistActionId(taskId);
    try {
      await teamApi.removeChecklistItem(appointmentId, taskId);
      const day = helperSelectedDay[helperId] ?? 'today';
      await fetchHelperDay(helperId, day);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível remover o item.';
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: { ...(prev[helperId] ?? { data: null }), error: message, loading: false },
      }));
    } finally {
      setChecklistActionId(null);
    }
  };

  const handleToggleChecklistItem = async (helperId: string, appointmentId: string, taskId: string) => {
    setChecklistActionId(taskId);
    try {
      await teamApi.toggleChecklistItem(appointmentId, taskId);
      const day = helperSelectedDay[helperId] ?? 'today';
      await fetchHelperDay(helperId, day);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível atualizar o item.';
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: { ...(prev[helperId] ?? { data: null }), error: message, loading: false },
      }));
    } finally {
      setChecklistActionId(null);
    }
  };

  const handleSaveNotes = async (helperId: string, appointmentId: string) => {
    const draft = notesDrafts[appointmentId] ?? '';
    setNotesSavingId(appointmentId);
    try {
      await teamApi.updateAppointmentNotes(appointmentId, draft);
      const day = helperSelectedDay[helperId] ?? 'today';
      await fetchHelperDay(helperId, day);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível salvar as observações.';
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: { ...(prev[helperId] ?? { data: null }), error: message, loading: false },
      }));
    } finally {
      setNotesSavingId(null);
    }
  };

  const formatDuration = (appointment: HelperAppointment) => {
    if (!appointment.startedAt) return null;
    const start = new Date(appointment.startedAt).getTime();
    const end = appointment.finishedAt ? new Date(appointment.finishedAt).getTime() : Date.now();
    if (!start || start > end) return null;
    const diff = Math.floor((end - start) / 1000);
    const hrs = Math.floor(diff / 3600)
      .toString()
      .padStart(2, '0');
    const mins = Math.floor((diff % 3600) / 60)
      .toString()
      .padStart(2, '0');
    return `${hrs}:${mins}`;
  };



  const totalMembers = teamMembers.length;
  const ownerCount = teamMembers.filter((member) => member.role === 'OWNER').length;
  const teamHighlights = [
    { label: 'Membros totais', value: totalMembers },
    { label: 'Helpers ativos', value: helpers.length },
    { label: 'Administradoras', value: ownerCount },
    { label: 'Convites livres', value: Math.max(0, 5 - helpers.length) },
  ];


  const handlePayoutSubmit = async () => {
    if (!payoutModal.helper) return;
    try {
      setSubmitting(true);
      await teamApi.updateHelperPayout(payoutModal.helper.id, payoutModal.mode, Number(payoutModal.value));
      setPayoutModal({ ...payoutModal, isOpen: false, helper: null });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao atualizar ganhos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${pageGutters} max-w-full md:max-w-6xl mx-auto space-y-6 md:space-y-8`}>
      {/* ... (Existing Header and Grid) ... */}

      {/* Payout Modal */}
      {payoutModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Ganhos: {payoutModal.helper?.name}</h3>
              <p className="text-sm text-gray-500">Defina como esta helper será paga.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">Modo de Pagamento</label>
                <select
                  value={payoutModal.mode}
                  onChange={(e) => setPayoutModal({ ...payoutModal, mode: e.target.value as any })}
                  className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-xl"
                >
                  <option value="FIXED">Valor Fixo (por casa)</option>
                  <option value="PERCENTAGE">Porcentagem (%)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                    {payoutModal.mode === 'PERCENTAGE' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    value={payoutModal.value}
                    onChange={(e) => setPayoutModal({ ...payoutModal, value: e.target.value })}
                    className="w-full mt-1 pl-8 pr-4 py-2 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPayoutModal({ ...payoutModal, isOpen: false, helper: null })}
                className="flex-1 py-3 font-bold text-gray-500 bg-gray-50 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayoutSubmit}
                disabled={submitting}
                className="flex-1 py-3 font-bold text-white bg-primary-600 rounded-xl shadow-lg shadow-primary-200"
              >
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        label="EQUIPE"
        title="Team"
        subtitle="Organize helpers e permissões em um só painel."
        actions={
          <button
            onClick={() => navigate('/app/team/add')}
            className="inline-flex items-center gap-2 rounded-full bg-primary-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary-700"
          >
            <UserPlus size={18} />
            Adicionar helper
          </button>
        }
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 owner-grid-tight">
        {teamHighlights.map((card) => (
          <SurfaceCard key={card.label} className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{card.value}</p>
          </SurfaceCard>
        ))}
      </section>

      {/* Lists Section */}

      <div className="space-y-6">
        <div className="rounded-[32px] border border-gray-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.06)] p-6 space-y-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Time ativo</p>
            <h2 className="text-2xl font-bold text-gray-900">
              {totalMembers} membro{totalMembers === 1 ? '' : 's'}{' '}
              <span className="text-base font-medium text-gray-500">({helpers.length} helpers)</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">{error}</div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => {
                const dayState = helperDayData[member.id];
                const selectedDay = helperSelectedDay[member.id] ?? 'today';
                const dayData = dayState?.[selectedDay]?.data ?? null;
                const dayLoading = dayState?.[selectedDay]?.loading ?? false;
                const dayError = dayState?.[selectedDay]?.error ?? '';

                return (
                  <div
                    key={member.id}
                    onClick={() => navigate(`/app/team/edit/${member.id}`)}
                    className="rounded-[22px] border border-gray-100 bg-white/90 p-4 md:p-5 shadow-sm space-y-4 cursor-pointer hover:border-indigo-100 transition-colors"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{member.name}</p>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Mail size={14} /> {member.email}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                          <ShieldCheck size={12} />
                          {roleLabels[member.role ?? 'HELPER'] ?? 'Colaborador'}
                          {member.role === 'HELPER' && (
                            <span className="ml-2 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                              {member.helperPayoutMode === 'PERCENTAGE' ? `${member.helperPayoutValue}% por serviço` : `${usdFormatter.format(member.helperPayoutValue || 0)} fixo`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-gray-600">
                          <Phone size={14} />
                          {member.contactPhone || member.whatsappNumber || 'Sem telefone'}
                        </span>
                        {member.role === 'HELPER' && (
                          <button
                            onClick={() => {
                              setPayoutModal({
                                isOpen: true,
                                helper: member,
                                mode: member.helperPayoutMode || 'FIXED',
                                value: member.helperPayoutValue?.toString() || '0',
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50"
                          >
                            Configurar Ganhos
                          </button>
                        )}
                        {member.role === 'HELPER' && normalizePhone(member.contactPhone ?? member.whatsappNumber) && (
                          <a
                            href={`sms:${normalizePhone(member.contactPhone ?? member.whatsappNumber)}`}
                            className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-primary-700"
                          >
                            <MessageCircle size={14} /> SMS
                          </a>
                        )}
                      </div>
                    </div>

                    {member.role === 'HELPER' && (
                      <button
                        type="button"
                        onClick={() => toggleHelperDetails(member.id)}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition"
                      >
                        <BarChart3 size={16} />
                        {expandedHelperId === member.id ? 'Fechar painel' : 'Ver rotas'}
                      </button>
                    )}

                    {member.role === 'HELPER' && expandedHelperId === member.id && (
                      <div className="space-y-4 border-t border-gray-200 pt-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="inline-flex bg-white border border-gray-200 rounded-full p-1">
                            {(['today', 'tomorrow'] as DayKey[]).map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  setHelperSelectedDay((prev) => ({ ...prev, [member.id]: day }));
                                  if (!helperDayData[member.id]?.[day]) {
                                    fetchHelperDay(member.id, day);
                                  }
                                }}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${selectedDay === day ? 'bg-primary-600 text-white shadow' : 'text-gray-600'
                                  }`}
                              >
                                {day === 'today' ? 'Hoje' : 'Amanhã'}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            {dayData?.date && (
                              <p className="capitalize">
                                {new Date(dayData.date).toLocaleDateString('pt-BR', {
                                  weekday: 'long',
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => fetchHelperDay(member.id, selectedDay)}
                              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 font-semibold text-gray-600 hover:border-primary-200"
                            >
                              Atualizar rotas
                            </button>
                            <a
                              href="/app/financeiro"
                              className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 font-semibold text-primary-700"
                            >
                              Ver custos no Financeiro
                            </a>
                          </div>
                        </div>

                        {dayLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                          </div>
                        ) : dayError ? (
                          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">{dayError}</div>
                        ) : dayData?.appointments.length ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                              {[
                                { label: 'Serviços', value: dayData?.summary.total ?? 0 },
                                { label: 'Pendentes', value: dayData?.summary.pending ?? 0 },
                                { label: 'Em andamento', value: dayData?.summary.inProgress ?? 0 },
                                { label: 'Concluídos', value: dayData?.summary.completed ?? 0 },
                                {
                                  label: 'Pagamento helper',
                                  value: usdFormatter.format(dayData?.summary.payoutTotal ?? 0),
                                },
                              ].map((card) => (
                                <div key={card.label} className="bg-white rounded-2xl border border-gray-100 px-3 py-2">
                                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">{card.label}</p>
                                  <p className="text-lg font-semibold text-gray-900">{card.value}</p>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-3">
                              {dayData?.appointments.map((appointment) => {
                                const progress = getChecklistProgress(appointment);
                                const durationLabel = formatDuration(appointment);
                                const smsLink = normalizePhone(appointment.customer.phone)
                                  ? `sms:${normalizePhone(appointment.customer.phone)}`
                                  : null;
                                const directions =
                                  appointment.customer.latitude && appointment.customer.longitude
                                    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                      `${appointment.customer.latitude},${appointment.customer.longitude}`,
                                    )}`
                                    : appointment.customer.address
                                      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                        appointment.customer.address,
                                      )}`
                                      : null;
                                return (
                                  <div key={appointment.id} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2 justify-between">
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900">{appointment.customer.name}</p>
                                        <p className="text-xs text-gray-500">{appointment.startTime}</p>
                                      </div>
                                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                                        {appointment.status === 'AGENDADO'
                                          ? 'Pendente'
                                          : appointment.status === 'EM_ANDAMENTO'
                                            ? 'Em andamento'
                                            : 'Concluído'}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                        <span>
                                          Checklist {progress.completed}/{progress.total}
                                        </span>
                                        <span>{progress.percent}%</span>
                                      </div>
                                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress.percent}%` }} />
                                      </div>
                                    </div>
                                    {durationLabel && (
                                      <p className="text-xs text-gray-500">Tempo total: {durationLabel}</p>
                                    )}
                                    <p className="text-xs text-emerald-600 font-semibold">
                                      Pagamento helper: {usdFormatter.format(appointment.helperFee ?? 0)}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-primary-700 font-semibold">
                                      {smsLink && (
                                        <a href={smsLink} className="inline-flex items-center gap-1">
                                          <MessageCircle size={14} /> SMS cliente
                                        </a>
                                      )}
                                      {directions && (
                                        <a href={directions} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                                          <Navigation2 size={14} /> Traçar rota
                                        </a>
                                      )}
                                    </div>
                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 space-y-3">
                                      <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="font-semibold text-gray-700">Checklist</span>
                                        <span>
                                          {appointment.checklist.filter((item) => item.completedAt).length}/
                                          {appointment.checklist.length}
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        {appointment.checklist.length ? (
                                          appointment.checklist.map((task) => (
                                            <div
                                              key={task.id}
                                              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm gap-2"
                                            >
                                              <button
                                                type="button"
                                                onClick={() => handleToggleChecklistItem(member.id, appointment.id, task.id)}
                                                disabled={checklistActionId === task.id}
                                                className={`w-6 h-6 rounded-full border flex items-center justify-center ${task.completedAt
                                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                                  : 'border-gray-300 text-gray-400'
                                                  }`}
                                              >
                                                {task.completedAt && <Check size={14} />}
                                              </button>
                                              <span
                                                className={`flex-1 ${task.completedAt ? 'text-emerald-600 font-semibold' : 'text-gray-700'
                                                  }`}
                                              >
                                                {task.title}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveChecklistItem(member.id, appointment.id, task.id)}
                                                disabled={checklistActionId === task.id}
                                                className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                              >
                                                <X size={14} />
                                              </button>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-xs text-gray-500">Nenhum item cadastrado.</p>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={newChecklistTitles[appointment.id] ?? ''}
                                          onChange={(e) =>
                                            setNewChecklistTitles((prev) => ({
                                              ...prev,
                                              [appointment.id]: e.target.value,
                                            }))
                                          }
                                          placeholder="Novo item..."
                                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleAddChecklistItem(member.id, appointment.id)}
                                          disabled={
                                            !newChecklistTitles[appointment.id]?.trim() || checklistActionId === appointment.id
                                          }
                                          className="px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
                                        >
                                          Adicionar
                                        </button>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Recados para a helper
                                      </p>
                                      <textarea
                                        value={notesDrafts[appointment.id] ?? appointment.notes ?? ''}
                                        onChange={(e) =>
                                          setNotesDrafts((prev) => ({
                                            ...prev,
                                            [appointment.id]: e.target.value,
                                          }))
                                        }
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Ex: Foque nos armários da cozinha, levar aspirador..."
                                      />
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveNotes(member.id, appointment.id)}
                                          disabled={notesSavingId === appointment.id}
                                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
                                        >
                                          {notesSavingId === appointment.id ? (
                                            <>
                                              <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                                            </>
                                          ) : (
                                            'Salvar recado'
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum serviço atribuído para o dia selecionado.</p>
                        )}

                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-[32px] border border-gray-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.06)] p-6 space-y-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Clientes com acesso</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-bold text-gray-900">{clientMembers.length}</h2>
              <span className="text-sm text-gray-500">
                usuários ativos
              </span>
            </div>
          </div>

          {clientMembers.length ? (
            <div className="space-y-3">
              {clientMembers.map((client) => (
                <div key={client.id} className="rounded-2xl border border-gray-100 p-4 space-y-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{client.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail size={14} /> {client.email}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      Cliente
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1">
                      <Phone size={12} />
                      {client.contactPhone || client.whatsappNumber || 'Sem telefone'}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/app/perfil?view=portal')}
                      className="inline-flex items-center gap-1 text-primary-600 font-semibold"
                    >
                      <UserPlus size={12} />
                      Gerenciar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 space-y-2">
              <p>Nenhum cliente com login ativo ainda.</p>
              <button
                type="button"
                onClick={() => navigate('/app/perfil?view=portal')}
                className="inline-flex items-center gap-2 text-primary-600 font-semibold"
              >
                <UserPlus size={14} />
                Gerenciar acessos
              </button>
            </div>
          )}
        </div>
      </div>
      {/* End Lists Section */}
    </div>
  );
};

export default Team;

