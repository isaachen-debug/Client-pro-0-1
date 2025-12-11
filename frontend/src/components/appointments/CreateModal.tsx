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

const monthOptions = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="bg-white rounded-xl shadow-xl z-50 w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-100">
        <div className="p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente *</label>
              <select
                required
                value={formData.customerId}
                onChange={(e) => {
                  const id = e.target.value;
                  const selected = customers.find((c) => c.id === id);
                  setFormData((prev) => ({
                    ...prev,
                    customerId: id,
                    price:
                      prev.price && prev.price.trim() !== ''
                        ? prev.price
                        : selected?.defaultPrice !== undefined && selected.defaultPrice !== null
                        ? selected.defaultPrice.toString()
                        : '',
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Selecione um cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mês *</label>
                <select
                  required
                  value={formData.month}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      month: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Dia *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  inputMode="numeric"
                  placeholder="Digite o dia"
                  required
                  value={formData.day}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      day: e.target.value.replace(/\D/g, '').padStart(2, '0').slice(0, 2),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500">Ano sincronizado com {currentYear}.</p>
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Término</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
                <p className="text-[11px] text-gray-500 mt-1">Se vazio, usa o preço padrão do cliente (se houver).</p>
              </div>
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

