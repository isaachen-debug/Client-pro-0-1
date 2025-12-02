import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import { teamApi, type CreateHelperPayload } from '../services/api';
import type { HelperAppointment, HelperDayResponse, User } from '../types';

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

const Team = () => {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CreateHelperPayload>({
    name: '',
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedHelperId, setExpandedHelperId] = useState<string | null>(null);
  const [helperDayData, setHelperDayData] = useState<
    Record<string, Record<DayKey, { loading: boolean; data: HelperDayResponse | null; error: string }>>
  >({});
  const [helperSelectedDay, setHelperSelectedDay] = useState<Record<string, DayKey>>({});
  const [newChecklistTitles, setNewChecklistTitles] = useState<Record<string, string>>({});
  const [checklistActionId, setChecklistActionId] = useState<string | null>(null);
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [notesSavingId, setNotesSavingId] = useState<string | null>(null);
  const helpers = useMemo(() => members.filter((member) => member.role === 'HELPER'), [members]);
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setSubmitting(true);
    try {
      await teamApi.createHelper(form);
      setSuccessMessage('Helper criada com sucesso! Compartilhe o e-mail e senha com ela.');
      setForm({ name: '', email: '', password: '' });
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível criar a helper.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">Equipe</p>
        <h1 className="text-3xl font-bold text-gray-900">Controle quem te ajuda no campo</h1>
        <p className="text-gray-600 max-w-2xl">
          Convide helpers para acompanhar a rotina diária. Você define quem acessa o app e pode compartilhar e-mails e
          senhas iniciais com um clique.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start">
        <div className="space-y-6 w-full lg:max-w-xl">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 flex items-start gap-3">
            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
              <BarChart3 size={18} />
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-gray-900">Controle rápido das rotas</p>
              <p>
                Clique em <span className="font-semibold text-primary-700">“Ver rotas”</span> para abrir o painel da helper,
                adicionar ou remover itens de checklist e mandar recados que aparecem no app dela.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
                <UserPlus size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Adicionar helper</p>
                <p className="text-gray-500 text-sm">Crie o acesso e compartilhe as credenciais.</p>
              </div>
            </div>

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl px-3 py-2 mb-3">
                {successMessage}
              </div>
            )}
            {error && !loading && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-3 py-2 mb-3">{error}</div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="helper@clientpro.com"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Senha inicial</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 text-white font-semibold py-3 hover:bg-primary-700 transition disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Criar helper'
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-primary-600">Time ativo</p>
              <h2 className="text-2xl font-bold text-gray-900">
                {members.length}{' '}
                <span className="text-base font-medium text-gray-500">
                  membro{members.length === 1 ? '' : 's'} ({helpers.length} helpers)
                </span>
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">{error}</div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const dayState = helperDayData[member.id];
                const selectedDay = helperSelectedDay[member.id] ?? 'today';
                const dayData = dayState?.[selectedDay]?.data ?? null;
                const dayLoading = dayState?.[selectedDay]?.loading ?? false;
                const dayError = dayState?.[selectedDay]?.error ?? '';

                return (
                <div
                  key={member.id}
                  className="rounded-2xl border border-gray-100 px-4 py-3 bg-gray-50/70 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Mail size={14} /> {member.email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <ShieldCheck size={12} />
                        {roleLabels[member.role ?? 'HELPER'] ?? 'Colaborador'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-2">
                        <Phone size={14} />
                        {member.contactPhone || member.whatsappNumber || 'Sem telefone'}
                      </span>
                      {member.role === 'HELPER' && normalizePhone(member.contactPhone ?? member.whatsappNumber) && (
                        <a
                          href={`sms:${normalizePhone(member.contactPhone ?? member.whatsappNumber)}`}
                          className="inline-flex items-center gap-1 text-primary-600 font-semibold"
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
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-primary-100 text-primary-700 font-semibold py-2 text-sm hover:bg-primary-50 transition"
                    >
                      <BarChart3 size={16} />
                      {expandedHelperId === member.id ? 'Fechar rota' : 'Ver rotas'}
                    </button>
                  )}

                  {member.role === 'HELPER' && expandedHelperId === member.id && (
                    <div className="border-t border-gray-200 pt-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
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
                              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                                selectedDay === day ? 'bg-primary-600 text-white shadow' : 'text-gray-600'
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
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-semibold"
                          >
                            Atualizar rotas
                          </button>
                          <a
                            href="/app/financeiro"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 font-semibold border border-primary-100"
                          >
                            Ver custos no Financeiro
                          </a>
                        </div>
                      </div>
                      
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
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                                  selectedDay === day ? 'bg-primary-600 text-white shadow' : 'text-gray-600'
                                }`}
                              >
                                {day === 'today' ? 'Hoje' : 'Amanhã'}
                              </button>
                            ))}
                          </div>

                          {dayLoading ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                            </div>
                          ) : dayError ? (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">{dayError}</div>
                          ) : dayData?.appointments.length ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                                  <div key={card.label} className="bg-white rounded-xl border border-gray-100 px-3 py-2">
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
                                                  className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                                                    task.completedAt
                                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                                      : 'border-gray-300 text-gray-400'
                                                  }`}
                                                >
                                                  {task.completedAt && <Check size={14} />}
                                                </button>
                                                <span
                                                  className={`flex-1 ${
                                                    task.completedAt ? 'text-emerald-600 font-semibold' : 'text-gray-700'
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
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Team;

