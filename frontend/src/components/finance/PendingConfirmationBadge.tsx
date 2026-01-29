import React from 'react';
import { AlertCircle } from 'lucide-react';

interface PendingConfirmationBadgeProps {
    onClick?: () => void;
    isDark?: boolean;
}

export const PendingConfirmationBadge: React.FC<PendingConfirmationBadgeProps> = ({
    onClick,
    isDark = false
}) => {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-all hover:scale-105 ${isDark
                    ? 'bg-amber-900/20 text-amber-400 border-amber-600 hover:bg-amber-900/30'
                    : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                }`}
            title="Cliente reportou pagamento - clique para confirmar"
        >
            <AlertCircle size={14} className="animate-pulse" />
            <span>Pendente Confirmação</span>
        </button>
    );
};

export default PendingConfirmationBadge;
