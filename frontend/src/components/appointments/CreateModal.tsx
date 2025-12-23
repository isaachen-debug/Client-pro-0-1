import { useState } from 'react';
import { Customer } from '../../types';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.18)] z-50 w-full max-w-md max-h-[92vh] overflow-y-auto border border-slate-100">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente *</label>
              <input
                required
                value={customerQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomerQuery(value);
                  const match = customers.find((c) => c.name.toLowerCase() === value.toLowerCase());
                  if (match) {
                    setFormData((prev) => ({
                      ...prev,
                      customerId: match.id,
                      price:
                        prev.price && prev.price.trim() !== ''
                          ? prev.price
                          : match.defaultPrice !== undefined && match.defaultPrice !== null
                          ? match.defaultPrice.toString()
                          : '',
                    }));
                  }
                }}
                list="clientepro-clientes"
                placeholder="Digite o nome do cliente"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm bg-white"
              />
              <datalist id="clientepro-clientes">
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.name} />
                ))}
              </datalist>
            </div>

            {helpers.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Atribuir helper</label>
                <select
                  value={formData.assignedHelperId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      assignedHelperId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm bg-white"
                >
                  <option value="">Sem atribuição</option>
                  {helpers.map((helper) => (
                    <option key={helper.id} value={helper.id}>
                      {helper.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Helpers enxergam apenas os serviços atribuídos no app dedicado.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data *</label>
              <input
                type="date"
                required
                value={
                  formData.month && formData.day
                    ? `${currentYear}-${formData.month}-${formData.day}`
                    : ''
                }
                onChange={(e) => {
                  const [, month, day] = e.target.value.split('-');
                  setFormData((prev) => ({
                    ...prev,
                    month: month ?? prev.month,
                    day: day ?? prev.day,
                  }));
                }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm bg-white"
              />
            </div>
            {dateError && <p className="text-[11px] text-red-600">{dateError}</p>}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Início *</label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Valor cobrado (USD)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 150"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm bg-white"
              />
              <p className="text-[11px] text-gray-500 mt-1">Se vazio, usa o preço padrão do cliente (se houver).</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pagamento da helper (USD)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 80"
                value={formData.helperFee}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    helperFee: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm bg-white"
              />
              <p className="text-[11px] text-gray-500 mt-1">Valor combinado para repassar à helper.</p>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isRecurring: e.target.checked,
                      recurrenceRule: e.target.checked ? prev.recurrenceRule : '',
                    }))
                  }
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs font-semibold text-gray-700">Agendamento recorrente</span>
              </label>
            </div>
            {formData.isRecurring && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Periodicidade</label>
                <select
                  value={formData.recurrenceRule}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recurrenceRule: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm bg-white"
                >
                  <option value="">Selecione</option>
                  <option value="FREQ=WEEKLY">Semanal</option>
                  <option value="FREQ=WEEKLY;INTERVAL=2">Quinzenal</option>
                  <option value="FREQ=WEEKLY;INTERVAL=3">A cada 3 semanas</option>
                  <option value="FREQ=MONTHLY">Mensal</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm bg-white"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-full text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;
