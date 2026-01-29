import React from 'react';

interface PaymentMethodBadgeProps {
    method: 'ZELLE' | 'VENMO' | 'CASH_APP' | 'CASH' | 'CREDIT_CARD' | null;
    size?: 'sm' | 'md' | 'lg';
}

const BADGE_CONFIG = {
    ZELLE: {
        icon: '💵',
        label: 'Zelle',
        colors: 'bg-purple-100 text-purple-700 border-purple-200',
        colorsDark: 'bg-purple-900/30 text-purple-400 border-purple-800',
    },
    VENMO: {
        icon: '📱',
        label: 'Venmo',
        colors: 'bg-blue-100 text-blue-700 border-blue-200',
        colorsDark: 'bg-blue-900/30 text-blue-400 border-blue-800',
    },
    CASH_APP: {
        icon: '💰',
        label: 'Cash App',
        colors: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        colorsDark: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
    },
    CASH: {
        icon: '💵',
        label: 'Dinheiro',
        colors: 'bg-slate-100 text-slate-700 border-slate-200',
        colorsDark: 'bg-slate-800 text-slate-300 border-slate-700',
    },
    CREDIT_CARD: {
        icon: '💳',
        label: 'Cartão',
        colors: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        colorsDark: 'bg-indigo-900/30 text-indigo-400 border-indigo-800',
    },
};

export const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({ method, size = 'md' }) => {
    if (!method || !BADGE_CONFIG[method]) return null;

    const config = BADGE_CONFIG[method];

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
    };

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses[size]} ${config.colors} dark:${config.colorsDark}`}
        >
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    );
};

export default PaymentMethodBadge;
