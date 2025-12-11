import type { ReactNode } from 'react';

type BadgeTone = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

const badgeToneClasses: Record<BadgeTone, string> = {
  primary: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  error: 'bg-red-50 text-red-700 border-red-100',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const PageHeader = ({
  label: _label,
  title,
  subtitle,
  actions,
  className = '',
  subtitleHiddenOnMobile = false,
}: {
  label?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  subtitleHiddenOnMobile?: boolean;
}) => (
  <div className={`space-y-2 mt-3 md:mt-4 ${className}`}>
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)]">{title}</h1>
        {subtitle && (
          <p
            className={`text-sm text-[var(--text-secondary)] max-w-2xl ${subtitleHiddenOnMobile ? 'hidden sm:block' : ''}`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions}
    </div>
  </div>
);

export const SurfaceCard = ({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) => (
  <div
    className={`bg-[var(--card-bg)] text-[var(--text-primary)] rounded-2xl border border-[var(--card-border)] shadow-[0_12px_36px_rgba(0,0,0,0.18)] ${
      padded ? 'p-4 md:p-5' : ''
    } ${className}`}
  >
    {children}
  </div>
);

export const StatusBadge = ({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badgeToneClasses[tone]} ${className}`}
  >
    {children}
  </span>
);

