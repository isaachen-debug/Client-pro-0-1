import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, ExternalLink } from 'lucide-react';
import { ZelleIcon, VenmoLogo, CashAppIcon, CashIcon } from '../components/finance/PaymentIcons';
import { format } from 'date-fns';

interface InvoiceData {
    invoice: {
        id: string;
        amount: number;
        dueDate: string;
        status: string;
        paidAt: string | null;
        paymentMethod: string | null;
        customerMarkedPaid: boolean;
        customerPaidAt: string | null;
        createdAt: string;
    };
    customer: {
        name: string;
        address: string | null;
        serviceType: string | null;
    } | null;
    appointment: {
        date: string;
        startTime: string;
        endTime: string | null;
        notes: string | null;
    } | null;
    owner: {
        businessName: string;
        businessLogo: string | null;
        paymentMethods: {
            zelle?: { email: string };
            venmo?: { username: string };
            cashApp?: { username: string };
            stripe?: { enabled: boolean };
            cash?: { instructions: string };
        };
    };
    includedServices?: string[];
}

const InvoicePage = () => {
    const { token } = useParams<{ token: string }>();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [markingPaid, setMarkingPaid] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [paymentNotes, setPaymentNotes] = useState('');


    useEffect(() => {
        fetchInvoice();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const fetchInvoice = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:3000/api/invoices/public/${token}`);

            if (!response.ok) {
                throw new Error('Invoice not found');
            }

            const data = await response.json();
            setInvoice(data);
        } catch (err) {
            setError('Invoice not found or invalid link');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const openVenmo = (username: string, amount: number) => {
        const venmoUrl = `venmo://paycharge?txn=pay&recipients=${username.replace('@', '')}&amount=${amount}&note=Invoice Payment`;
        window.location.href = venmoUrl;
        // Fallback to web
        setTimeout(() => {
            window.open(`https://venmo.com/${username}`, '_blank');
        }, 1500);
    };

    const openCashApp = (username: string, amount: number) => {
        const cashAppUrl = `https://cash.app/${username}/${amount}`;
        window.location.href = cashAppUrl;
    };

    const markAsPaid = async () => {
        if (!selectedMethod) {
            alert('Please select a payment method');
            return;
        }

        try {
            setMarkingPaid(true);
            const response = await fetch(`http://localhost:3000/api/invoices/public/${token}/mark-paid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod: selectedMethod,
                    notes: paymentNotes || null,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to mark as paid');
            }


            await fetchInvoice();
        } catch (err) {
            alert('Failed to mark as paid. Please try again.');
        } finally {
            setMarkingPaid(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Invoice Not Found</h1>
                    <p className="text-slate-600">This invoice link is invalid or has expired.</p>
                </div>
            </div>
        );
    }

    const isPaid = invoice.invoice.status === 'PAGO';
    const isPending = invoice.invoice.customerMarkedPaid && !isPaid;
    const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

    return (
        <div className="min-h-screen bg-slate-100 py-4 px-3 sm:py-6 sm:px-6 font-sans">
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">

                {/* INVOICE CARD */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden print:shadow-none">

                    {/* Header Strip */}
                    <div className={`h-1.5 w-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                    <div className="p-5 sm:p-8">
                        {/* Top Header: Logo & Status */}
                        <div className="flex flex-row justify-between items-center gap-3 mb-6 sm:mb-8">
                            {/* Logo Section */}
                            <div className="flex items-center gap-2 sm:gap-3">
                                {invoice.owner.businessLogo ? (
                                    <img
                                        src={invoice.owner.businessLogo}
                                        alt={invoice.owner.businessName}
                                        className="h-10 sm:h-16 w-auto object-contain"
                                    />
                                ) : (
                                    <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-md">
                                        <span className="text-sm sm:text-xl font-black">
                                            {invoice.owner.businessName[0]}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-sm sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                                        {invoice.owner.businessName}
                                    </h1>
                                    <p className="text-slate-500 text-[10px] sm:text-xs font-medium">
                                        #{invoice.invoice.id.slice(0, 8).toUpperCase()}
                                    </p>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border-2 font-bold tracking-wider uppercase text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${isPaid
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                : isPending
                                    ? 'bg-amber-50 border-amber-500 text-amber-700'
                                    : 'bg-slate-50 border-slate-300 text-slate-600'
                                }`}>
                                {isPaid && <Check size={12} strokeWidth={3} className="sm:w-3.5 sm:h-3.5" />}
                                {isPaid ? 'PAID' : isPending ? 'PENDING' : 'DUE'}
                            </div>
                        </div>

                        {/* Addresses Grid */}
                        <div className="grid grid-cols-2 gap-4 sm:gap-8 border-t border-slate-100 pt-6 sm:pt-8 mb-6 sm:mb-8">
                            {/* Bill To */}
                            <div>
                                <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Bill To</h3>
                                {invoice.customer ? (
                                    <div className="space-y-0.5">
                                        <p className="text-sm sm:text-base font-bold text-slate-900">{invoice.customer.name}</p>
                                        <div className="flex items-start gap-2 text-slate-600 text-xs sm:text-sm">
                                            <p className="leading-relaxed line-clamp-2">
                                                {invoice.customer.address || "No address"}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-400 italic text-xs sm:text-sm">Unknown</p>
                                )}
                            </div>

                            {/* Invoice Details */}
                            <div className="text-right space-y-2 sm:space-y-3">
                                <div>
                                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Service Date</h3>
                                    <p className="font-bold text-slate-900 text-xs sm:text-sm">
                                        {invoice.appointment ? format(new Date(invoice.appointment.date), 'MM/dd/yyyy') : '-'}
                                    </p>
                                    {invoice.appointment?.startTime && (
                                        <p className="text-slate-500 text-[10px] sm:text-xs font-medium mt-0.5">
                                            {invoice.appointment.startTime}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Due Date</h3>
                                    <p className={`font-bold text-xs sm:text-sm ${isPaid ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        {format(new Date(invoice.invoice.dueDate), 'MM/dd/yyyy')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Service Table */}
                        <div className="mb-6 sm:mb-8">
                            <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">Service Details</h3>
                            <div className="bg-slate-50 rounded-xl p-4 sm:p-6 border border-slate-100">
                                <div className="flex flex-row items-center justify-between gap-3 mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-slate-200/60">
                                    <div>
                                        <p className="font-bold text-sm sm:text-base text-slate-900">
                                            {invoice.customer?.serviceType || 'Service'}
                                        </p>
                                        {invoice.appointment?.startTime && (
                                            <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                                                {invoice.appointment.startTime}
                                                {invoice.appointment.endTime ? ` - ${invoice.appointment.endTime}` : ''}
                                            </p>
                                        )}
                                        {invoice.appointment?.notes && (
                                            <p className="text-slate-500 text-[10px] sm:text-xs mt-1 sm:mt-2 bg-white px-2 py-1 rounded-md inline-block border border-slate-200">
                                                📝 {invoice.appointment.notes}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg sm:text-xl font-black text-slate-900">
                                            {usdFormatter.format(invoice.invoice.amount)}
                                        </p>
                                    </div>
                                </div>

                                {/* Included Services Checklist */}
                                {invoice.includedServices && invoice.includedServices.length > 0 && (
                                    <div className="mb-4 pb-4 border-b border-slate-200/60">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Included Service Items</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
                                            {invoice.includedServices.map((item, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                                    <div className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                        <Check size={10} className="text-emerald-600" />
                                                    </div>
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Total Row */}
                                <div className="flex justify-end pt-1">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total</p>
                                        <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                            {usdFormatter.format(invoice.invoice.amount)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Section - Only show if not paid */}
                        {!isPaid && !isPending && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
                                    Select Payment Method
                                    <span className="h-px bg-slate-200 flex-1"></span>
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                                    {/* Zelle Card */}
                                    {invoice.owner.paymentMethods.zelle && (
                                        <button
                                            onClick={() => setSelectedMethod('ZELLE')}
                                            className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md text-left group ${selectedMethod === 'ZELLE'
                                                ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                                                : 'border-slate-200 hover:border-purple-300 bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                                <ZelleIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                                                {selectedMethod === 'ZELLE' && (
                                                    <div className="h-4 w-4 sm:h-5 sm:w-5 bg-purple-600 rounded-full flex items-center justify-center text-white">
                                                        <Check size={10} strokeWidth={3} className="sm:w-3 sm:h-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-purple-700 transition-colors">Zelle</p>
                                        </button>
                                    )}

                                    {/* Venmo Card */}
                                    {invoice.owner.paymentMethods.venmo && (
                                        <button
                                            onClick={() => setSelectedMethod('VENMO')}
                                            className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md text-left group ${selectedMethod === 'VENMO'
                                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                : 'border-slate-200 hover:border-blue-300 bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                                <VenmoLogo className="h-6 w-auto sm:h-8" />
                                                {selectedMethod === 'VENMO' && (
                                                    <div className="h-4 w-4 sm:h-5 sm:w-5 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                                        <Check size={10} strokeWidth={3} className="sm:w-3 sm:h-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-blue-600 transition-colors">Venmo</p>
                                        </button>
                                    )}

                                    {/* Cash App Card */}
                                    {invoice.owner.paymentMethods.cashApp && (
                                        <button
                                            onClick={() => setSelectedMethod('CASH_APP')}
                                            className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md text-left group ${selectedMethod === 'CASH_APP'
                                                ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                                                : 'border-slate-200 hover:border-emerald-300 bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                                <CashAppIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                                                {selectedMethod === 'CASH_APP' && (
                                                    <div className="h-4 w-4 sm:h-5 sm:w-5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                                        <Check size={10} strokeWidth={3} className="sm:w-3 sm:h-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-emerald-600 transition-colors">Cash App</p>
                                        </button>
                                    )}

                                    {/* Cash Card */}
                                    {invoice.owner.paymentMethods.cash && (
                                        <button
                                            onClick={() => setSelectedMethod('CASH')}
                                            className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md text-left group ${selectedMethod === 'CASH'
                                                ? 'border-slate-600 bg-slate-100 ring-1 ring-slate-600'
                                                : 'border-slate-200 hover:border-slate-400 bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                                <CashIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                                                {selectedMethod === 'CASH' && (
                                                    <div className="h-4 w-4 sm:h-5 sm:w-5 bg-slate-600 rounded-full flex items-center justify-center text-white">
                                                        <Check size={10} strokeWidth={3} className="sm:w-3 sm:h-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-slate-700 transition-colors">Cash</p>
                                        </button>
                                    )}
                                </div>

                                {/* Selected Method Details */}
                                {selectedMethod && (
                                    <div className="bg-slate-50 rounded-xl p-4 sm:p-6 border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
                                            <div className="flex-1 space-y-2 sm:space-y-3 w-full">
                                                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs sm:text-sm">
                                                    <span className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 mr-2">
                                                        {selectedMethod === 'ZELLE' && <ZelleIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                                                        {selectedMethod === 'VENMO' && <VenmoLogo className="h-5 w-auto sm:h-6" />}
                                                        {selectedMethod === 'CASH_APP' && <CashAppIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                                                        {selectedMethod === 'CASH' && <CashIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                                                    </span>
                                                    Payment Instructions
                                                </h4>

                                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                    <p className="text-[10px] sm:text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">
                                                        Send to:
                                                    </p>

                                                    {selectedMethod === 'ZELLE' && (
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-sm sm:text-base font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded break-all">
                                                                {invoice.owner.paymentMethods.zelle!.email}
                                                            </code>
                                                            <button
                                                                onClick={() => copyToClipboard(invoice.owner.paymentMethods.zelle!.email, 'zelle')}
                                                                className="text-purple-600 hover:text-purple-700 font-bold text-xs sm:text-sm whitespace-nowrap"
                                                            >
                                                                {copiedField === 'zelle' ? 'Copied!' : 'Copy'}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {selectedMethod === 'VENMO' && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <code className="text-sm sm:text-base font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded break-all">
                                                                    {invoice.owner.paymentMethods.venmo!.username}
                                                                </code>
                                                            </div>
                                                            <button
                                                                onClick={() => openVenmo(invoice.owner.paymentMethods.venmo!.username, invoice.invoice.amount)}
                                                                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                                            >
                                                                <ExternalLink size={14} /> Open Venmo App
                                                            </button>
                                                        </div>
                                                    )}

                                                    {selectedMethod === 'CASH_APP' && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <code className="text-sm sm:text-base font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded break-all">
                                                                    {invoice.owner.paymentMethods.cashApp!.username}
                                                                </code>
                                                            </div>
                                                            <button
                                                                onClick={() => openCashApp(invoice.owner.paymentMethods.cashApp!.username, invoice.invoice.amount)}
                                                                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                                            >
                                                                <ExternalLink size={14} /> Open Cash App
                                                            </button>
                                                        </div>
                                                    )}

                                                    {selectedMethod === 'CASH' && (
                                                        <p className="text-slate-900 font-medium text-xs sm:text-sm">
                                                            {invoice.owner.paymentMethods.cash!.instructions}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Confirmation Form */}
                                            <div className="flex-1 w-full border-l-0 md:border-l border-slate-200 md:pl-6 pt-4 md:pt-0 border-t md:border-t-0">
                                                <h4 className="font-bold text-slate-900 mb-2 text-xs sm:text-sm">Confirm Payment</h4>
                                                <p className="text-[10px] sm:text-xs text-slate-600 mb-3">
                                                    After sending payment via {selectedMethod.replace('_', ' ')}, please confirm below.
                                                </p>

                                                <textarea
                                                    value={paymentNotes}
                                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                                    placeholder="Optional notes"
                                                    className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-emerald-500 outline-none mb-3 bg-white text-xs sm:text-sm"
                                                    rows={2}
                                                />

                                                <button
                                                    onClick={markAsPaid}
                                                    disabled={markingPaid}
                                                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base shadow-lg disabled:opacity-50 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                                                >
                                                    {markingPaid ? 'Sending...' : '✓ I Have Paid'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Success Message for Pending/Paid */}
                        {(isPaid || isPending) && (
                            <div className="mt-6 text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-3xl mb-3">🎉</p>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">
                                    {isPaid ? 'Payment Confirmed!' : 'Confirmation Sent!'}
                                </h3>
                                <p className="text-slate-600 text-sm max-w-sm mx-auto">
                                    {isPaid
                                        ? 'Thank you for your payment. This invoice is fully paid.'
                                        : 'The business owner has been notified and will verify the payment shortly.'}
                                </p>
                            </div>
                        )}

                    </div>

                    {/* Footer Strip */}
                    <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 font-medium">
                            Powered by <strong className="text-slate-600">ClientePro</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePage;
