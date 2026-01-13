import { useEffect, useMemo, useState } from 'react';
import { Customer } from '../../types';
import { teamApi } from '../../services/team';

export type CreateFormState = {
  customerId: string;
  month: string;
  day: string;
  startTime: string;
  endTime: string;
  price: string;
  helperFee: string;
  isRecurring: boolean;
  recurrenceRule: string;
  notes: string;
  assignedHelperId: string;
};

type CreateModalProps = {
  title: string;
  customers: Customer[];
  helpers?: { id: string; name: string }[];
  formData: CreateFormState;
  setFormData: React.Dispatch<React.SetStateAction<CreateFormState>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  currentYear: number;
  dateError: string;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const CreateModal = ({
  title,
  customers,
  helpers = [],
  formData,
  setFormData,
  saving,
  onClose,
  onSubmit,
  currentYear,
  dateError,
}: CreateModalProps) => {
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [feeExplanation, setFeeExplanation] = useState('');
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [manuallyEditedFee, setManuallyEditedFee] = useState(false);
  const [isTeamModeEnabled, setIsTeamModeEnabled] = useState(false);

  // Sync team mode with assigned helper
  useEffect(() => {
    if (formData.assignedHelperId) {
      setIsTeamModeEnabled(true);
    }
  }, [formData.assignedHelperId]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [customerQuery, customers]);

  // Auto-calculate helper fee when helper or price changes
  useEffect(() => {
    const calculateFee = async () => {
      if (!formData.assignedHelperId || !formData.price || manuallyEditedFee) {
        return;
      }

      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        return;
      }

      setIsCalculatingFee(true);
      try {
        const result = await teamApi.calculateHelperFee(formData.assignedHelperId, price);
        setFormData((prev) => ({
          ...prev,
          helperFee: result.helperFee.toString(),
        }));
        setFeeExplanation(result.explanation);
      } catch (error) {
        console.error('Error calculating helper fee:', error);
      } finally {
        setIsCalculatingFee(false);
      }
    };

    calculateFee();
  }, [formData.assignedHelperId, formData.price, manuallyEditedFee]);

  // Reset manual edit flag when helper changes
  useEffect(() => {
    setManuallyEditedFee(false);
    setFeeExplanation('');
  }, [formData.assignedHelperId]);

  // Clear helper when team mode is disabled
  useEffect(() => {
    if (!isTeamModeEnabled && formData.assignedHelperId) {
      setFormData(prev => ({ ...prev, assignedHelperId: '' }));
    }
  }, [isTeamModeEnabled]);

  const toggleTeamMode = () => {
    setIsTeamModeEnabled(!isTeamModeEnabled);
  };

  const estimatedProfit = useMemo(() => {
    const price = parseFloat(formData.price) || 0;
    const fee = parseFloat(formData.helperFee) || 0;
    return Math.max(0, price - fee).toFixed(2);
  }, [formData.price, formData.helperFee]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:justify-end sm:items-stretch p-0 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-slate-900 w-full sm:w-[500px] sm:max-w-none h-[90vh] sm:h-full rounded-t-[32px] sm:rounded-none sm:rounded-l-[32px] shadow-2xl overflow-hidden flex flex-col animate-slide-up-bottom sm:animate-slide-in-right">

        {/* Drag Handle for mobile */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>

            <form className="space-y-6" onSubmit={onSubmit}>

              {/* Section 1: Client */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Seleção de Cliente</label>
                <div className="relative group">
                  <input
                    required
                    value={customerQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomerQuery(value);
                      setCustomerMenuOpen(true);
                      const match = customers.find((c) => c.name.toLowerCase() === value.toLowerCase());
                      if (match) {
                        setFormData((prev) => ({
                          ...prev,
                          customerId: match.id,
                          price: prev.price || (match.defaultPrice?.toString() ?? ''),
                        }));
                      } else {
                        setFormData((prev) => ({ ...prev, customerId: '' }));
                      }
                    }}
                    onFocus={() => setCustomerMenuOpen(true)}
                    onBlur={() => setTimeout(() => setCustomerMenuOpen(false), 200)}
                    placeholder="Buscar ou selecionar cliente"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary-500/20 text-gray-900 dark:text-white transition-all shadow-sm group-hover:bg-gray-100 dark:group-hover:bg-slate-750"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>

                  {customerMenuOpen && filteredCustomers.length > 0 && (
                    <div className="absolute z-20 mt-2 w-full rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setCustomerQuery(customer.name);
                            setCustomerMenuOpen(false);
                            setFormData((prev) => ({
                              ...prev,
                              customerId: customer.id,
                              price: prev.price || (customer.defaultPrice?.toString() ?? ''),
                            }));
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                        >
                          {customer.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={formData.month && formData.day ? `${currentYear}-${formData.month}-${formData.day}` : ''}
                      onChange={(e) => {
                        const [, month, day] = e.target.value.split('-');
                        setFormData((prev) => ({ ...prev, month: month ?? prev.month, day: day ?? prev.day }));
                      }}
                      className="w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary-500/20 text-gray-900 dark:text-white shadow-sm"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">📅</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Horário</label>
                  <div className="relative">
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary-500/20 text-gray-900 dark:text-white shadow-sm"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">⏰</span>
                  </div>
                </div>
              </div>
              {dateError && <p className="text-xs text-red-500 font-medium px-1">{dateError}</p>}

              {/* Section 3: Price */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor Total</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary-500 text-lg font-bold text-gray-900 dark:text-white shadow-sm transition-all"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 dark:bg-slate-800 w-full" />

              {/* Section 4: Team Scale (Highlighted) */}
              <div className={`transition-all duration-300 rounded-3xl border ${isTeamModeEnabled ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' : 'bg-gray-50 dark:bg-slate-800/50 border-transparent'} p-5 space-y-5 overflow-hidden`}>

                {/* Toggle Header */}
                <div className="flex items-center justify-between cursor-pointer" onClick={toggleTeamMode}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span className={`font-semibold ${isTeamModeEnabled ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-600 dark:text-slate-400'}`}>Escala da Equipe</span>
                  </div>
                  <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${isTeamModeEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isTeamModeEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Team Content */}
                <div className={`transition-all duration-300 ${isTeamModeEnabled ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} space-y-5`}>

                  {/* Avatar Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider">Quem vai realizar?</label>
                    <div className="flex flex-wrap gap-2">
                      {helpers.map((helper) => {
                        const isSelected = formData.assignedHelperId === helper.id;
                        return (
                          <button
                            key={helper.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, assignedHelperId: helper.id }))}
                            className={`group relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900 bg-white dark:bg-slate-800' : 'border-transparent bg-white dark:bg-slate-700 hover:scale-105'}`}
                            title={helper.name}
                          >
                            <span className={`text-xs font-bold ${isSelected ? 'text-emerald-600' : 'text-gray-500 dark:text-slate-300'}`}>
                              {getInitials(helper.name)}
                            </span>
                            {isSelected && (
                              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full border border-white dark:border-slate-900">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Helper Fee Display */}
                  <div className="flex items-end justify-between bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Pagamento da Helper</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                          {isCalculatingFee ? (
                            <span className="animate-pulse text-gray-400">...</span>
                          ) : (
                            `$${formData.helperFee || '0.00'}`
                          )}
                        </span>
                        {feeExplanation && (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full">
                            {feeExplanation}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Discreet Edit Button / Input */}
                    <div className="relative">
                      {manuallyEditedFee ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="number"
                            className="w-20 px-2 py-1 text-right text-sm border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={formData.helperFee}
                            onChange={(e) => setFormData(prev => ({ ...prev, helperFee: e.target.value }))}
                            onBlur={() => { if (!formData.helperFee) setManuallyEditedFee(false) }}
                          />
                          <button
                            type="button"
                            onClick={() => setManuallyEditedFee(false)}
                            title="Restaurar automático"
                            className="text-gray-400 hover:text-emerald-600"
                          >
                            ↺
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setManuallyEditedFee(true)}
                          className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-gray-400 hover:text-emerald-600 transition-colors flex items-center justify-center"
                          title="Editar valor manualmente"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom Info */}
              <div className="flex items-center justify-between px-2 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isRecurring: e.target.checked, recurrenceRule: e.target.checked ? prev.recurrenceRule : '' }))}
                    className="rounded text-primary-600 focus:ring-primary-500 transition-all"
                  />
                  <span className="text-sm text-gray-600 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-slate-200 transition-colors">Agendamento recorrente</span>
                </label>

                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Lucro Estimado</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${estimatedProfit}</p>
                </div>
              </div>

              {formData.isRecurring && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <select
                    value={formData.recurrenceRule}
                    onChange={(e) => setFormData((prev) => ({ ...prev, recurrenceRule: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">Selecione a frequência</option>
                    <option value="FREQ=WEEKLY">Semanal</option>
                    <option value="FREQ=WEEKLY;INTERVAL=2">Quinzenal</option>
                    <option value="FREQ=WEEKLY;INTERVAL=3">A cada 3 semanas</option>
                    <option value="FREQ=MONTHLY">Mensal</option>
                  </select>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Adicione observações sobre o serviço..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 text-gray-900 dark:text-white"
                />
              </div>

              {/* Footer Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3.5 rounded-2xl text-sm font-semibold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3.5 rounded-2xl text-sm font-semibold text-white bg-slate-900 dark:bg-primary-600 hover:bg-slate-800 dark:hover:bg-primary-500 shadow-lg shadow-slate-900/20 dark:shadow-primary-600/20 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? 'Criando...' : 'Salvar Agendamento'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;
