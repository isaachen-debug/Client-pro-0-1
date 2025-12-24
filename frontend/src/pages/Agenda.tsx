import { useCallback, useEffect, useMemo, useState } from 'react';
import AgendaMensal from './AgendaMensal';
import AgendaSemanal, { type WeekDetails, type WeekSummary } from './AgendaSemanal';
import { useRegisterQuickAction } from '../contexts/QuickActionContext';
import { PageHeader } from '../components/OwnerUI';
import { usePreferences } from '../contexts/PreferencesContext';
import { heroInner, heroOuter } from '../styles/uiTokens';
import { pageGutters } from '../styles/uiTokens';

type AgendaView = 'week' | 'month';

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
  const summaryCards = useMemo(() => {
    if (!weekSummary) return [];
    return [
      { label: 'A confirmar', value: weekSummary.confirmCount, badge: 'bg-amber-100 text-amber-700' },
      { label: 'Agendado', value: weekSummary.scheduledCount, badge: 'bg-blue-100 text-blue-700' },
      { label: 'Cancelado', value: weekSummary.canceledCount, badge: 'bg-red-100 text-red-700' },
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
                    ? 'linear-gradient(180deg, #0b0f1a 0%, #0b0f1a 42%, #121826 100%)'
                    : 'linear-gradient(180deg, #f3f4ff 0%, #f3f4ff 42%, #e2e8ff 100%)',
                  borderRadius: '24px',
                }
          }
          className={embedded ? undefined : `pt-3 ${heroInner}`}
        >
          {!embedded && (
            <PageHeader
              title="Schedule"
              subtitle="Planeje sua semana e organize a rota da equipe."
              subtitleHiddenOnMobile
            />
          )}

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
        <div className="rounded-[28px] border border-slate-200 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 px-4 py-4 shadow-[0_16px_40px_rgba(59,130,246,0.25)] text-white overflow-hidden relative">
          <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/20" />
          <div className="absolute -right-2 -bottom-10 h-24 w-24 rounded-full bg-white/15" />
          <div className="relative flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => setWeekSummaryOpen(true)}
              className="flex-1 text-left"
            >
              <p className="text-xs uppercase tracking-[0.32em] text-white/80 font-semibold">Resumo da semana</p>
              <p className="text-lg font-semibold text-white mt-1">{weekSummary.rangeLabel}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-white/20 px-3 py-1">A confirmar: {weekSummary.confirmCount}</span>
                <span className="rounded-full bg-white/20 px-3 py-1">Agendado: {weekSummary.scheduledCount}</span>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-slate-900 px-4 py-1.5 text-xs font-semibold shadow-sm">
                Abrir resumo
              </div>
            </button>
            <button
              type="button"
              onClick={() => setWeekBannerDismissed(true)}
              className="h-9 w-9 rounded-full border border-white/40 text-white/90 hover:text-white hover:border-white transition"
              aria-label="Fechar banner"
            >
              ✕
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
              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400 font-semibold">
                      Resumo da semana
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">{weekSummary.rangeLabel}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Priorize quem precisa confirmar o dia com o cliente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeekSummaryOpen(false)}
                    className="h-11 w-11 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition"
                    aria-label="Fechar resumo"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 pb-10 pt-5 space-y-6 overflow-y-auto">
              <div className="rounded-[28px] border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Visão geral</p>
                  <span className="text-xs text-white/70">Clientes únicos: {weekSummary.uniqueCustomers}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {summaryCards.map((item) => (
                    <div key={item.label} className="rounded-2xl bg-white/10 px-3 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                          {item.label}
                        </span>
                        <span className="text-lg font-semibold text-white">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-white/80">
                  <span>Total da semana</span>
                  <strong className="text-white">{weekSummary.totalCount}</strong>
                </div>
              </div>

              <div className="rounded-[28px] border border-amber-100 bg-amber-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-amber-900">A confirmar</p>
                  <span className="text-xs text-amber-700">
                    {weekDetails.confirm.length} cliente(s)
                  </span>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  Confirme o dia com o cliente para garantir o atendimento.
                </p>
                <div className="mt-3 space-y-2">
                  {weekDetails.confirm.length === 0 && (
                    <p className="text-xs text-amber-700">Nenhum cliente aguardando confirmação.</p>
                  )}
                  {weekDetails.confirm.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white border border-amber-100 px-3 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.customerName}</p>
                          <p className="text-xs text-slate-500">{item.dateLabel} • {item.timeLabel}</p>
                        </div>
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
                      </div>
                      {item.notes && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-blue-900">Agendado</p>
                  <span className="text-xs text-blue-700">{weekDetails.scheduled.length} cliente(s)</span>
                </div>
                <div className="mt-3 space-y-2">
                  {weekDetails.scheduled.length === 0 && (
                    <p className="text-xs text-blue-700">Nenhum agendamento confirmado.</p>
                  )}
                  {weekDetails.scheduled.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white border border-blue-100 px-3 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.customerName}</p>
                          <p className="text-xs text-slate-500">{item.dateLabel} • {item.timeLabel}</p>
                        </div>
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
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-red-100 bg-red-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-red-900">Cancelado</p>
                  <span className="text-xs text-red-700">{weekDetails.canceled.length} cliente(s)</span>
                </div>
                <div className="mt-3 space-y-2">
                  {weekDetails.canceled.length === 0 && (
                    <p className="text-xs text-red-700">Nenhum cancelamento nesta semana.</p>
                  )}
                  {weekDetails.canceled.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white border border-red-100 px-3 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.customerName}</p>
                          <p className="text-xs text-slate-500">{item.dateLabel} • {item.timeLabel}</p>
                        </div>
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
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">IA analisando</p>
                  <span className="text-xs text-slate-500">Estimativa semanal</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Com base nos agendamentos confirmados, você pode receber aproximadamente:
                </p>
                <div className="mt-3 rounded-2xl bg-slate-900 px-4 py-3 text-white text-lg font-semibold">
                  {currencyFormatter.format(weekRevenue)}
                </div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-agent'))}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  Abrir chat do assistente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
