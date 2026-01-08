import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarRange, CheckCircle2, TrendingUp, Users, XCircle } from 'lucide-react';
import AgendaMensal from './AgendaMensal';
import AgendaSemanal, { type WeekDetails, type WeekSummary } from './AgendaSemanal';
import { useRegisterQuickAction } from '../contexts/QuickActionContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { heroInner, heroOuter } from '../styles/uiTokens';
import { pageGutters } from '../styles/uiTokens';

const toneStyles: Record<
  'amber' | 'blue' | 'red',
  { lightBorder: string; lightIcon: string; darkIcon: string }
> = {
  amber: {
    lightBorder: 'border-amber-100',
    lightIcon: 'bg-amber-100 text-amber-800',
    darkIcon: 'bg-amber-500/25 text-amber-50',
  },
  blue: {
    lightBorder: 'border-blue-100',
    lightIcon: 'bg-blue-100 text-blue-800',
    darkIcon: 'bg-blue-500/25 text-blue-50',
  },
  red: {
    lightBorder: 'border-red-100',
    lightIcon: 'bg-red-100 text-red-800',
    darkIcon: 'bg-red-500/25 text-red-50',
  },
};

type AgendaView = 'week' | 'month';
type ToneKey = keyof typeof toneStyles;
type SummaryCard = {
  label: string;
  value: number;
  tone: ToneKey;
  icon: typeof AlertTriangle;
};

const STORAGE_KEY = 'clientepro:agenda-view-mode';

type AgendaPageProps = {
  initialMode?: AgendaView;
  embedded?: boolean;
};

const Agenda = ({ initialMode, embedded = false }: AgendaPageProps) => {
  const [viewMode, setViewMode] = useState<AgendaView>(() => {
    if (typeof window === 'undefined') {
      return initialMode || 'week';
    }
    if (initialMode) {
      return initialMode;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'month' || stored === 'week' ? (stored as AgendaView) : 'week';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  const [quickCreateNonce, setQuickCreateNonce] = useState(0);
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null);
  const [weekDetails, setWeekDetails] = useState<WeekDetails | null>(null);
  const [weekSummaryOpen, setWeekSummaryOpen] = useState(false);
  const [weekBannerDismissed, setWeekBannerDismissed] = useState(false);
  const summaryCards = useMemo<SummaryCard[]>(() => {
    if (!weekSummary) return [];
    return [
      { label: 'A confirmar', value: weekSummary.confirmCount, tone: 'amber', icon: AlertTriangle },
      { label: 'Agendado', value: weekSummary.scheduledCount, tone: 'blue', icon: CheckCircle2 },
      { label: 'Cancelado', value: weekSummary.canceledCount, tone: 'red', icon: XCircle },
    ];
  }, [weekSummary]);
  const weekRevenue = useMemo(() => {
    if (!weekDetails) return 0;
    return weekDetails.scheduled.reduce((total, item) => total + (item.price ?? 0), 0);
  }, [weekDetails]);
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    [],
  );
  const handleAgendaQuickCreate = useCallback(() => {
    setViewMode('week');
    setQuickCreateNonce((nonce) => nonce + 1);
  }, []);
  useRegisterQuickAction('agenda:add', handleAgendaQuickCreate);
  const { theme } = usePreferences();
  const isDarkTheme = theme === 'dark';

  return (
    <div className={embedded ? 'space-y-6' : `${pageGutters} space-y-4`}>
      <div className={embedded ? undefined : heroOuter}>
        <div
          style={
            embedded
              ? undefined
              : {
                  background: isDarkTheme
                    ? '#0b0f1a'
                    : '#eef2ff',
                  borderRadius: '24px',
                }
          }
          className={embedded ? undefined : `pt-[5px] ${heroInner}`}
        >
          <div>
            {viewMode === 'week' ? (
              <AgendaSemanal
                embedded
                quickCreateNonce={quickCreateNonce}
                onWeekSummaryChange={setWeekSummary}
                onWeekDetailsChange={setWeekDetails}
              />
            ) : (
              <AgendaMensal embedded />
            )}
          </div>
        </div>
      </div>

      {!embedded && viewMode === 'week' && weekSummary && !weekBannerDismissed && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
                <CalendarRange size={14} />
                Resumo
              </div>
              <p className="text-base font-semibold text-slate-900 leading-tight">{weekSummary.rangeLabel}</p>
              <p className="text-xs text-slate-500">Status rápido dos agendamentos da semana.</p>
            </div>
            <button
              type="button"
              onClick={() => setWeekBannerDismissed(true)}
              className="h-8 w-8 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition"
              aria-label="Fechar banner"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {summaryCards.map((item) => {
              const Icon = item.icon;
              const tone = toneStyles[item.tone];
              return (
                <div
                  key={item.label}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.lightBorder}`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tone.lightIcon}`}>
                    <Icon size={14} />
                  </span>
                  <span className="text-slate-700">{item.label}:</span>
                  <span className="text-slate-900">{item.value}</span>
                </div>
              );
            })}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Users size={14} />
              {weekSummary.uniqueCustomers} clientes únicos
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <TrendingUp size={14} />
              Total: {weekSummary.totalCount}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekSummaryOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
            >
              Ver detalhes
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {weekSummaryOpen && weekSummary && weekDetails && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/45 animate-sheet-fade"
            onClick={() => setWeekSummaryOpen(false)}
          />
          <div className="relative bg-white rounded-t-[28px] animate-sheet-up max-h-[92vh] flex flex-col">
            <div className="px-5 pt-5">
              <div className="flex items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-700">
                    <CalendarRange size={14} />
                    Resumo da semana
                  </span>
                  <p className="text-2xl font-bold text-slate-900 leading-tight">{weekSummary.rangeLabel}</p>
                  <p className="text-sm text-slate-500">
                    Priorize quem precisa confirmar o dia com o cliente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWeekSummaryOpen(false)}
                  className="h-11 w-11 rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition shadow-sm"
                  aria-label="Fechar resumo"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-5 pb-10 pt-5 space-y-6 overflow-y-auto">
              <div className="rounded-[28px] border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white/80">Visão geral</p>
                    <p className="text-xs text-white/70">Panorama rápido da sua semana.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                      <Users size={14} />
                      {weekSummary.uniqueCustomers} clientes únicos
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/90 px-3 py-1 text-white shadow">
                      <TrendingUp size={14} />
                      Total: {weekSummary.totalCount}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-white/90">
                      <TrendingUp size={14} />
                      {currencyFormatter.format(weekRevenue)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {summaryCards.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[item.tone].darkIcon}`}
                          >
                            <Icon size={18} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] uppercase tracking-wide text-white/70">{item.label}</p>
                            <p className="text-xl font-semibold text-white leading-none">{item.value}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[24px] border border-amber-100 bg-amber-50/80 p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                        <AlertTriangle size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-amber-900">A confirmar</p>
                        <p className="text-xs text-amber-700">
                          Confirme o dia com o cliente para garantir o atendimento.
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-800">
                      {weekDetails.confirm.length} cliente(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {weekDetails.confirm.length === 0 && (
                      <p className="text-xs text-amber-700">Nenhum cliente aguardando confirmação.</p>
                    )}
                    {weekDetails.confirm.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white border border-amber-100 px-3 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">{item.customerName}</p>
                            <p className="text-xs text-slate-500">{item.dateLabel} • {item.timeLabel}</p>
                            {item.notes && <p className="text-xs text-slate-500 line-clamp-2">{item.notes}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setWeekSummaryOpen(false);
                                window.dispatchEvent(
                                  new CustomEvent('agenda-edit-appointment', { detail: { id: item.id } }),
                                );
                              }}
                              className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-amber-600"
                            >
                              Confirmar dia
                            </button>
                            {item.price != null && (
                              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                {currencyFormatter.format(item.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-blue-100 bg-blue-50/80 p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                        <CheckCircle2 size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Agendado</p>
                        <p className="text-xs text-blue-700">Tudo confirmado para estes clientes.</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold text-blue-800">
                      {weekDetails.scheduled.length} cliente(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {weekDetails.scheduled.length === 0 && (
                      <p className="text-xs text-blue-700">Nenhum agendamento confirmado.</p>
                    )}
                    {weekDetails.scheduled.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white border border-blue-100 px-3 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">{item.customerName}</p>
                            <p className="text-xs text-slate-500">{item.dateLabel} • {item.timeLabel}</p>
                            {item.notes && <p className="text-xs text-slate-500 line-clamp-2">{item.notes}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {item.price != null && (
                              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                {currencyFormatter.format(item.price)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setWeekSummaryOpen(false);
                                window.dispatchEvent(
                                  new CustomEvent('agenda-edit-appointment', { detail: { id: item.id } }),
                                );
                              }}
                              className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-red-100 bg-red-50/80 p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-800">
                        <XCircle size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-red-900">Cancelado</p>
                        <p className="text-xs text-red-700">Observe para remarcar ou liberar agenda.</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-semibold text-red-800">
                      {weekDetails.canceled.length} cliente(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {weekDetails.canceled.length === 0 && (
                      <p className="text-xs text-red-700">Nenhum cancelamento nesta semana.</p>
                    )}
                    {weekDetails.canceled.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white border border-red-100 px-3 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">{item.customerName}</p>
                            <p className="text-xs text-slate-500">{item.dateLabel} • {item.timeLabel}</p>
                            {item.notes && <p className="text-xs text-slate-500 line-clamp-2">{item.notes}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {item.price != null && (
                              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                {currencyFormatter.format(item.price)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setWeekSummaryOpen(false);
                                window.dispatchEvent(
                                  new CustomEvent('agenda-edit-appointment', { detail: { id: item.id } }),
                                );
                              }}
                              className="text-xs font-semibold text-red-700 hover:text-red-800"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <TrendingUp size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">IA analisando</p>
                        <p className="text-xs text-slate-500">Estimativa semanal</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                      Baseado em agendados
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Com base nos agendamentos confirmados, você pode receber aproximadamente:
                  </p>
                  <div className="mt-3 rounded-2xl bg-slate-900 px-4 py-3 text-white text-lg font-semibold shadow">
                    {currencyFormatter.format(weekRevenue)}
                  </div>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-agent'))}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                  >
                    Abrir chat do assistente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
