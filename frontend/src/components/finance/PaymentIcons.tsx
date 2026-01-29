import React from 'react';

type IconProps = {
    className?: string;
};

export const ZelleIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z" fill="#6D1ED4" />
        <path d="M7 16h10v-2h-3.5L17 10V8H7v2h3.5L7 14v2z" fill="#fff" />
    </svg>
);

export const VenmoIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M19.5 4.5l-4.5 13.5-3-10.5h-4l-3 10.5-1.5-4.5h-3l2.5 7.5c1.5 4.5 3.5 4.5 5.5 0l3.5-11 4.5-13.5h-4z" fill="#008CFF" />
        {/* Simplified V shape, usually Venmo is just the V text but broadly recognized as the blue V */}
        <path d="M24 0H0v24h24V0z" fill="none" />
        <path d="M17.65 3.9h-4.23c-.76 0-1.42.53-1.6 1.28L10.3 14 7.6 4.9c-.16-.54-.66-.9-1.22-.9H2.86c-.9 0-1.54.85-1.22 1.68l4.43 11.53c.96 2.5 4.14 2.5 5.1 0l7.7-12.03c.48-.75-.06-1.74-.95-1.74z" fill="#008CFF" />
    </svg>
);

// Better Venmo Path approximating the logo
export const VenmoLogo: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path fill="#3D95CE" d="M26.96 4.09h-5.22c-.63 0-1.2.39-1.43.98l-4.04 10.46-3.7-9.87c-.24-.65-.85-1.07-1.54-1.07H6.77c-.98 0-1.66 1.02-1.25 1.9l6.39 13.68c1.09 2.33 4.39 2.33 5.48 0L28.18 5.76c.4-.87-.24-1.67-1.22-1.67z" />
    </svg>
);


export const CashAppIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="24" height="24" rx="6" fill="#00D632" />
        <path d="M12 6v12m-3-9h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9m3-10v-2m0 14v2" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
// CashApp logo is essentially a dollar sign, often stylized. 
// A green rounded square with a dollar sign is the most recognizable icon.

export const CashIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="10" fill="#334155" />
        <path d="M12 6v12m-3.5-3.5 7-5m-7 0 7 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Simple stylized bills icon */}
        <path d="M16 10a4 4 0 0 1-8 0m0 4a4 4 0 0 0 8 0" stroke="#fff" strokeWidth="2" />
        <rect x="4" y="6" width="16" height="12" rx="2" fill="#334155" stroke="#fff" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="2" />
        <path d="M6 12h2m8 0h2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
);
