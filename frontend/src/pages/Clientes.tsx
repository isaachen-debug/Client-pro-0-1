import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Phone, MapPin, Loader2, Edit3, FileText, Copy, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { appointmentsApi, customersApi, teamApi } from '../services/api';
import { geoApi, type AddressSuggestion } from '../services/geo';
import { useSearchParams } from 'react-router-dom';
import {
  AccessMethod,
  Appointment,
  AppointmentStatus,
  BillingType,
  Contract,
  ContractBlueprint,
  ContractStatus,
  Customer,
  CustomerStatus,
  ServiceFrequency,
} from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateFromInput } from '../utils/date';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import ContractWizard from '../components/contracts/ContractWizard';
import { useRegisterQuickAction } from '../contexts/QuickActionContext';
import { PageHeader, SurfaceCard } from '../components/OwnerUI';
import AudioQuickAdd from '../components/AudioQuickAdd';
import { pageGutters } from '../styles/uiTokens';

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const frequencyLabels: Record<ServiceFrequency, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly',
  MONTHLY: 'Monthly',
  ONE_TIME: 'One-time',
};

const billingLabels: Record<BillingType, string> = {
  PER_VISIT: 'Per visit',
  WEEKLY_AUTO: 'Weekly auto-charge',
  MONTHLY: 'Monthly billing cycle',
};

const accessLabels: Record<AccessMethod, string> = {
  DOOR_CODE: 'Door code',
  KEY: 'Key / lockbox',
  SOMEONE_HOME: 'Someone will be home',
  GARAGE: 'Garage code',
};

const standardServiceLabels: Record<string, string> = {
  dusting: 'Dusting',
  vacuuming: 'Vacuuming',
  mopping: 'Mopping',
  kitchenExterior: 'Kitchen exterior cleaning',
  bathroom: 'Bathroom sanitizing',
  trash: 'Trash removal',
};

const deepServiceLabels: Record<string, string> = {
  baseboards: 'Baseboards',
  insideFridge: 'Inside fridge',
  insideOven: 'Inside oven',
  windows: 'Windows tracks',
  highDusting: 'High dusting',
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'contrato';

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

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  PENDENTE: 'Pendente',
  ACEITO: 'Aceito',
  RECUSADO: 'Recusado',
};

const CONTRACT_STATUS_CLASSES: Record<ContractStatus, string> = {
  PENDENTE: 'bg-amber-50 text-amber-600 border border-amber-100',
  ACEITO: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  RECUSADO: 'bg-red-50 text-red-600 border border-red-100',
};

const CONTRACT_FILTER_OPTIONS: Array<{ label: string; value: 'ALL' | ContractStatus }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Pendentes', value: 'PENDENTE' },
  { label: 'Aceitos', value: 'ACEITO' },
  { label: 'Recusados', value: 'RECUSADO' },
];

const Clientes = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { theme } = usePreferences();
  const isDarkTheme = theme === 'dark';
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CustomerStatus>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressRequestRef = useRef(0);
  const [activeTab, setActiveTab] = useState<'list' | 'contracts'>('list');

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [savingContract, setSavingContract] = useState(false);
  const [updatingContractId, setUpdatingContractId] = useState<string | null>(null);
  const [copiedContractId, setCopiedContractId] = useState<string | null>(null);
  const [downloadingContractId, setDownloadingContractId] = useState<string | null>(null);
  const [wizardStatus, setWizardStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [contractStatusFilter, setContractStatusFilter] = useState<'ALL' | ContractStatus>('ALL');
  const [openedFromQuery, setOpenedFromQuery] = useState(false);
  const filteredContracts = useMemo(
    () =>
      contractStatusFilter === 'ALL'
        ? contracts
        : contracts.filter((contract) => contract.status === contractStatusFilter),
    [contractStatusFilter, contracts]
  );
  const customersWithPortal = useMemo(() => clientes.filter((cliente) => !!cliente.email).length, [clientes]);

  useEffect(() => {
    // legacy listener removido
    return () => {};
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchClientes(searchTerm, statusFilter);
    }, searchTerm ? 300 : 0);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (activeTab === 'contracts') {
      fetchContracts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!showModal) return;
    const query = formData.address.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }
    const requestId = ++addressRequestRef.current;
    setAddressLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await geoApi.autocomplete(query);
        if (requestId !== addressRequestRef.current) return;
        setAddressSuggestions(results);
      } catch (error) {
        console.error('Erro ao buscar enderecos:', error);
        if (requestId !== addressRequestRef.current) return;
        setAddressSuggestions([]);
      } finally {
        if (requestId === addressRequestRef.current) {
          setAddressLoading(false);
        }
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [formData.address, showModal]);

  useEffect(() => {
    if (!showModal) {
      setAddressSuggestions([]);
      setAddressLoading(false);
    }
  }, [showModal]);

  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (!customerId || openedFromQuery) return;
    if (!clientes.length) return;
    const found = clientes.find((cliente) => cliente.id === customerId);
    if (found) {
      setActiveTab('list');
      openEditModal(found);
      setOpenedFromQuery(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('customerId');
      setSearchParams(nextParams, { replace: true });
    }
  }, [clientes, openedFromQuery, searchParams, setSearchParams]);

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
      setInitialLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      setContractsLoading(true);
      const data = await teamApi.listContracts();
      setContracts(data);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
    } finally {
      setContractsLoading(false);
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
  useRegisterQuickAction('clients:add', openCreateModal);

  const handleContractStatusChange = async (contractId: string, status: ContractStatus) => {
    try {
      setUpdatingContractId(contractId);
      const updated = await teamApi.updateContractStatus(contractId, status);
      setContracts((prev) => prev.map((contract) => (contract.id === contractId ? updated : contract)));
    } catch (error) {
      console.error('Erro ao atualizar contrato:', error);
    } finally {
      setUpdatingContractId(null);
    }
  };

  const formatContractDate = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const handleCopyContract = async (body: string, id: string) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedContractId(id);
      setTimeout(() => setCopiedContractId(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar contrato:', error);
    }
  };

  const getServicesFromBlueprint = (blueprint: ContractBlueprint) => {
    const list: string[] = [];
    Object.entries(blueprint.services.standard).forEach(([key, value]) => {
      if (value) list.push(standardServiceLabels[key] ?? key);
    });
    Object.entries(blueprint.services.deep).forEach(([key, value]) => {
      if (value) list.push(deepServiceLabels[key] ?? key);
    });
    const addons = blueprint.services.addons?.map(
      (addon) => `${addon.label} (+${usdFormatter.format(addon.price)})`,
    ) ?? [];
    return [...list, ...blueprint.services.custom, ...addons];
  };

  const buildContractBody = (blueprint: ContractBlueprint) => {
    const addons = blueprint.services.addons ?? [];
    const services = getServicesFromBlueprint(blueprint)
      .map((service) => `- ${service}`)
      .join('\n');
    const paymentMethods = blueprint.payment.paymentMethods.length
      ? blueprint.payment.paymentMethods.join(', ')
      : 'According to availability';
    return [
      'CLEANING SERVICE AGREEMENT',
      '',
      `Client: ${blueprint.client.name}`,
      `Service address: ${blueprint.client.address || 'to be confirmed'}`,
      `Start date: ${blueprint.startDate || 'to be scheduled'}`,
      `Frequency: ${frequencyLabels[blueprint.client.frequency] || blueprint.client.frequency}`,
      `Amount per visit: ${blueprint.payment.amount ? usdFormatter.format(blueprint.payment.amount) : 'custom'}`,
      '',
      'Included services:',
      services || '- Custom plan',
      ...(addons.length
        ? [
            '',
            'Paid add-ons:',
            ...addons.map((addon) => `- ${addon.label} (+${usdFormatter.format(addon.price)})`),
          ]
        : []),
      '',
      'Payment terms:',
      `• Billing: ${billingLabels[blueprint.payment.billingType]}`,
      `• Accepted methods: ${paymentMethods}`,
      `• Late policy: ${blueprint.payment.latePolicy || 'Not defined'}`,
      '',
      'Cancellation policy:',
      blueprint.cancellation,
      '',
      'Access details:',
      `${accessLabels[blueprint.access.method]}${blueprint.access.notes ? ` - ${blueprint.access.notes}` : ''}`,
    ].join('\n');
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadContract = async (contract: Contract) => {
    try {
      setWizardStatus(null);
      setDownloadingContractId(contract.id);
      const blob = await teamApi.downloadContractPdf(contract.id);
      triggerDownload(blob, `${slugify(contract.title)}.pdf`);
    } catch (error) {
      console.error('Erro ao baixar contrato:', error);
      setWizardStatus({
        type: 'error',
        message: 'Não foi possível gerar o PDF agora. Tente novamente em alguns segundos.',
      });
    } finally {
      setDownloadingContractId(null);
    }
  };

  const handleNewContractClick = () => {
    setActiveTab('contracts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWizardSubmit = async (blueprint: ContractBlueprint, action: 'send' | 'sign' | 'save') => {
    if (!blueprint.client.id) {
      setWizardStatus({ type: 'error', message: 'Selecione um cliente antes de gerar o contrato.' });
      return;
    }
    try {
      setWizardStatus(null);
      setSavingContract(true);
      const title = `${frequencyLabels[blueprint.client.frequency] || 'Custom'} plan - ${blueprint.client.name}`;
      const payload = {
        customerId: blueprint.client.id,
        title,
        body: buildContractBody(blueprint),
        placeholders: {
          blueprint,
        },
      };
      const created = await teamApi.createContract(payload);
      if (action === 'sign') {
        await teamApi.updateContractStatus(created.id, 'ACEITO', 'Assinado presencialmente pelo cliente.');
      }
      if (action === 'save') {
        const blob = await teamApi.downloadContractPdf(created.id);
        triggerDownload(blob, `${slugify(created.title)}.pdf`);
      }
      const provisional = created.meta?.provisionalAccess;
      setWizardStatus({
        type: 'success',
        message:
          action === 'sign'
            ? 'Contrato assinado e arquivado no perfil do cliente.'
            : action === 'save'
              ? 'Contrato gerado. PDF baixado sem enviar notificação.'
              : provisional
                ? `Contrato enviado! Criamos acesso automático para ${provisional.email} com senha ${provisional.temporaryPassword}.`
                : 'Contrato enviado! O cliente será notificado.',
      });
      fetchContracts();
    } catch (error: any) {
      console.error('Erro ao gerar contrato:', error);
      const message = error?.response?.data?.error ?? 'Não foi possível gerar o contrato. Tente novamente.';
      setWizardStatus({ type: 'error', message });
    } finally {
      setSavingContract(false);
    }
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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div
      className={`${pageGutters} max-w-full md:max-w-6xl mx-auto space-y-8`}
      style={{
        background: isDarkTheme
          ? 'linear-gradient(180deg, #0b0f1a 0%, #111827 100%)'
          : 'linear-gradient(180deg, #f3f4ff 0%, #eef2ff 100%)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 420px',
        backgroundPosition: 'top center',
        borderRadius: '24px',
      }}
    >
      <PageHeader
        label="CLIENTES"
        title="Clients"
        subtitle="Base de clientes e contratos em um só lugar."
        actions={
          <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'list', label: 'Clientes' },
            { key: 'contracts', label: 'Contracts' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'list' | 'contracts')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:text-primary-600'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        }
      />

      {activeTab === 'list' ? (
        <>
      {/* Search */}
          <div className="rounded-[24px] border border-slate-100 bg-white shadow-sm p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, endereço ou contrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilterOptions.map((option) => {
                const isActive = statusFilter === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition border ${
                      isActive
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary-200 hover:text-primary-700'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {loading && !initialLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Atualizando lista...</span>
              </div>
            )}
          </div>

      {/* List em cards simples */}
      <div className="space-y-3">
        {clientes.map((cliente) => (
          <div
            key={cliente.id}
            className="rounded-2xl border border-slate-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center">
                  {cliente.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">{cliente.name}</p>
                  <p className="text-sm text-slate-600">{cliente.serviceType || 'Tipo de serviço não informado'}</p>
                  {cliente.email ? <p className="text-xs text-slate-500">{cliente.email}</p> : null}
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_BADGE_CLASSES[cliente.status]}`}
              >
                {STATUS_LABELS[cliente.status]}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-slate-400" />
                <span>{cliente.phone || 'Sem telefone'}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-slate-400 mt-0.5" />
                <span className="line-clamp-2">{cliente.address || 'Sem endereço cadastrado'}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleViewHistory(cliente)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Histórico
              </button>
              <button
                type="button"
                onClick={() => openEditModal(cliente)}
                className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100"
              >
                <Edit3 size={16} />
                Editar
              </button>
              {cliente.status !== 'PAUSED' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(cliente, 'PAUSED')}
                  disabled={statusActionId === cliente.id}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 disabled:opacity-60"
                >
                  {statusActionId === cliente.id ? 'Atualizando...' : 'Pausar'}
                </button>
              )}
              {cliente.status !== 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(cliente, 'ACTIVE')}
                  disabled={statusActionId === cliente.id}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                >
                  {statusActionId === cliente.id ? 'Atualizando...' : 'Reativar'}
                </button>
              )}
              {cliente.status !== 'INACTIVE' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(cliente, 'INACTIVE')}
                  disabled={statusActionId === cliente.id}
                  className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                >
                  {statusActionId === cliente.id ? 'Atualizando...' : 'Ex-cliente'}
                </button>
              )}
            </div>
          </div>
        ))}

        {!loading && clientes.length === 0 && (
          <div className="text-center text-slate-500 py-10 space-y-2">
            <p className="text-sm font-semibold text-slate-900">Nenhum cliente cadastrado ainda.</p>
            <p className="text-xs text-slate-500">Clique em “Novo cliente” para começar sua base.</p>
          </div>
        )}
      </div>

          <div className="grid gap-4 owner-grid-tight mt-4">
            <SurfaceCard className="space-y-3 bg-gradient-to-br from-primary-50 via-white to-accent-50 border-slate-100">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                <span>Clientes</span>
                <span className="text-slate-300">•</span>
                <span>Portal + contratos</span>
              </div>
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-sm text-slate-600">Cadastros totais</p>
                  <p className="text-4xl font-bold text-slate-900">{clientes.length}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Com acesso ao app</p>
                  <p className="text-2xl font-semibold text-slate-900">{customersWithPortal}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Conecte cada Client ao portal e automatize contratos e feedbacks.
              </p>
            </SurfaceCard>
          </div>

          <SurfaceCard className="space-y-3 mt-4">
            <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">Ações rápidas</p>
            <div className="flex flex-col sm:flex-row gap-2 owner-stack">
              <button
                onClick={handleExportClientes}
                className="flex-1 owner-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Exportar CSV
              </button>
              <button
                onClick={openCreateModal}
                className="flex-1 owner-full inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 text-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-primary-700"
              >
                <Plus size={18} />
                Novo cliente
              </button>
            </div>
          </SurfaceCard>

        </>
      ) : (
        <>
          {wizardStatus && (
            <div
              className={`text-sm px-4 py-3 rounded-2xl border ${
                wizardStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-red-50 text-red-600 border-red-100'
              }`}
            >
              {wizardStatus.message}
            </div>
          )}

          <ContractWizard
            clients={clientes}
            ownerLogo={user?.avatarUrl || undefined}
            ownerAccentColor={user?.primaryColor || undefined}
            saving={savingContract}
            onSubmit={handleWizardSubmit}
          />

          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Contratos</p>
                <p className="text-xs text-gray-500">Envios e status em um lugar.</p>
              </div>
              <button
                type="button"
                onClick={handleNewContractClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-semibold shadow-sm hover:bg-primary-700"
              >
                <FileText size={16} />
                Novo contrato
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {CONTRACT_FILTER_OPTIONS.map((option) => {
                const isActive = contractStatusFilter === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setContractStatusFilter(option.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                      isActive
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary-200 hover:text-primary-700'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {contractsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando contratos...
              </div>
            ) : filteredContracts.length ? (
              <div className="grid gap-4">
                {filteredContracts.map((contract) => {
                  const blueprint = (contract.placeholders?.blueprint as ContractBlueprint | undefined) || null;
                  const serviceCount = blueprint ? getServicesFromBlueprint(blueprint).length : null;
                  const isPending = contract.status === 'PENDENTE';
                  const isAccepted = contract.status === 'ACEITO';
                  return (
                    <div
                      key={contract.id}
                    className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex flex-wrap items-start gap-2 justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{contract.title}</p>
                          <p className="text-xs text-gray-500">
                            {contract.client?.name || 'Cliente'} • {formatContractDate(contract.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${CONTRACT_STATUS_CLASSES[contract.status]}`}
                        >
                          {CONTRACT_STATUS_LABELS[contract.status]}
                        </span>
                      </div>
                      {blueprint && (
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>{frequencyLabels[blueprint.client.frequency] || blueprint.client.frequency}</span>
                          <span>{usdFormatter.format(blueprint.payment.amount)} / visita</span>
                          {serviceCount !== null && <span>{serviceCount} itens incluídos</span>}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <button
                          type="button"
                          onClick={() => handleDownloadContract(contract)}
                          disabled={downloadingContractId === contract.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          <Download size={16} />
                          {downloadingContractId === contract.id ? 'Gerando...' : 'Baixar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyContract(contract.body, contract.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          <Copy size={16} />
                          {copiedContractId === contract.id ? 'Copiado!' : 'Copiar'}
                        </button>
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleContractStatusChange(contract.id, 'ACEITO')}
                              disabled={updatingContractId === contract.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 disabled:opacity-60"
                            >
                              <CheckCircle size={16} />
                              {updatingContractId === contract.id ? 'Atualizando...' : 'Aceitar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleContractStatusChange(contract.id, 'RECUSADO')}
                              disabled={updatingContractId === contract.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100 disabled:opacity-60"
                            >
                              <AlertTriangle size={16} />
                              {updatingContractId === contract.id ? 'Atualizando...' : 'Recusar'}
                            </button>
                          </>
                        )}
                        {isAccepted && (
                          <span className="text-xs text-gray-500">Aceito em {formatContractDate(contract.acceptedAt)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-2xl p-6 text-center space-y-2">
                <FileText className="mx-auto text-gray-300" size={32} />
                <p className="text-sm font-semibold text-gray-900">Nenhum contrato enviado ainda</p>
                <p className="text-sm text-gray-500">Use o criador acima para montar seu primeiro contrato.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal      {/* Modal */}
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
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      onBlur={() => {
                        window.setTimeout(() => setAddressSuggestions([]), 120);
                      }}
                      onFocus={() => {
                        if (formData.address.trim().length >= 3 && addressSuggestions.length === 0) {
                          setAddressSuggestions([]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Digite o endereço"
                    />
                    {addressLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        Buscando...
                      </div>
                    )}
                    {addressSuggestions.length > 0 && (
                      <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                        {addressSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.value}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setFormData({ ...formData, address: suggestion.value });
                              setAddressSuggestions([]);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                      Base price (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 150.00"
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

      <AudioQuickAdd />
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
  AGENDADO: 'A confirmar',
  EM_ANDAMENTO: 'Agendado',
  CONCLUIDO: 'Agendado',
  CANCELADO: 'Cancelado',
};

const appointmentStatusClasses: Record<AppointmentStatus, string> = {
  AGENDADO: 'bg-amber-100 text-amber-700',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
  CONCLUIDO: 'bg-blue-100 text-blue-700',
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
                      {appointment.startTime} — {usdFormatter.format(appointment.price)}
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
