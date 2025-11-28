import { useEffect, useState } from 'react';
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">Agendamento</p>
          <h1 className="text-3xl font-bold text-gray-900">Planeje e marque seus clientes</h1>
          <p className="text-sm text-gray-500">
            Clique nos cards da semana ou do mês para criar novos atendimentos, reagendar ou ajustar detalhes em
            segundos.
          </p>
        </div>
        <div className="inline-flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleChangeView('week')}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              viewMode === 'week' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => handleChangeView('month')}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              viewMode === 'month' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mês
          </button>
        </div>
      </div>

      <div>
        {viewMode === 'week' ? <AgendaSemanal embedded /> : <AgendaMensal embedded />}
      </div>
    </div>
  );
};

export default Agenda;
