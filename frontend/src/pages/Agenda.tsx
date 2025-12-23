import { useCallback, useEffect, useState } from 'react';
import AgendaMensal from './AgendaMensal';
import AgendaSemanal from './AgendaSemanal';
import { useRegisterQuickAction } from '../contexts/QuickActionContext';
import { PageHeader } from '../components/OwnerUI';
import { Plus } from 'lucide-react';
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
  const handleAgendaQuickCreate = useCallback(() => {
    setViewMode('week');
    setQuickCreateNonce((nonce) => nonce + 1);
  }, []);
  useRegisterQuickAction('agenda:add', handleAgendaQuickCreate);

  return (
    <div
      className={embedded ? 'space-y-6' : `${pageGutters}`}
      style={
        embedded
          ? undefined
          : {
              background: 'linear-gradient(180deg, #f3f4ff 0%, #f3f4ff 42%, #e2e8ff 100%)',
              borderRadius: '24px',
            }
      }
    >
      {!embedded && (
        <PageHeader
          title="Schedule"
          subtitle="Planeje sua semana e organize a rota da equipe."
          subtitleHiddenOnMobile
          actions={
            <button
              type="button"
              onClick={handleAgendaQuickCreate}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-800"
            >
              <Plus size={16} />
              Novo agendamento
            </button>
          }
        />
      )}

      <div>{viewMode === 'week' ? <AgendaSemanal embedded quickCreateNonce={quickCreateNonce} /> : <AgendaMensal embedded />}</div>
    </div>
  );
};

export default Agenda;
