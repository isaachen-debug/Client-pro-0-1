import { Link } from 'react-router-dom';
import { Appointment, AppointmentStatus } from '../../types';

type EditModalProps = {
  appointment: Appointment;
  formData: {
    date: string;
    startTime: string;
    endTime: string;
    price: string;
    helperFee: string;
    notes: string;
    status: AppointmentStatus;
    assignedHelperId: string;
    isRecurring: boolean;
    recurrenceRule: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      date: string;
      startTime: string;
      endTime: string;
      price: string;
        helperFee: string;
      notes: string;
      status: AppointmentStatus;
      assignedHelperId: string;
      isRecurring: boolean;
      recurrenceRule: string;
    }>
  >;
  helpers?: { id: string; name: string }[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onQuickStatus: (status: AppointmentStatus) => void;
  canDeleteSeries?: boolean;
  onDeleteSeries?: () => void;
};

const EditModal = ({
  appointment,
  formData,
  setFormData,
  helpers = [],
  saving,
  onClose,
  onSubmit,
  onQuickStatus,
  canDeleteSeries,
  onDeleteSeries,
}: EditModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
    <div className="bg-white rounded-xl shadow-xl z-50 w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Editar Agendamento</h2>
            <p className="text-sm text-gray-500">
              {appointment.customer.name} — {appointment.customer.serviceType || 'Serviço'}
            </p>
          </div>
          <Link to={`/invoice/${appointment.id}`} className="text-sm font-semibold text-primary-600 hover:underline whitespace-nowrap">
            Ver fatura
          </Link>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Término</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endTime: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor cobrado (USD)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 150,00"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pagamento da helper (USD)</label>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Quanto você repassa para a helper neste serviço.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  status: e.target.value as AppointmentStatus,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="AGENDADO">Agendado</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {helpers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Helper atribuído</label>
              <select
                value={formData.assignedHelperId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    assignedHelperId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Sem helper</option>
                {helpers.map((helper) => (
                  <option key={helper.id} value={helper.id}>
                    {helper.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
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
              <span className="text-sm font-medium text-gray-700">Agendamento recorrente</span>
            </label>
          </div>
          {formData.isRecurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periodicidade</label>
              <select
                value={formData.recurrenceRule}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    recurrenceRule: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione</option>
                <option value="FREQ=WEEKLY">Semanal</option>
                <option value="FREQ=WEEKLY;INTERVAL=2">Quinzenal</option>
                <option value="FREQ=WEEKLY;INTERVAL=3">A cada 3 semanas</option>
                <option value="FREQ=MONTHLY">Mensal</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-gray-500">Ações rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onQuickStatus('EM_ANDAMENTO')}
                className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
              >
                Iniciar
              </button>
              <button
                type="button"
                onClick={() => onQuickStatus('CONCLUIDO')}
                className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
              >
                Concluir
              </button>
              <button
                type="button"
                onClick={() => onQuickStatus('CANCELADO')}
                className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors col-span-2"
              >
                Cancelar agendamento
              </button>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
          {canDeleteSeries && onDeleteSeries && (
            <button
              type="button"
              onClick={onDeleteSeries}
              className="w-full px-4 py-2 mt-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Apagar série inteira
            </button>
          )}
        </form>
      </div>
    </div>
  </div>
);

export default EditModal;

