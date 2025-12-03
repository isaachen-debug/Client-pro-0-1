import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Calendar as CalendarIcon } from 'lucide-react';
import AgendaMensal from './AgendaMensal';
import AgendaSemanal from './AgendaSemanal';

type AgendaView = 'week' | 'month';

const STORAGE_KEY = 'clientepro:agenda-view-mode';

type AgendaPageProps = {
  initialMode?: AgendaView;
};

const Agenda = ({ initialMode }: AgendaPageProps) => {
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

  const handleChangeView = (mode: AgendaView) => {
    setViewMode(mode);
  };

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
    <div className="p-4 md:p-8 space-y-6">
      <div className="rounded-[32px] border border-gray-100 bg-gradient-to-br from-white to-gray-50 shadow-sm p-5 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-primary-500 font-semibold">My Calendar</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Planeje e marque seus clientes</h1>
            <p className="text-sm text-gray-500 max-w-2xl">
              Clique nos cards da semana ou do mês para criar novos atendimentos, reagendar ou ajustar detalhes em segundos.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-inner">
            <CalendarIcon size={16} className="text-primary-500" />
            {headerSubtitle}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-2 flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar agenda, Clients ou contratos"
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          <div className="inline-flex bg-gray-100 rounded-2xl p-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleChangeView('week')}
              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                viewMode === 'week' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => handleChangeView('month')}
              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                viewMode === 'month' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mês
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-primary-200 hover:text-primary-600 transition"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div>
        {viewMode === 'week' ? <AgendaSemanal embedded /> : <AgendaMensal embedded />}
      </div>
    </div>
  );
};

export default Agenda;
