import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    trend?: string;
    icon: LucideIcon;
    color: 'emerald' | 'blue' | 'amber' | 'purple' | 'red';
    isDark?: boolean;
}

const COLOR_CONFIG = {
    emerald: {
        bg: 'bg-emerald-50',
        bgDark: 'bg-emerald-900/20',
        icon: 'bg-emerald-100 text-emerald-600',
        iconDark: 'bg-emerald-800 text-emerald-400',
        text: 'text-emerald-700',
        textDark: 'text-emerald-400',
    },
    blue: {
        bg: 'bg-blue-50',
        bgDark: 'bg-blue-900/20',
        icon: 'bg-blue-100 text-blue-600',
        iconDark: 'bg-blue-800 text-blue-400',
        text: 'text-blue-700',
        textDark: 'text-blue-400',
    },
    amber: {
        bg: 'bg-amber-50',
        bgDark: 'bg-amber-900/20',
        icon: 'bg-amber-100 text-amber-600',
        iconDark: 'bg-amber-800 text-amber-400',
        text: 'text-amber-700',
        textDark: 'text-amber-400',
    },
    purple: {
        bg: 'bg-purple-50',
        bgDark: 'bg-purple-900/20',
        icon: 'bg-purple-100 text-purple-600',
        iconDark: 'bg-purple-800 text-purple-400',
        text: 'text-purple-700',
        textDark: 'text-purple-400',
    },
    red: {
        bg: 'bg-red-50',
        bgDark: 'bg-red-900/20',
        icon: 'bg-red-100 text-red-600',
        iconDark: 'bg-red-800 text-red-400',
        text: 'text-red-700',
        textDark: 'text-red-400',
    },
};

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    trend,
    icon: Icon,
    color,
    isDark = false,
}) => {
    const colors = COLOR_CONFIG[color];

    return (
        <div
            className={`p-4 rounded-2xl border ${isDark
                    ? `${colors.bgDark} border-slate-800`
                    : `${colors.bg} border-slate-200`
                }`}
        >
            <div className="flex items-start justify-between mb-3">
                <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {title}
                </p>
                <div
                    className={`p-2 rounded-xl ${isDark ? colors.iconDark : colors.icon
                        }`}
                >
                    <Icon size={16} />
                </div>
            </div>

            <div className="space-y-1">
                <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {value}
                </p>
                {trend && (
                    <p className={`text-xs font-medium ${colors.text} ${isDark && colors.textDark}`}>
                        {trend}
                    </p>
                )}
            </div>
        </div>
    );
};

export default MetricCard;
