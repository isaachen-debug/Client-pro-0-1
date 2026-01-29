import React, { useState } from 'react';
import { X, MapPin, User, Copy, Check, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction } from '../../types';
import { invoicesApi } from '../../services/api';

interface InvoiceDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    isDark: boolean;
}

export const InvoiceDrawer: React.FC<InvoiceDrawerProps> = ({ isOpen, onClose, transaction, isDark }) => {
    const [copied, setCopied] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [localInvoiceToken, setLocalInvoiceToken] = useState<string | null>(null);

    // Reset local token when transaction changes
    React.useEffect(() => {
        setLocalInvoiceToken(null);
    }, [transaction?.id]);

    const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

    if (!transaction) return null;

    const appointment = transaction.appointment;
    const customer = appointment?.customer;

    // Use local token if generated, otherwise fallback to transaction token
    const effectiveToken = localInvoiceToken || transaction.invoiceToken;

    // Generate invoice link using token
    const invoiceLink = effectiveToken
        ? `${window.location.origin}/invoice/${effectiveToken}`
        : '';

    const handleCopyLink = () => {
        if (!invoiceLink) return;
        navigator.clipboard.writeText(invoiceLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGenerateLink = async () => {
        if (!transaction.appointmentId) {
            alert('Não é possível gerar invoice para esta transação (sem agendamento vinculado).');
            return;
        }

        try {
            setGenerating(true);
            const response = await invoicesApi.generate(transaction.appointmentId);
            setLocalInvoiceToken(response.invoiceToken);
        } catch (error) {
            console.error('Error generating invoice:', error);
            alert('Erro ao gerar link de invoice.');
        } finally {
            setGenerating(false);
        }
    };



    const handleSendSMS = () => {
        // TODO: Implement SMS sending
        alert('SMS feature coming soon!');
    };

    const handleConfirmPayment = async (confirmed: boolean) => {
        try {
            setConfirming(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3000/api/invoices/${transaction.id}/confirm-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ confirmed }),
            });

            if (response.ok) {
                alert(confirmed ? 'Payment confirmed!' : 'Payment denied.');
                onClose();
                window.location.reload(); // Refresh to show updated status
            } else {
                alert('Failed to confirm payment');
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            alert('Failed to confirm payment');
        } finally {
            setConfirming(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className={`fixed top-0 right-0 h-full w-full max-w-md shadow-2xl z-50 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-white'
                            }`}
                    >
                        {/* Header */}
                        <div className={`sticky top-0 z-10 p-4 border-b flex items-center justify-between ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                            }`}>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Detalhes da Cobrança
                            </h2>
                            <button
                                onClick={onClose}
                                className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">\

                            {/* Amount Card */}
                            <div className={`p-6 rounded-3xl border-2 text-center ${isDark ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-emerald-50 border-emerald-200'
                                }`}>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'
                                    }`}>
                                    Valor a Receber
                                </p>
                                <p className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {usdFormatter.format(transaction.amount)}
                                </p>
                                <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                    Vencimento: {format(new Date(transaction.dueDate), "dd/MM/yyyy")}
                                </p>
                            </div>

                            {/* Big Copy Link Button (or Generate Button) */}
                            {invoiceLink ? (
                                <button
                                    onClick={handleCopyLink}
                                    className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg ${copied
                                        ? 'bg-emerald-500 text-white'
                                        : isDark
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    {copied ? (
                                        <>
                                            <Check size={20} />
                                            Link Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={20} />
                                            Copiar Link de Pagamento
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={handleGenerateLink}
                                    disabled={generating}
                                    className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg ${isDark
                                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                        }`}
                                >
                                    {generating ? (
                                        'Gerando Link...'
                                    ) : (
                                        <>
                                            <Copy size={20} />
                                            Gerar Link de Pagamento
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Client Info */}
                            <div className="space-y-4">
                                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                    Informações do Cliente
                                </h3>

                                <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                            <User size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {customer?.name || 'Cliente'}
                                            </p>
                                            {customer?.email && (
                                                <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {customer.email}
                                                </p>
                                            )}
                                            {customer?.phone && (
                                                <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {customer.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {customer?.address && (
                                        <div className="flex items-start gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <MapPin size={18} className={isDark ? 'text-slate-500 mt-0.5' : 'text-slate-400 mt-0.5'} />
                                            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {customer.address}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Service Info */}
                            <div className="space-y-4">
                                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                    Detalhes do Serviço
                                </h3>

                                <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                    {customer?.serviceType && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Tipo de Limpeza
                                            </span>
                                            <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {customer.serviceType}
                                            </span>
                                        </div>
                                    )}

                                    {appointment?.date && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Data do Serviço
                                            </span>
                                            <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })}
                                            </span>
                                        </div>
                                    )}

                                    {appointment?.startTime && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Horário
                                            </span>
                                            <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {appointment.startTime}
                                                {appointment.endTime && ` - ${appointment.endTime}`}
                                            </span>
                                        </div>
                                    )}

                                    {appointment?.notes && (
                                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <p className={`text-xs font-bold uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                                Observações
                                            </p>
                                            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {appointment.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Invoice Link */}
                            {invoiceLink && (
                                <div className="space-y-4">
                                    <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Link de Pagamento
                                    </h3>

                                    <div className={`p-4 rounded-2xl border-2 ${isDark ? 'bg-slate-800/50 border-emerald-900/30' : 'bg-emerald-50 border-emerald-200'}`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <input
                                                type="text"
                                                value={invoiceLink}
                                                readOnly
                                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono ${isDark ? 'bg-slate-900 text-slate-300 border border-slate-700' : 'bg-white text-slate-700 border border-slate-200'
                                                    }`}
                                            />
                                            <button
                                                onClick={handleCopyLink}
                                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${copied
                                                    ? 'bg-emerald-600 text-white'
                                                    : isDark
                                                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                    }`}
                                            >
                                                {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy</>}
                                            </button>
                                        </div>

                                        <button
                                            onClick={handleSendSMS}
                                            className={`w-full py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                                        >
                                            <MessageSquare size={16} />
                                            Send via SMS
                                        </button>
                                    </div>

                                    <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Share this link with customer to receive payment
                                    </p>
                                </div>
                            )}

                            {/* Payment Confirmation */}
                            {transaction.customerMarkedPaid && transaction.status !== 'PAGO' && (
                                <div className={`p-4 rounded-2xl border-2 ${isDark ? 'bg-amber-900/20 border-amber-600' : 'bg-amber-50 border-amber-300'}`}>
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                                            <AlertCircle className="text-white" size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-amber-900">Customer Reported Payment</p>
                                            <p className="text-sm text-amber-700 mt-1">
                                                Payment via {transaction.paymentMethod?.replace('_', ' ')}
                                            </p>
                                            {transaction.confirmationNotes && (
                                                <p className="text-xs text-amber-600 mt-2 italic">
                                                    Note: {transaction.confirmationNotes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleConfirmPayment(true)}
                                            disabled={confirming}
                                            className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold disabled:opacity-50"
                                        >
                                            ✓ Confirm Payment
                                        </button>
                                        <button
                                            onClick={() => handleConfirmPayment(false)}
                                            disabled={confirming}
                                            className={`flex-1 py-3 rounded-xl font-bold disabled:opacity-50 ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        >
                                            ✗ Not Received
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
