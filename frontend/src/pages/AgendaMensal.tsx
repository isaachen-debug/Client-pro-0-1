import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { appointmentsApi, customersApi } from '../services/api';
import { Appointment, AppointmentStatus, Customer } from '../types';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const pad = (value: number) => value.toString().padStart(2, '0');

const AgendaMensal = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    month: pad(new Date().getMonth() + 1),
    day: pad(new Date().getDate()),
    startTime: '',
    endTime: '',
    price: '',
    isRecurring: false,
    recurrenceRule: '',
    notes: '',
  });
  const [dateError, setDateError] = useState('');
  const [editForm, setEditForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    price: '',
    notes: '',
    status: 'AGENDADO' as AppointmentStatus,
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const [appointmentsRes, customersRes] = await Promise.all([
        appointmentsApi.listByMonth(month, year),
        customersApi.list(),
      ]);
      setAppointments(appointmentsRes);
      setCustomers(customersRes);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (baseDate: Date = currentDate) => {
    setFormData({
      customerId: '',
      month: pad(baseDate.getMonth() + 1),
      day: pad(baseDate.getDate()),
      startTime: '',
      endTime: '',
      price: '',
      isRecurring: false,
      recurrenceRule: '',
      notes: '',
    });
    setDateError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const year = currentDate.getFullYear();
      const monthNumber = Number(formData.month);
      const dayNumber = Number(formData.day);
      const daysInMonth = new Date(year, monthNumber, 0).getDate();

      if (
        Number.isNaN(monthNumber) ||
        Number.isNaN(dayNumber) ||
        monthNumber < 1 ||
        monthNumber > 12 ||
        dayNumber < 1 ||
        dayNumber > daysInMonth
      ) {
        setDateError('Selecione um dia válido para o mês escolhido.');
        setSaving(false);
        return;
      }
      setDateError('');

      const composedDate = new Date(year, monthNumber - 1, dayNumber).toISOString().split('T')[0];

      await appointmentsApi.create({
        customerId: formData.customerId,
        date: composedDate,
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        price: parseFloat(formData.price),
        isRecurring: formData.isRecurring,
        recurrenceRule: formData.isRecurring ? formData.recurrenceRule : undefined,
        notes: formData.notes,
      });
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: string, status: AppointmentStatus, promptInvoice: boolean) => {
    let sendInvoice = false;
    if (promptInvoice) {
      sendInvoice = window.confirm('Deseja enviar a cobrança por e-mail/copiar o link da fatura agora?');
    }
    const updated = await appointmentsApi.changeStatus(
      appointmentId,
      status,
      sendInvoice ? { sendInvoice: true } : undefined,
    );
    if (sendInvoice && updated.invoiceUrl) {
      try {
        await navigator.clipboard.writeText(updated.invoiceUrl);
        alert('Link da fatura copiado para a área de transferência.');
      } catch {
        alert(`Link da fatura: ${updated.invoiceUrl}`);
      }
    }
  };

  const handleEmptyDayClick = (day: Date) => {
    resetForm(day);
    setShowCreateModal(true);
  };

  const openEditModal = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setEditForm({
      date: appointment.date.split('T')[0],
      startTime: appointment.startTime,
      endTime: appointment.endTime || '',
      price: appointment.price.toString(),
      notes: appointment.notes || '',
      status: appointment.status,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;
    try {
      setSaving(true);
      const shouldPromptInvoice =
        editingAppointment.status !== 'CONCLUIDO' && editForm.status === 'CONCLUIDO';
      await appointmentsApi.update(editingAppointment.id, {
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime || undefined,
        price: parseFloat(editForm.price),
        notes: editForm.notes,
        status: editForm.status,
      });
      if (shouldPromptInvoice) {
        await handleStatusUpdate(editingAppointment.id, 'CONCLUIDO', true);
      }
      setShowEditModal(false);
      setEditingAppointment(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (status: AppointmentStatus) => {
    if (!editingAppointment) return;
    try {
      setSaving(true);
      await handleStatusUpdate(editingAppointment.id, status, status === 'CONCLUIDO');
      setShowEditModal(false);
      setEditingAppointment(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setSaving(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd],
  );

  const getAgendamentosForDay = (day: Date) =>
    appointments.filter((ag) => isSameDay(new Date(ag.date), day));

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'AGENDADO':
        return 'bg-blue-100 text-blue-700';
      case 'EM_ANDAMENTO':
        return 'bg-indigo-100 text-indigo-700';
      case 'CONCLUIDO':
        return 'bg-green-100 text-green-700';
      case 'CANCELADO':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Agenda</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-medium text-gray-700 min-w-[150px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {monthDays.map((day) => {
            const dayAppointments = getAgendamentosForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`border rounded-lg p-4 min-h-[150px] ${
                  isToday ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className={`text-lg font-bold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-2">
                  {dayAppointments.length > 0 ? (
                    dayAppointments.map((appointment) => (
                      <button
                        type="button"
                        key={appointment.id}
                        onClick={() => openEditModal(appointment)}
                        className={`w-full text-left text-xs p-2 rounded transition hover:opacity-90 ${getStatusColor(
                          appointment.status,
                        )}`}
                      >
                        <div className="font-medium truncate">{appointment.customer.name}</div>
                        <div className="text-xs opacity-75">{appointment.startTime}</div>
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEmptyDayClick(day)}
                      className="w-full text-xs text-gray-500 border-2 border-dashed border-gray-200 rounded-lg py-6 text-center hover:border-primary-400 hover:text-primary-600 transition-colors"
                    >
                      + Adicionar agendamento
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showCreateModal && (
        <CreateModal
          title="Novo Agendamento"
          customers={customers}
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          currentYear={currentDate.getFullYear()}
          dateError={dateError}
        />
      )}

      {showEditModal && editingAppointment && (
        <EditModal
          appointment={editingAppointment}
          formData={editForm}
          setFormData={setEditForm}
          saving={saving}
          onClose={() => {
            setShowEditModal(false);
            setEditingAppointment(null);
          }}
          onSubmit={handleUpdate}
          onQuickStatus={handleQuickStatus}
        />
      )}
    </div>
  );
};

type CreateFormState = {
  customerId: string;
  month: string;
  day: string;
  startTime: string;
  endTime: string;
  price: string;
  isRecurring: boolean;
  recurrenceRule: string;
  notes: string;
};

const CreateModal = ({
  title,
  customers,
  formData,
  setFormData,
  saving,
  onClose,
  onSubmit,
  currentYear,
  dateError,
}: {
  title: string;
  customers: Customer[];
  formData: CreateFormState;
  setFormData: React.Dispatch<React.SetStateAction<CreateFormState>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  currentYear: number;
  dateError: string;
}) => {
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

  const selectedMonth = Number(formData.month || '1');
  const daysInSelectedMonth = new Date(currentYear, selectedMonth, 0).getDate();
  const dayOptions = Array.from({ length: daysInSelectedMonth }, (_, index) =>
    pad(index + 1),
  );

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
    <div className="bg-white rounded-xl shadow-xl z-50 w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select
              required
              value={formData.customerId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  customerId: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecione um cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês *</label>
              <select
                required
                value={formData.month}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    month: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia *</label>
              <select
                required
                value={formData.day}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    day: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500">O ano está sincronizado automaticamente com {currentYear}.</p>
          {dateError && <p className="text-xs text-red-600">{dateError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Início *</label>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
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
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isRecurring: e.target.checked,
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
                <option value="FREQ=MONTHLY">Mensal</option>
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

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

type EditModalProps = {
  appointment: Appointment;
  formData: {
    date: string;
    startTime: string;
    endTime: string;
    price: string;
    notes: string;
    status: AppointmentStatus;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      date: string;
      startTime: string;
      endTime: string;
      price: string;
      notes: string;
      status: AppointmentStatus;
    }>
  >;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onQuickStatus: (status: AppointmentStatus) => void;
};

const EditModal = ({ appointment, formData, setFormData, saving, onClose, onSubmit, onQuickStatus }: EditModalProps) => (
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
          <Link
            to={`/invoice/${appointment.id}`}
            className="text-sm font-semibold text-primary-600 hover:underline whitespace-nowrap"
          >
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onQuickStatus('CONCLUIDO')}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Marcar como concluído
            </button>
            <button
              type="button"
              onClick={() => onQuickStatus('CANCELADO')}
              className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Cancelar
            </button>
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
        </form>
      </div>
    </div>
  </div>
);

export default AgendaMensal;
