import { useCallback, useEffect, useState } from 'react';
import AgendaMensal from './AgendaMensal';
import AgendaSemanal from './AgendaSemanal';
import { useRegisterQuickAction } from '../contexts/QuickActionContext';
import { PageHeader } from '../components/OwnerUI';
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
    <div className={embedded ? 'space-y-6' : `${pageGutters}`}>
      {!embedded && (
        <PageHeader
          title="Schedule"
          subtitle="Planeje sua semana e organize a rota da equipe."
          subtitleHiddenOnMobile
          className="hidden sm:block"
        />
      )}

      <div>{viewMode === 'week' ? <AgendaSemanal embedded quickCreateNonce={quickCreateNonce} /> : <AgendaMensal embedded />}</div>
    </div>
  );
};

export default Agenda;
