import { useCallback, useEffect, useState } from 'react';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import AgendaMensal from './AgendaMensal';
import AgendaSemanal from './AgendaSemanal';
import { useRegisterQuickAction } from '../contexts/QuickActionContext';
import { PageHeader, SurfaceCard } from '../components/OwnerUI';
import { pageGutters } from '../styles/uiTokens';
import AudioQuickAdd from '../components/AudioQuickAdd';

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
  const handleChangeView = (mode: AgendaView) => {
    setViewMode(mode);
  };
  const handleAgendaQuickCreate = useCallback(() => {
    setViewMode('week');
    setQuickCreateNonce((nonce) => nonce + 1);
  }, []);
  useRegisterQuickAction('agenda:add', handleAgendaQuickCreate);

  const today = new Date();
  const weekEnd = addDays(today, 6);
  const weekRangeLabel = `${format(today, "dd 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "dd 'de' MMM", {
    locale: ptBR,
  })}`;
  const headerSubtitle =
    viewMode === 'week'
      ? `Semana atual · ${weekRangeLabel}`
      : `Calendário mensal · ${format(today, "MMMM 'de' yyyy", { locale: ptBR })}`;
  const quickFilters = ['Todos', 'Agendado', '+ andamento', 'Concluído'];

  return (
    <div className={embedded ? 'space-y-6' : `${pageGutters}`}>
      {!embedded && (
        <PageHeader
          title="Schedule"
          subtitle="Planeje sua semana e organize a rota da equipe."
          subtitleHiddenOnMobile
          className="hidden sm:block"
        />
      )}

      <SurfaceCard className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex bg-slate-100 rounded-full p-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleChangeView('week')}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-all ${
              viewMode === 'week' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => handleChangeView('month')}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-all ${
              viewMode === 'month' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Mês
              </button>
            </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
          <CalendarIcon size={16} className="text-primary-500" />
          {headerSubtitle}
        </div>
      </SurfaceCard>

        {viewMode === 'month' && (
        <SurfaceCard className="hidden md:block">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-primary-200 hover:text-primary-600 transition"
              >
                {filter}
              </button>
            ))}
          </div>
        </SurfaceCard>
        )}

      <div>{viewMode === 'week' ? <AgendaSemanal embedded quickCreateNonce={quickCreateNonce} /> : <AgendaMensal embedded />}</div>
      <AudioQuickAdd contextHint={(() => {
        if (viewMode === 'week') {
          const now = new Date();
          const weekStart = startOfWeek(now, { weekStartsOn: 0 });
          const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
          return `Usuário está na visão semanal. Semana corrente: ${format(weekStart, 'yyyy-MM-dd')} até ${format(
            weekEnd,
            'yyyy-MM-dd',
          )}. Se ele disser "quinta-feira" ou "terça", use esta semana. Ano é o atual.`;
        }
        const now = new Date();
        return `Usuário está na visão mensal. Mês atual: ${format(now, 'MMMM yyyy')}. Se disser só um dia (ex: dia 12), use este mês e ano atual.`;
      })()} />
    </div>
  );
};

export default Agenda;
