import React, { ReactNode } from 'react';
import { usePreferences } from '../../contexts/PreferencesContext';

interface GradientHeaderProps {
    title: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
    breadcrumbs?: ReactNode;
    className?: string;
}

const GradientHeader: React.FC<GradientHeaderProps> = ({ title, actions, children, breadcrumbs, className = '' }) => {
    const { theme } = usePreferences();
    const isDarkTheme = theme === 'dark';

    return (
        <div className={`pt-12 pb-12 px-6 rounded-b-[2.5rem] shadow-sm border-b relative overflow-hidden ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} ${className}`}>
            <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b -z-10 ${isDarkTheme ? 'from-slate-800/50 to-transparent' : 'from-slate-50/50 to-transparent'}`} />

            {/* Top Bar */}
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    {breadcrumbs}
                    <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
                </div>
                {actions && (
                    <div className="flex gap-3">
                        {actions}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

export default GradientHeader;
