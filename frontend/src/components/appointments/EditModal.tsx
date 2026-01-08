import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Appointment, AppointmentStatus } from '../../types';
import { X, Calendar, Clock, DollarSign, User, FileText, Trash2 } from 'lucide-react';

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

const statusOptions: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: 'AGENDADO', label: 'A confirmar', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800' },
  { value: 'EM_ANDAMENTO', label: 'Agendado', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800' },
  { value: 'CONCLUIDO', label: 'Concluído', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800' },
];

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
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30 dark:bg-black/60 transition-all">
    <div
      className="fixed inset-0"
      onClick={onClose}
    />
    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl z-50 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editar Agendamento</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {appointment.customer.name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <form id="edit-form" className="space-y-6" onSubmit={onSubmit}>
          {/* Status Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      status: option.value,
                    }))
                  }
                  className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                    formData.status === option.value
                      ? `${option.color} ring-2 ring-offset-1 ring-slate-200 dark:ring-slate-700 dark:ring-offset-slate-900`
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Calendar size={14} className="text-slate-400" />
                Data
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Clock size={14} className="text-slate-400" />
                Início
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
          </div>

          {/* Financials */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <DollarSign size={14} className="text-emerald-500" />
                  Cobrado (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <User size={14} className="text-indigo-500" />
                  Helper (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.helperFee}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      helperFee: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            {helpers.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Helper atribuído</label>
                <select
                  value={formData.assignedHelperId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      assignedHelperId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-500 appearance-none"
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
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <FileText size={14} className="text-slate-400" />
              Observações
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 resize-none transition-all placeholder:text-slate-400"
              placeholder="Adicione notas sobre o serviço..."
            />
          </div>

          {/* Recurrence */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isRecurring: e.target.checked,
                      recurrenceRule: e.target.checked ? prev.recurrenceRule || 'FREQ=WEEKLY' : '',
                    }))
                  }
                  className="peer sr-only"
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Repetir agendamento</span>
            </label>
            
            {formData.isRecurring && (
              <select
                value={formData.recurrenceRule}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    recurrenceRule: e.target.value,
                  }))
                }
                className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-none rounded-lg py-1 pl-2 pr-6 text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer"
              >
                <option value="FREQ=WEEKLY">Semanal</option>
                <option value="FREQ=WEEKLY;INTERVAL=2">Quinzenal</option>
                <option value="FREQ=MONTHLY">Mensal</option>
              </select>
            )}
          </div>

          <div className="pt-2">
             <ConfirmCancelButton
                onCancel={() => onQuickStatus('CANCELADO')}
                canDeleteSeries={canDeleteSeries}
                onDeleteSeries={onDeleteSeries}
              />
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
        <Link 
          to={`/invoice/${appointment.id}`} 
          className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Fatura
        </Link>
        <button
          type="submit"
          form="edit-form"
          disabled={saving}
          className="flex-1 px-4 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all shadow-lg shadow-slate-200 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  </div>
);

export default EditModal;

const ConfirmCancelButton = ({
  onCancel,
  canDeleteSeries,
  onDeleteSeries,
}: {
  onCancel: () => void;
  canDeleteSeries?: boolean;
  onDeleteSeries?: () => void;
}) => {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Trash2 size={14} />
        Cancelar agendamento
      </button>
    );
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 space-y-3 animate-fade-in border border-red-100 dark:border-red-900/30">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white dark:bg-red-900/40 rounded-full text-red-500 dark:text-red-400 shadow-sm">
          <Trash2 size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-red-900 dark:text-red-200">Cancelar agendamento?</p>
          <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">Esta ação não pode ser desfeita.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            onCancel();
            setOpen(false);
          }}
          className="w-full bg-red-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-red-700 transition shadow-sm"
        >
          Confirmar cancelamento
        </button>
        {canDeleteSeries && onDeleteSeries && (
          <button
            type="button"
            onClick={() => {
              onDeleteSeries();
              setOpen(false);
            }}
            className="w-full bg-white dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl py-2 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/50 transition"
          >
            Cancelar toda a série
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1 text-xs font-semibold"
        >
          Não, voltar
        </button>
      </div>
    </div>
  );
};
