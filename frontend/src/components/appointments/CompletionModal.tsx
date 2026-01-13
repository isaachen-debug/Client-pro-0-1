import React, { useState } from 'react';
import { 
  CheckCircle2, 
  DollarSign, 
  FileText, 
  MessageCircle, 
  Mail, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  Loader2
} from 'lucide-react';
import { Appointment } from '../../types';
import { usePreferences } from '../../contexts/PreferencesContext';

interface CompletionModalProps {
  appointment: Appointment;
  onClose: () => void;
  onConfirm: (data: { 
    finalPrice: number; 
    paymentStatus: 'PENDENTE' | 'PAGO'; 
    sendInvoice: boolean;
    shareVia: 'none' | 'sms' | 'email';
  }) => Promise<void>;
  saving: boolean;
}

const CompletionModal: React.FC<CompletionModalProps> = ({ 
  appointment, 
  onClose, 
  onConfirm,
  saving 
}) => {
  const { theme } = usePreferences();
  const isDark = theme === 'dark';
  
  const [finalPrice, setFinalPrice] = useState(appointment.price.toString());
  const [paymentStatus, setPaymentStatus] = useState<'PENDENTE' | 'PAGO'>('PAGO');
  const [sendInvoice, setSendInvoice] = useState(false);
  const [shareVia, setShareVia] = useState<'none' | 'sms' | 'email'>('none');
  const [showInvoiceOptions, setShowInvoiceOptions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      finalPrice: Number(finalPrice),
      paymentStatus: 'PENDENTE',
      sendInvoice,
      shareVia
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative rounded-t-[32px] p-6 animate-sheet-up space-y-6 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Concluir Serviço</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{appointment.customer.name}</p>
          </div>
          <CheckCircle2 className="text-emerald-500" size={32} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Valor Final */}
          <div className="space-y-2">
            <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Valor Final</label>
            <div className="relative">
              <DollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
              <input 
                type="number"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-2xl border font-bold text-lg ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
              />
            </div>
          </div>

          {/* Opções de Fatura */}
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <button
              type="button"
              onClick={() => setShowInvoiceOptions(!showInvoiceOptions)}
              className={`w-full flex items-center justify-between p-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}
            >
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Fatura e Compartilhamento</span>
              </div>
              {showInvoiceOptions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            
            {showInvoiceOptions && (
              <div className={`p-4 space-y-4 border-t ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="gen-invoice"
                      checked={sendInvoice}
                      onChange={(e) => setSendInvoice(e.target.checked)}
                      className="w-5 h-5 rounded-md accent-emerald-500"
                    />
                    <label htmlFor="gen-invoice" className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Gerar Fatura (Invoice)</label>
                  </div>
                </div>

                {sendInvoice && (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setShareVia(shareVia === 'sms' ? 'none' : 'sms')}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-bold transition-all ${shareVia === 'sms' 
                        ? 'bg-indigo-500 border-indigo-500 text-white' 
                        : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}
                    >
                      <MessageCircle size={16} />
                      SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareVia(shareVia === 'email' ? 'none' : 'email')}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-bold transition-all ${shareVia === 'email' 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}
                    >
                      <Mail size={16} />
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => {}} // Feature for Review
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-300'} opacity-50 cursor-not-allowed`}
                    >
                      <Star size={16} />
                      Review
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-4 rounded-2xl font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <CheckCircle2 size={20} />
                  Confirmar Conclusão
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompletionModal;
