import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  MoreVertical,
  Phone,
  MapPin,
  Loader2,
  Edit3,
  FileText,
  Copy,
  CheckCircle,
  AlertTriangle,
  Download,
  ChevronDown,
} from 'lucide-react';
import { appointmentsApi, customersApi, teamApi } from '../services/api';
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
  CompanyShowcase,
  CompanyShowcaseSection,
  OwnerReviewLinks,
} from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateFromInput } from '../utils/date';
import { useAuth } from '../contexts/AuthContext';
import ContractWizard from '../components/contracts/ContractWizard';

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

const generateSectionId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `section-${Date.now()}-${Math.random()}`;

const createDefaultShowcase = (): CompanyShowcase => ({
  headline: 'Por que confiar na nossa equipe?',
  description: 'Equipe treinada, comunicação transparente e foco nos detalhes.',
  layout: 'grid',
  sections: [
    {
      id: generateSectionId(),
      title: 'Equipe certificada',
      description: 'Profissionais verificados e treinados continuamente.',
      emoji: '🛡️',
    },
    {
      id: generateSectionId(),
      title: 'Checklist personalizado',
      description: 'Você escolhe o foco e registramos cada etapa.',
      emoji: '📝',
    },
  ],
});

const normalizeShowcase = (showcase?: CompanyShowcase | null): CompanyShowcase => {
  const fallback = createDefaultShowcase();
  if (!showcase) return fallback;
  const sections =
    Array.isArray(showcase.sections) && showcase.sections.length
      ? showcase.sections.map((section, index) => ({
          id: section.id ?? generateSectionId(),
          title: section.title ?? `Destaque ${index + 1}`,
          description: section.description ?? '',
          emoji: section.emoji ?? '✨',
        }))
      : fallback.sections;
  return {
    headline: showcase.headline ?? fallback.headline,
    description: showcase.description ?? fallback.description,
    layout: showcase.layout === 'stacked' ? 'stacked' : 'grid',
    sections,
  };
};

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

const Clientes = () => {
  const { user, updateProfile } = useAuth();
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
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
  const [activeTab, setActiveTab] = useState<'list' | 'contracts'>('list');

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [savingContract, setSavingContract] = useState(false);
  const [updatingContractId, setUpdatingContractId] = useState<string | null>(null);
  const [copiedContractId, setCopiedContractId] = useState<string | null>(null);
  const [downloadingContractId, setDownloadingContractId] = useState<string | null>(null);
  const [portalAccessForm, setPortalAccessForm] = useState({
    customerId: '',
    name: '',
    email: '',
    password: '',
  });
  const [portalAccessSaving, setPortalAccessSaving] = useState(false);
  const [portalAccessMessage, setPortalAccessMessage] = useState<{ email: string; password: string } | null>(null);
  const [portalAccessError, setPortalAccessError] = useState('');
  const [portalAccessOpen, setPortalAccessOpen] = useState(true);
  const [showcasePanelOpen, setShowcasePanelOpen] = useState(false);
  const [reviewLinksForm, setReviewLinksForm] = useState<OwnerReviewLinks>({
    google: user?.reviewLinks?.google ?? '',
    nextdoor: user?.reviewLinks?.nextdoor ?? '',
    instagram: user?.reviewLinks?.instagram ?? '',
    facebook: user?.reviewLinks?.facebook ?? '',
    website: user?.reviewLinks?.website ?? user?.companyWebsite ?? '',
  });
  const [showcaseForm, setShowcaseForm] = useState<CompanyShowcase>(() =>
    normalizeShowcase(user?.companyShowcase ?? null),
  );
  const [showcaseStatus, setShowcaseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showcaseSaving, setShowcaseSaving] = useState(false);
  const [wizardStatus, setWizardStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const customersWithPortal = useMemo(() => clientes.filter((cliente) => !!cliente.email).length, [clientes]);

  useEffect(() => {
    setShowcaseForm(normalizeShowcase(user?.companyShowcase ?? null));
    setReviewLinksForm({
      google: user?.reviewLinks?.google ?? '',
      nextdoor: user?.reviewLinks?.nextdoor ?? '',
      instagram: user?.reviewLinks?.instagram ?? '',
      facebook: user?.reviewLinks?.facebook ?? '',
      website: user?.reviewLinks?.website ?? user?.companyWebsite ?? '',
    });
  }, [user?.companyShowcase, user?.reviewLinks, user?.companyWebsite]);

  const reviewLinkFields: Array<{ key: keyof OwnerReviewLinks; label: string; placeholder: string }> = [
    { key: 'website', label: 'Site oficial', placeholder: 'https://suaempresa.com' },
    { key: 'google', label: 'Google Meu Negócio', placeholder: 'https://g.page/suaempresa/review' },
    { key: 'nextdoor', label: 'Nextdoor', placeholder: 'https://nextdoor.com/pages/suaempresa' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/suaempresa' },
    { key: 'facebook', label: 'Facebook / Meta', placeholder: 'https://facebook.com/suaempresa' },
  ];
  const canAddShowcaseSection = showcaseForm.sections.length < 5;

  const handleReviewLinkInput = (key: keyof OwnerReviewLinks, value: string) => {
    setReviewLinksForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateShowcaseForm = (updates: Partial<CompanyShowcase>) => {
    setShowcaseForm((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleShowcaseSectionChange = (
    id: string,
    field: keyof CompanyShowcaseSection,
    value: string,
  ) => {
    setShowcaseForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === id ? { ...section, [field]: value } : section)),
    }));
  };

  const addShowcaseSection = () => {
    setShowcaseForm((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: generateSectionId(),
          title: '',
          description: '',
          emoji: '✨',
        },
      ],
    }));
  };

  const removeShowcaseSection = (id: string) => {
    setShowcaseForm((prev) => {
      const remaining = prev.sections.filter((section) => section.id !== id);
      return {
        ...prev,
        sections: remaining.length ? remaining : createDefaultShowcase().sections,
      };
    });
  };

  const handleShowcaseSave = async (event: FormEvent) => {
    event.preventDefault();
    setShowcaseStatus(null);
    setShowcaseSaving(true);

    const cleanedLinks = Object.entries(reviewLinksForm).reduce<OwnerReviewLinks>((acc, [key, value]) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          acc[key as keyof OwnerReviewLinks] = trimmed;
        }
      }
      return acc;
    }, {});

    const trimmedWebsite = (reviewLinksForm.website ?? '').trim();
    if (!trimmedWebsite && cleanedLinks.website) {
      delete cleanedLinks.website;
    }

    const sanitizedSections = showcaseForm.sections
      .map((section) => ({
        id: section.id || generateSectionId(),
        title: section.title?.trim() || '',
        description: section.description?.trim() || '',
        emoji: section.emoji?.trim() || '✨',
      }))
      .filter((section) => section.title || section.description);

    try {
      const payload = {
        companyWebsite: trimmedWebsite || null,
        reviewLinks: Object.keys(cleanedLinks).length ? cleanedLinks : null,
        companyShowcase: {
          headline: showcaseForm.headline?.trim() || undefined,
          description: showcaseForm.description?.trim() || undefined,
          layout: showcaseForm.layout,
          sections: sanitizedSections.length ? sanitizedSections : createDefaultShowcase().sections,
        },
      };

      const updated = await updateProfile(payload);
      setShowcaseForm(normalizeShowcase(updated.companyShowcase ?? null));
      setReviewLinksForm({
        google: updated.reviewLinks?.google ?? '',
        nextdoor: updated.reviewLinks?.nextdoor ?? '',
        instagram: updated.reviewLinks?.instagram ?? '',
        facebook: updated.reviewLinks?.facebook ?? '',
        website: updated.reviewLinks?.website ?? updated.companyWebsite ?? '',
      });
      setShowcaseStatus({ type: 'success', message: 'Personalização salva com sucesso.' });
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Não foi possível salvar as personalizações.';
      setShowcaseStatus({ type: 'error', message });
    } finally {
      setShowcaseSaving(false);
    }
  };

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

  useEffect(() => {
    if (activeTab === 'contracts') {
      fetchContracts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!clientes.length) return;
    setPortalAccessForm((prev) => {
      if (prev.customerId) {
        const current = clientes.find((cliente) => cliente.id === prev.customerId);
        return {
          ...prev,
          name: prev.name || current?.name || '',
          email: prev.email || current?.email || '',
        };
      }
      const first = clientes[0];
      return {
        customerId: first.id,
        name: first.name,
        email: first.email ?? '',
        password: '',
      };
    });
  }, [clientes]);

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

  const handlePortalAccessCustomerChange = (customerId: string) => {
    const selected = clientes.find((cliente) => cliente.id === customerId);
    setPortalAccessForm((prev) => ({
      ...prev,
      customerId,
      name: selected?.name ?? '',
      email: selected?.email ?? '',
    }));
    setPortalAccessError('');
    setPortalAccessMessage(null);
  };

  const handlePortalAccessSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!portalAccessForm.customerId || !portalAccessForm.email.trim()) {
      setPortalAccessError('Informe o cliente e o email.');
      return;
    }
    try {
      setPortalAccessSaving(true);
      setPortalAccessError('');
      const response = await teamApi.createClientPortalAccess(portalAccessForm.customerId, {
        email: portalAccessForm.email.trim(),
        name: portalAccessForm.name.trim() || undefined,
        password: portalAccessForm.password.trim() || undefined,
      });
      setPortalAccessMessage({
        email: response.user.email,
        password: response.temporaryPassword,
      });
      setPortalAccessForm((prev) => ({ ...prev, password: '' }));
      setClientes((prev) =>
        prev.map((cliente) =>
          cliente.id === portalAccessForm.customerId ? { ...cliente, email: response.user.email } : cliente,
        ),
      );
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível criar o acesso.';
      setPortalAccessError(message);
    } finally {
      setPortalAccessSaving(false);
    }
  };

  const handleCopyPortalPassword = async () => {
    if (!portalAccessMessage) return;
    try {
      await navigator.clipboard.writeText(portalAccessMessage.password);
    } catch (error) {
      console.error('Erro ao copiar senha temporária:', error);
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

  const handleWizardSubmit = async (blueprint: ContractBlueprint, action: 'send' | 'sign') => {
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
      const provisional = created.meta?.provisionalAccess;
      setWizardStatus({
        type: 'success',
        message:
          action === 'sign'
            ? 'Contrato assinado e arquivado no perfil do cliente.'
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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="rounded-[32px] border border-gray-100 bg-white shadow-[0_30px_60px_rgba(15,23,42,0.06)] px-6 py-6 lg:py-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2 text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Client success hub</p>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Central de clientes</h1>
            <p className="text-sm text-gray-500">
              Organize cadastros, contratos e acesso ao portal em um fluxo visual.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 bg-gray-100 rounded-full p-1">
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
                className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                  isActive ? 'bg-white text-gray-900 shadow' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Stats & quick actions */}
          <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-[28px] bg-gradient-to-br from-[#0d0b2d] via-[#181641] to-[#311858] text-white px-6 py-6 space-y-4 shadow-[0_25px_60px_rgba(15,23,42,0.35)]">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                <span>Clientes</span>
                <span className="text-white/30">•</span>
                <span>Portal + contratos</span>
              </div>
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-sm text-white/70">Cadastros totais</p>
                  <p className="text-4xl font-bold">{clientes.length}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Com acesso ao app</p>
                  <p className="text-2xl font-semibold">{customersWithPortal}</p>
                </div>
              </div>
              <p className="text-sm text-white/70">
                Conecte cada Client ao portal e automatize contratos e feedbacks.
              </p>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ações rápidas</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleExportClientes}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Exportar CSV
                </button>
                <button
                  onClick={openCreateModal}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 text-white px-4 py-3 text-sm font-semibold shadow-lg hover:bg-black"
                >
                  <Plus size={18} />
                  Novo cliente
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] bg-gradient-to-br from-[#090c22] via-[#101437] to-[#2a0f4a] text-white shadow-[0_30px_80px_rgba(7,11,30,0.45)] p-6 space-y-5">
            <button
              type="button"
              onClick={() => setPortalAccessOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Client portal access</p>
                <p className="text-lg font-semibold">
                  {customersWithPortal}/{clientes.length} clients já possuem login ativo
                </p>
                <p className="text-sm text-white/70">
                  Gere credenciais instantâneas e personalize o pop-up “Sua empresa parceira”.
                </p>
              </div>
              <ChevronDown
                className={`text-white/80 w-5 h-5 transition-transform ${portalAccessOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {portalAccessOpen && (
              <div className="space-y-5">
                <form
                  className="grid gap-3 md:grid-cols-[1.2fr,1fr,1fr,auto]"
                  onSubmit={handlePortalAccessSubmit}
                >
                  <select
                    value={portalAccessForm.customerId}
                    onChange={(e) => handlePortalAccessCustomerChange(e.target.value)}
                    className="px-3 py-2.5 rounded-2xl text-sm bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                    required
                  >
                    <option value="">Selecione o cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id} className="text-gray-900">
                        {cliente.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={portalAccessForm.name}
                    onChange={(e) => setPortalAccessForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome que aparecerá no app"
                    className="px-3 py-2.5 rounded-2xl text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  <input
                    type="email"
                    value={portalAccessForm.email}
                    onChange={(e) => setPortalAccessForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="email@cliente.com"
                    className="px-3 py-2.5 rounded-2xl text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                    required
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={portalAccessForm.password}
                      onChange={(e) => setPortalAccessForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Senha opcional"
                      className="flex-1 px-3 py-2.5 rounded-2xl text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    <button
                      type="submit"
                      disabled={portalAccessSaving}
                      className="px-4 py-2.5 rounded-2xl bg-white text-gray-900 text-sm font-semibold disabled:opacity-60"
                    >
                      {portalAccessSaving ? 'Gerando...' : 'Criar acesso'}
                    </button>
                  </div>
                </form>
                {portalAccessError && <p className="text-sm text-red-200">{portalAccessError}</p>}
                {portalAccessMessage && (
                  <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-sm text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold">Compartilhe com {portalAccessMessage.email}</p>
                      <p className="text-white/70">
                        Senha temporária: <span className="font-mono text-white">{portalAccessMessage.password}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPortalPassword}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/30 text-xs font-semibold"
                    >
                      Copiar senha
                    </button>
                  </div>
                )}
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowcasePanelOpen((prev) => !prev)}
                    className="flex items-center justify-between w-full text-sm font-semibold text-white"
                  >
                    <span>Personalizar pop-up “Sua empresa parceira”</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showcasePanelOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showcaseStatus && (
                    <div
                      className={`text-sm px-4 py-2 rounded-xl border ${
                        showcaseStatus.type === 'success'
                          ? 'bg-emerald-50/20 border-emerald-200 text-emerald-200'
                          : 'bg-red-50/20 border-red-200 text-red-200'
                      }`}
                    >
                      {showcaseStatus.message}
                    </div>
                  )}
                  {showcasePanelOpen && (
                    <form className="space-y-4 bg-white rounded-3xl p-4 text-gray-900" onSubmit={handleShowcaseSave}>
                      <div className="grid gap-3 md:grid-cols-2">
                        {reviewLinkFields.map((field) => (
                          <div key={field.key}>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">{field.label}</label>
                            <input
                              type="url"
                              value={reviewLinksForm[field.key] ?? ''}
                              onChange={(e) => handleReviewLinkInput(field.key, e.target.value)}
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder={field.placeholder}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Título principal</label>
                          <input
                            type="text"
                            value={showcaseForm.headline ?? ''}
                            onChange={(e) => updateShowcaseForm({ headline: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Ex: Nosso cuidado com seu lar"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Layout</label>
                          <select
                            value={showcaseForm.layout}
                            onChange={(e) => updateShowcaseForm({ layout: e.target.value as 'grid' | 'stacked' })}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="grid">Cartões lado a lado</option>
                            <option value="stacked">Blocos verticais</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Descrição</label>
                          <textarea
                            rows={3}
                            value={showcaseForm.description ?? ''}
                            onChange={(e) => updateShowcaseForm({ description: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Conte rapidamente qual a experiência que o cliente terá."
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        {showcaseForm.sections.map((section, index) => (
                          <div key={section.id} className="border border-gray-100 rounded-2xl p-3 space-y-2">
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={section.emoji ?? ''}
                                onChange={(e) => handleShowcaseSectionChange(section.id, 'emoji', e.target.value)}
                                className="w-14 px-2 py-2 border border-gray-200 rounded-xl text-center"
                                placeholder="✨"
                              />
                              <input
                                type="text"
                                value={section.title}
                                onChange={(e) => handleShowcaseSectionChange(section.id, 'title', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                placeholder={`Destaque ${index + 1}`}
                              />
                              {showcaseForm.sections.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeShowcaseSection(section.id)}
                                  className="text-gray-400 hover:text-red-500 text-sm"
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                            <textarea
                              rows={2}
                              value={section.description}
                              onChange={(e) => handleShowcaseSectionChange(section.id, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600"
                              placeholder="Descreva o benefício em uma frase."
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addShowcaseSection}
                          disabled={!canAddShowcaseSection}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600 disabled:opacity-50"
                        >
                          Adicionar destaque
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={showcaseSaving}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-60"
                      >
                        {showcaseSaving ? 'Salvando...' : 'Salvar personalização'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

      {/* Search */}
          <div className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou serviço..."
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
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                      isActive
                        ? 'bg-gray-900 text-white shadow'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

      {/* Table */}
      <div className="bg-white rounded-[32px] shadow-[0_25px_60px_rgba(15,23,42,0.08)] border border-gray-100 overflow-hidden">
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary-600 font-semibold">Contratos enviados</p>
                <p className="text-sm text-gray-500">Histórico de acordos digitais.</p>
              </div>
              <button
                type="button"
                onClick={handleNewContractClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <FileText size={16} />
                Criar novo contrato
              </button>
            </div>

            {contractsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando contratos...
              </div>
            ) : contracts.length ? (
              <div className="grid gap-4">
                {contracts.map((contract) => {
                  const blueprint = (contract.placeholders?.blueprint as ContractBlueprint | undefined) || null;
                  const serviceCount = blueprint ? getServicesFromBlueprint(blueprint).length : null;
                  return (
                    <div
                      key={contract.id}
                      className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{contract.title}</p>
                          <p className="text-xs text-gray-500">
                            {contract.client?.name || 'Cliente'} • Enviado em {formatContractDate(contract.createdAt)}
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
                          {downloadingContractId === contract.id ? 'Gerando...' : 'Baixar PDF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyContract(contract.body, contract.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          <Copy size={16} />
                          {copiedContractId === contract.id ? 'Copiado!' : 'Copiar texto'}
                        </button>
                        {contract.status === 'PENDENTE' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleContractStatusChange(contract.id, 'ACEITO')}
                              disabled={updatingContractId === contract.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 disabled:opacity-60"
                            >
                              <CheckCircle size={16} />
                              {updatingContractId === contract.id ? 'Atualizando...' : 'Marcar como aceito'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleContractStatusChange(contract.id, 'RECUSADO')}
                              disabled={updatingContractId === contract.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100 disabled:opacity-60"
                            >
                              <AlertTriangle size={16} />
                              {updatingContractId === contract.id ? 'Atualizando...' : 'Arquivar'}
                            </button>
                          </>
                        )}
                        {contract.status === 'ACEITO' && (
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

