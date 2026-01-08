import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp, Users, XCircle, Sparkles } from 'lucide-react';
import AgendaMensal from './AgendaMensal';
import AgendaSemanal, { type WeekDetails, type WeekSummary } from './AgendaSemanal';
import { useRegisterQuickAction } from '../contexts/QuickActionContext';
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
  const { theme } = usePreferences();
  const isDarkTheme = theme === 'dark';

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

  return (
    <div className={embedded ? 'space-y-6' : `${pageGutters} space-y-4`}>
      <div className={embedded ? undefined : heroOuter}>
        <div
          style={
            embedded
              ? undefined
              : {
                  background: isDarkTheme
                    ? '#0f172a' // slate-900
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
        <div 
          onClick={() => setWeekSummaryOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setWeekSummaryOpen(true);
            }
          }}
          className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800 p-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
        >
          <div className="flex w-full items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                <Sparkles size={18} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Resumo Semanal</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Toque para visualizar a análise</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setWeekBannerDismissed(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
              <div className="rounded-full bg-slate-50 dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                Ver
              </div>
            </div>
          </div>
        </div>
      )}

      {weekSummaryOpen && weekSummary && weekDetails && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/45 dark:bg-black/60 animate-sheet-fade backdrop-blur-sm"
            onClick={() => setWeekSummaryOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-[32px] animate-sheet-up max-h-[92vh] flex flex-col shadow-2xl">
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-t-[32px] border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Análise Semanal</h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{weekSummary.rangeLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWeekSummaryOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  aria-label="Fechar resumo"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-12">
              {/* Visão Geral - Dashboard Style */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 rounded-3xl bg-slate-900 dark:bg-slate-950 p-5 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden border border-slate-800 dark:border-slate-900">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp size={120} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-sm font-medium text-indigo-200 mb-1">Receita Estimada</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight">{currencyFormatter.format(weekRevenue)}</span>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                        <Users size={14} className="text-indigo-300" />
                        <span className="text-xs font-semibold">{weekSummary.uniqueCustomers} clientes</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1.5 backdrop-blur-sm border border-emerald-500/30">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-100">{weekSummary.scheduledCount} agendados</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-4 flex flex-col justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mb-2">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-amber-900 dark:text-amber-100 block">{weekSummary.confirmCount}</span>
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">A confirmar</span>
                  </div>
                </div>

                <div className="rounded-3xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 flex flex-col justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mb-2">
                    <XCircle size={16} />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-red-900 dark:text-red-100 block">{weekSummary.canceledCount}</span>
                    <span className="text-xs font-semibold text-red-700 dark:text-red-300">Cancelados</span>
                  </div>
                </div>
              </div>

              {/* Listas de Detalhes - Clean Layout */}
              <div className="space-y-6">
                {weekDetails.confirm.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Atenção Necessária
                      </h3>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{weekDetails.confirm.length} pendentes</span>
                    </div>
                    <div className="space-y-2">
                      {weekDetails.confirm.map((item) => (
                        <div key={item.id} className="group flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:border-amber-200 dark:hover:border-amber-700/50 hover:shadow-md transition-all">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.customerName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.dateLabel} • {item.timeLabel}</p>
                          </div>
                          <button
                            onClick={() => {
                              setWeekSummaryOpen(false);
                              window.dispatchEvent(
                                new CustomEvent('agenda-edit-appointment', { detail: { id: item.id } }),
                              );
                            }}
                            className="ml-3 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition"
                          >
                            Confirmar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {weekDetails.canceled.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Cancelamentos
                      </h3>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{weekDetails.canceled.length} itens</span>
                    </div>
                    <div className="space-y-2">
                      {weekDetails.canceled.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 opacity-75 hover:opacity-100 transition-opacity">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 line-through decoration-slate-400">{item.customerName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">{item.dateLabel}</p>
                          </div>
                          <button
                            onClick={() => {
                              setWeekSummaryOpen(false);
                              window.dispatchEvent(
                                new CustomEvent('agenda-edit-appointment', { detail: { id: item.id } }),
                              );
                            }}
                            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            Ver
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Call to Action - Chat */}
                <div className="rounded-3xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Precisa de ajuda?</p>
                    <p className="text-xs text-indigo-700/80 dark:text-indigo-300/70 max-w-[200px] mx-auto">
                      O assistente pode ajudar a reorganizar sua agenda ou contatar clientes.
                    </p>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-agent'))}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition active:scale-95"
                  >
                    Falar com Assistente
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
