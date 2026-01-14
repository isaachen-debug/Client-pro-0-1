import { useState } from 'react';
import { MessageSquare, ChevronDown, Check, Car, Banknote, Star, Clock } from 'lucide-react';
import { Customer } from '../../types';

interface ClientMessageMenuProps {
    customer: Customer;
    isDark?: boolean;
}

const templates = [
    {
        id: 'on_my_way',
        label: 'Estou a caminho',
        icon: Car,
        color: 'text-blue-500',
        text: (name: string) => `Olá ${name}! A equipe da Clean Up está a caminho. Chegamos em aproximadamente 15 minutos.`
    },
    {
        id: 'arrived',
        label: 'Chegamos',
        icon: Check,
        color: 'text-emerald-500',
        text: (name: string) => `Olá ${name}! Nossa equipe acabou de chegar para o serviço agendado.`
    },
    {
        id: 'invoice',
        label: 'Enviar Cobrança',
        icon: Banknote,
        color: 'text-amber-500',
        text: (name: string) => `Olá ${name}, obrigado pela preferência! Segue o link para pagamento da limpeza de hoje: [Link]`
    },
    {
        id: 'review',
        label: 'Pedir Avaliação',
        icon: Star,
        color: 'text-yellow-400',
        text: (name: string) => `Oi ${name}! O que achou da limpeza? Sua opinião nos ajuda muito! Avalie-nos aqui: [Link]`
    },
    {
        id: 'late',
        label: 'Atraso',
        icon: Clock,
        color: 'text-orange-500',
        text: (name: string) => `Olá ${name}, tivemos um imprevisto no trânsito e vamos atrasar cerca de 10-15 min. Pedimos desculpas!`
    }
];

export const ClientMessageMenu = ({ customer, isDark }: ClientMessageMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSend = (text: string) => {
        if (!customer.phone) return;
        const cleanPhone = customer.phone.replace(/\D/g, '');
        const message = encodeURIComponent(text);
        window.location.href = `sms:${cleanPhone}?&body=${message}`;
        setIsOpen(false);
    };

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative">
            <button
                onClick={toggleMenu}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors w-full ${isDark
                    ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
            >
                <MessageSquare size={12} />
                Mensagem
                <ChevronDown size={10} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-xl z-20 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                        }`}>
                        <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-gray-400'
                            }`}>
                            Mensagens Rápidas
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {templates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSend(template.text(customer.name.split(' ')[0]));
                                    }}
                                    className={`w-full text-left px-4 py-3 text-xs flex items-center gap-3 transition-colors ${isDark
                                        ? 'hover:bg-slate-800 text-slate-200'
                                        : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    <template.icon size={14} className={template.color} />
                                    <span>{template.label}</span>
                                </button>
                            ))}
                        </div>
                        {!customer.phone && (
                            <div className="px-4 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 text-center">
                                Cliente sem telefone cadastrado
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
