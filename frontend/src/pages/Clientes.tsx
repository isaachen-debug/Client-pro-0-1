import { useEffect, useState } from 'react';
import { Plus, Search, MoreVertical, Phone, MapPin, Loader2, Edit3 } from 'lucide-react';
import { appointmentsApi, customersApi } from '../services/api';
import { Appointment, AppointmentStatus, Customer, CustomerStatus } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateFromInput } from '../utils/date';

type CustomerFormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  serviceType: string;
  status: CustomerStatus;
  notes: string;
  defaultPrice: string;
};

const STATUS_LABELS: Record<CustomerStatus, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  INACTIVE: 'Ex-cliente',
};

const STATUS_BADGE_CLASSES: Record<CustomerStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-amber-100 text-amber-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
};

const statusFilterOptions: Array<{ label: string; value: 'ALL' | CustomerStatus }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Ativos', value: 'ACTIVE' },
  { label: 'Pausados', value: 'PAUSED' },
  { label: 'Inativos', value: 'INACTIVE' },
];

const serviceTypeOptions = ['Semanal', 'Quinzenal', 'Mensal', 'Único'];

const Clientes = () => {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CustomerStatus>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [statusActionId, setStatusActionId] = useState<string | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyAppointments, setHistoryAppointments] = useState<Appointment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const initialFormState: CustomerFormState = {
    name: '',
    phone: '',
    email: '',
    address: '',
    serviceType: '',
    status: 'ACTIVE',
    notes: '',
    defaultPrice: '',
  };

  const [formData, setFormData] = useState<CustomerFormState>(initialFormState);

  useEffect(() => {
    const handleOutsideClick = () => setMenuOpenId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchClientes(searchTerm, statusFilter);
    }, searchTerm ? 300 : 0);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter]);

  const fetchClientes = async (query = '', statusValue: 'ALL' | CustomerStatus = statusFilter) => {
    try {
      setLoading(true);
      const data = await customersApi.list({
        search: query.trim() || undefined,
        status: statusValue !== 'ALL' ? statusValue : undefined,
      });
      setClientes(data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingCustomer(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      serviceType: customer.serviceType || '',
      status: customer.status,
      notes: customer.notes || '',
      defaultPrice: customer.defaultPrice ? customer.defaultPrice.toString() : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const defaultPriceValue =
        formData.defaultPrice.trim() === '' ? undefined : Number(formData.defaultPrice);
      const payload = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        serviceType: formData.serviceType || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        defaultPrice: Number.isNaN(defaultPriceValue) ? undefined : defaultPriceValue,
      };
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, payload);
      } else {
        await customersApi.create(payload);
      }
      setShowModal(false);
      resetForm();
      fetchClientes(searchTerm, statusFilter);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (customer: Customer, nextStatus: CustomerStatus) => {
    if (nextStatus === 'INACTIVE') {
      const confirmed = window.confirm(
        `Marcar ${customer.name} como ex-cliente? Essa ação pode ser revertida depois.`,
      );
      if (!confirmed) return;
    }

    try {
      setStatusActionId(customer.id);
      const updated = await customersApi.updateStatus(customer.id, nextStatus);
      setClientes((prev) => prev.map((item) => (item.id === customer.id ? updated : item)));
      setMenuOpenId(null);
    } catch (error) {
      console.error('Erro ao atualizar status do cliente:', error);
    } finally {
      setStatusActionId(null);
    }
  };

  const handleViewHistory = async (customer: Customer) => {
    setHistoryCustomer(customer);
    setHistoryAppointments([]);
    setHistoryLoading(true);
    try {
      const data = await appointmentsApi.listByCustomer(customer.id);
      setHistoryAppointments(data);
    } catch (error) {
      console.error('Erro ao carregar histórico do cliente:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setHistoryCustomer(null);
    setHistoryAppointments([]);
  };

  const sanitizeCsvValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).replace(/"/g, '""');
  };

  const handleExportClientes = () => {
    if (clientes.length === 0) {
      alert('Não há clientes para exportar.');
      return;
    }

    const headers = [
      'Nome',
      'E-mail',
      'Telefone',
      'Endereço',
      'Tipo de serviço',
      'Status',
      'Preço padrão',
    ];

    const rows = clientes.map((cliente) => [
      cliente.name ?? '',
      cliente.email ?? '',
      cliente.phone ?? '',
      cliente.address ?? '',
      cliente.serviceType ?? '',
      STATUS_LABELS[cliente.status] ?? cliente.status ?? '',
      cliente.defaultPrice !== undefined && cliente.defaultPrice !== null
        ? cliente.defaultPrice.toFixed(2).replace('.', ',')
        : '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => `"${sanitizeCsvValue(value)}"`).join(';'))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `clientes_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Total de clientes: {clientes.length}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleExportClientes}
            className="flex items-center justify-center space-x-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            <span>Adicionar Cliente</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {statusFilterOptions.map((option) => {
            const isActive = statusFilter === option.value;
            const baseClasses =
              option.value === 'ALL'
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : option.value === 'ACTIVE'
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : option.value === 'PAUSED'
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
            const activeClasses =
              option.value === 'ALL'
                ? 'bg-gray-900 text-white'
                : option.value === 'ACTIVE'
                  ? 'bg-green-600 text-white'
                  : option.value === 'PAUSED'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-500 text-white';
            return (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? activeClasses : baseClasses
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Serviço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endereço
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary-700">
                          {cliente.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{cliente.name}</div>
                        {cliente.email && (
                          <div className="text-sm text-gray-500">{cliente.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{cliente.serviceType ?? '-'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[cliente.status]}`}
                    >
                      {STATUS_LABELS[cliente.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Phone size={16} className="mr-2 text-gray-400" />
                      {cliente.phone || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin size={16} className="mr-2 text-gray-400 flex-shrink-0" />
                      <span className="line-clamp-2">{cliente.address || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(cliente);
                      }}
                      className="text-primary-600 hover:text-primary-800 p-2 rounded-lg hover:bg-primary-50 mr-1"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId((prev) => (prev === cliente.id ? null : cliente.id));
                      }}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                    >
                      <MoreVertical size={20} />
                    </button>
                    {menuOpenId === cliente.id && (
                      <div
                        className="absolute right-4 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpenId(null);
                            handleViewHistory(cliente);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Ver histórico
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpenId(null);
                            openEditModal(cliente);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        {cliente.status !== 'PAUSED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(cliente, 'PAUSED')}
                            disabled={statusActionId === cliente.id}
                            className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 disabled:opacity-60"
                          >
                            {statusActionId === cliente.id ? 'Atualizando...' : 'Pausar cliente'}
                          </button>
                        )}
                        {cliente.status !== 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(cliente, 'ACTIVE')}
                            disabled={statusActionId === cliente.id}
                            className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 disabled:opacity-60"
                          >
                            {statusActionId === cliente.id ? 'Atualizando...' : 'Reativar cliente'}
                          </button>
                        )}
                        {cliente.status !== 'INACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(cliente, 'INACTIVE')}
                            disabled={statusActionId === cliente.id}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            {statusActionId === cliente.id ? 'Atualizando...' : 'Marcar como ex-cliente'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && clientes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
        <div className="md:hidden p-4 space-y-3">
          {clientes.map((cliente) => (
            <div key={cliente.id} className="border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">{cliente.name}</p>
                  <p className="text-sm text-gray-500">
                    {cliente.serviceType ?? 'Tipo de serviço não informado'}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[cliente.status]}`}
                >
                  {STATUS_LABELS[cliente.status]}
                </span>
              </div>
              {cliente.email && <p className="text-sm text-gray-500">{cliente.email}</p>}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Phone size={16} className="text-gray-400" />
                  <span>{cliente.phone || 'Sem telefone'}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <span>{cliente.address || 'Sem endereço cadastrado'}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleViewHistory(cliente)}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Histórico
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(cliente)}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center px-3 py-2 text-sm font-medium border border-primary-100 text-primary-600 rounded-lg hover:bg-primary-50"
                >
                  Editar
                </button>
                {cliente.status !== 'PAUSED' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(cliente, 'PAUSED')}
                    disabled={statusActionId === cliente.id}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 rounded-lg disabled:opacity-60"
                  >
                    {statusActionId === cliente.id ? 'Atualizando...' : 'Pausar'}
                  </button>
                )}
                {cliente.status !== 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(cliente, 'ACTIVE')}
                    disabled={statusActionId === cliente.id}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium bg-green-50 text-green-700 rounded-lg disabled:opacity-60"
                  >
                    {statusActionId === cliente.id ? 'Atualizando...' : 'Reativar'}
                  </button>
                )}
                {cliente.status !== 'INACTIVE' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(cliente, 'INACTIVE')}
                    disabled={statusActionId === cliente.id}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg disabled:opacity-60"
                  >
                    {statusActionId === cliente.id ? 'Atualizando...' : 'Ex-cliente'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {!loading && clientes.length === 0 && (
            <p className="text-center text-gray-500 py-8">Nenhum cliente encontrado</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowModal(false)} />
          <div className="bg-white rounded-xl shadow-xl z-50 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingCustomer ? 'Editar Cliente' : 'Adicionar Cliente'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Serviço
                  </label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Selecione</option>
                    {serviceTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    {formData.serviceType &&
                      !serviceTypeOptions.includes(formData.serviceType) && (
                        <option value={formData.serviceType}>{formData.serviceType}</option>
                      )}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as CustomerStatus })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço padrão (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 150,00"
                      value={formData.defaultPrice}
                      onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
      )}

      {historyCustomer && (
        <HistoryModal
          customer={historyCustomer}
          appointments={historyAppointments}
          loading={historyLoading}
          onClose={closeHistoryModal}
        />
      )}
    </div>
  );
};

type HistoryModalProps = {
  customer: Customer;
  appointments: Appointment[];
  loading: boolean;
  onClose: () => void;
};

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  AGENDADO: 'Agendado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

const appointmentStatusClasses: Record<AppointmentStatus, string> = {
  AGENDADO: 'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-indigo-100 text-indigo-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

const HistoryModal = ({ customer, appointments, loading, onClose }: HistoryModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
    <div className="bg-white rounded-xl shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Histórico de serviços</h2>
            <p className="text-sm text-gray-500">{customer.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100"
          >
            Fechar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            Nenhum agendamento encontrado para este cliente.
          </p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {format(parseDateFromInput(appointment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {appointment.startTime} — R$ {appointment.price.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${appointmentStatusClasses[appointment.status]}`}
                  >
                    {appointmentStatusLabels[appointment.status]}
                  </span>
                </div>
                {appointment.notes && (
                  <p className="text-sm text-gray-600 border-t border-gray-100 pt-2">
                    {appointment.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default Clientes;

