import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Loader2,
  Sparkles,
  FileText,
  Star,
  Instagram,
  Facebook,
  Home,
  ExternalLink,
  Globe,
  CheckCircle,
  Download,
} from 'lucide-react';
import { clientPortalApi } from '../../services/api';
import type {
  ClientPortalSummary,
  ClientPreferences,
  CompanyShowcase,
  Contract,
  ContractBlueprint,
} from '../../types';

const formatCurrency = (value: number) =>
  Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const CONTRACT_STATUS_LABELS: Record<'PENDENTE' | 'ACEITO' | 'RECUSADO', string> = {
  PENDENTE: 'Pendente',
  ACEITO: 'Assinado',
  RECUSADO: 'Arquivado',
};

const CONTRACT_STATUS_BADGES: Record<'PENDENTE' | 'ACEITO' | 'RECUSADO', string> = {
  PENDENTE: 'bg-amber-50 text-amber-600 border border-amber-100',
  ACEITO: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  RECUSADO: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const FOCUS_AREAS = ['Cozinha', 'Banheiro', 'Quartos', 'Sala', 'Área externa', 'Detalhes finos'];
const FRAGRANCE_OPTIONS = ['Cítrico', 'Lavanda', 'Neutro', 'Sem perfume'];
const GALLERY_PLACEHOLDERS = [
  {
    title: 'Brilho na cozinha',
    caption: 'Pia e bancadas higienizadas',
    url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60',
  },
  {
    title: 'Sala aconchegante',
    caption: 'Organização e aromatização leve',
    url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=60',
  },
];
const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'contrato';
const DEFAULT_SHOWCASE: CompanyShowcase = {
  headline: 'Por que confiar na nossa equipe?',
  description: 'Checklists transparentes, comunicação clara e atendimento premium em cada visita.',
  layout: 'grid',
  sections: [
    {
      id: 'trust',
      title: 'Equipe verificada',
      description: 'Profissionais treinados, uniformizados e com background check.',
      emoji: '🛡️',
    },
    {
      id: 'detail',
      title: 'Olho nos detalhes',
      description: 'Checklist inteligente para cada cômodo da sua casa.',
      emoji: '✨',
    },
    {
      id: 'communication',
      title: 'Comunicação rápida',
      description: 'Você recebe atualizações pelo app e WhatsApp.',
      emoji: '💬',
    },
  ],
};
const BLUEPRINT_FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly',
  MONTHLY: 'Monthly',
  ONE_TIME: 'One-time',
};
const BLUEPRINT_SERVICE_LABELS: Record<string, string> = {
  dusting: 'Dusting',
  vacuuming: 'Vacuuming',
  mopping: 'Mopping',
  kitchenExterior: 'Kitchen exterior cleaning',
  bathroom: 'Bathroom sanitizing',
  trash: 'Trash removal',
  baseboards: 'Baseboards',
  insideFridge: 'Inside fridge',
  insideOven: 'Inside oven',
  windows: 'Windows tracks',
  highDusting: 'High dusting',
};

const extractBlueprint = (contract?: Contract | null): ContractBlueprint | null => {
  if (!contract?.placeholders) return null;
  const rawBlueprint: unknown =
    (contract.placeholders as Record<string, unknown> | undefined)?.blueprint ?? contract.placeholders;
  if (!rawBlueprint || typeof rawBlueprint !== 'object') {
    return null;
  }
  return rawBlueprint as ContractBlueprint;
};

const getBlueprintServices = (blueprint?: ContractBlueprint | null) => {
  if (!blueprint?.services) return [];
  const {
    standard = {},
    deep = {},
    custom = [],
    addons = [],
  } = blueprint.services || { standard: {}, deep: {}, custom: [], addons: [] };
  const items: string[] = [];
  Object.entries(standard).forEach(([key, value]) => {
    if (value) items.push(BLUEPRINT_SERVICE_LABELS[key] ?? key);
  });
  Object.entries(deep).forEach(([key, value]) => {
    if (value) items.push(BLUEPRINT_SERVICE_LABELS[key] ?? key);
  });
  const extraAddons = addons.map((addon) => `${addon.label} (+${usdFormatter.format(addon.price)})`);
  return [...items, ...custom, ...extraAddons];
};

const getBlueprintAddons = (blueprint?: ContractBlueprint | null) => blueprint?.services?.addons ?? [];

const ClientHome = () => {
  const [data, setData] = useState<ClientPortalSummary | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [error, setError] = useState('');
  const [contractsError, setContractsError] = useState('');
  const [reviewContract, setReviewContract] = useState<Contract | null>(null);
  const [contractNotes, setContractNotes] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<ClientPreferences>({
    focusAreas: [],
    fragrance: 'Cítrico',
    notes: '',
  });
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState('');
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [downloadingContractId, setDownloadingContractId] = useState<string | null>(null);
  const reviewBlueprint = reviewContract ? extractBlueprint(reviewContract) : null;
  const reviewAddonList = reviewBlueprint ? getBlueprintAddons(reviewBlueprint) : [];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await clientPortalApi.getHome();
        setData(response);
      } catch (err: any) {
        const message = err?.response?.data?.error || 'Não foi possível carregar suas limpezas.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadContracts = async () => {
      setContractsLoading(true);
      setContractsError('');
      try {
        const response = await clientPortalApi.getContracts();
        setContracts(response);
      } catch (err: any) {
        const message = err?.response?.data?.error || 'Não foi possível carregar seus contratos.';
        setContractsError(message);
      } finally {
        setContractsLoading(false);
      }
    };
    loadContracts();
  }, []);

  const nextAppointment = data?.upcoming[0];
  const pendingContract = useMemo(
    () => contracts.find((contract) => contract.status === 'PENDENTE'),
    [contracts],
  );
  const pendingBlueprint = pendingContract ? extractBlueprint(pendingContract) : null;
  const pendingAddonList = pendingBlueprint ? getBlueprintAddons(pendingBlueprint) : [];
  const lastAcceptedContract = useMemo(
    () =>
      contracts
        .filter((contract) => contract.status === 'ACEITO')
        .sort(
          (a, b) =>
            new Date(b.acceptedAt ?? b.createdAt).getTime() - new Date(a.acceptedAt ?? a.createdAt).getTime(),
        )[0],
    [contracts],
  );
  const lastAcceptedBlueprint = lastAcceptedContract ? extractBlueprint(lastAcceptedContract) : null;
  const lastAcceptedAddonList = lastAcceptedBlueprint ? getBlueprintAddons(lastAcceptedBlueprint) : [];
  const firstName = useMemo(() => {
    const fullName = data?.customer?.name;
    if (!fullName) return 'cliente';
    return fullName.split(' ')[0];
  }, [data?.customer?.name]);
  const quickStats = useMemo(
    () => [
      {
        label: 'Visitas concluídas',
        value: data?.history.length ?? 0,
        sublabel: 'nos últimos meses',
      },
      {
        label: 'Próximas confirmações',
        value: data?.upcoming.length ?? 0,
        sublabel: 'agendadas',
      },
      {
        label: 'Pendências',
        value: pendingContract ? 1 : 0,
        sublabel: pendingContract ? 'Contrato aguardando' : 'Tudo em dia',
      },
    ],
    [data?.history.length, data?.upcoming.length, pendingContract],
  );
  const companyName = data?.customer?.companyName ?? 'Equipe Client Up';
  const companyLogo = data?.customer?.avatarUrl ?? undefined;
  const companyInitials = useMemo(() => {
    if (!companyName) return 'CP';
    const parts = companyName.split(' ').filter(Boolean);
    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'CP';
  }, [companyName]);
  const reviewLinks = data?.customer?.reviewLinks || {};
  const websiteLink = data?.customer?.companyWebsite || reviewLinks.website || null;
  const companyShowcase = useMemo(() => {
    if (data?.customer?.companyShowcase && data.customer.companyShowcase.sections?.length) {
      return data.customer.companyShowcase;
    }
    return DEFAULT_SHOWCASE;
  }, [data?.customer?.companyShowcase]);
  const showcaseSections = companyShowcase.sections;
  const showcaseLayout = companyShowcase.layout === 'stacked' ? 'stacked' : 'grid';
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
  const handleDownloadPdf = async (contractId: string, title: string) => {
    try {
      setContractsError('');
      setDownloadingContractId(contractId);
      const blob = await clientPortalApi.downloadContractPdf(contractId);
      triggerDownload(blob, `${slugify(title)}.pdf`);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível gerar o PDF agora.';
      setContractsError(message);
    } finally {
      setDownloadingContractId(null);
    }
  };
  const reviewActions = useMemo(
    () => [
      {
        key: 'website',
        label: 'Visitar site',
        description: 'Conheça nossos planos, políticas e diferenciais.',
        icon: Globe,
        accent: 'text-primary-600',
        href: websiteLink,
      },
      {
        key: 'google',
        label: 'Avaliar no Google',
        description: 'Ajude outras famílias contando sua experiência.',
        icon: Star,
        accent: 'text-amber-500',
        href: reviewLinks.google,
      },
      {
        key: 'nextdoor',
        label: 'Indicar no Nextdoor',
        description: 'Compartilhe com seus vizinhos na comunidade.',
        icon: Home,
        accent: 'text-emerald-600',
        href: reviewLinks.nextdoor,
      },
      {
        key: 'instagram',
        label: 'Instagram da equipe',
        description: 'Veja bastidores e novidades do time.',
        icon: Instagram,
        accent: 'text-pink-500',
        href: reviewLinks.instagram,
      },
      {
        key: 'facebook',
        label: 'Facebook / Meta',
        description: 'Deixe um comentário rápido por lá.',
        icon: Facebook,
        accent: 'text-sky-600',
        href: reviewLinks.facebook,
      },
    ],
    [reviewLinks, websiteLink],
  );

  const notifications = useMemo(() => {
    const items: Array<{ title: string; body: string; accent: string }> = [];
    if (pendingContract) {
      items.push({
        title: 'Contrato aguardando',
        body: 'Revise e aceite o contrato para liberar novas visitas.',
        accent: 'border-amber-200 bg-amber-50 text-amber-800',
      });
    }
    if (nextAppointment) {
      items.push({
        title: 'Próxima limpeza',
        body: `Agendada para ${new Date(nextAppointment.date).toLocaleDateString('pt-BR')} às ${nextAppointment.startTime}.`,
        accent: 'border-primary-200 bg-primary-50 text-primary-800',
      });
    }
    if (!data?.history.length) {
      items.push({
        title: 'Dica rápida',
        body: 'Registre suas preferências para personalizarmos cada visita.',
        accent: 'border-sky-200 bg-sky-50 text-sky-800',
      });
    }
    if (!items.length) {
      items.push({
        title: 'Tudo certo!',
        body: 'Não há pendências no momento. Aproveite seu dia ✨',
        accent: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      });
    }
    return items;
  }, [pendingContract, nextAppointment, data?.history.length]);

  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string;
      date: string;
      title: string;
      description: string;
      type: 'upcoming' | 'history' | 'contract';
    }> = [];
    (data?.upcoming ?? []).forEach((appointment) =>
      events.push({
        id: `upcoming-${appointment.id}`,
        date: appointment.date,
        title: 'Limpeza agendada',
        description: `${appointment.serviceType ?? 'Serviço'} • ${appointment.startTime}`,
        type: 'upcoming',
      }),
    );
    (data?.history ?? []).forEach((appointment) =>
      events.push({
        id: `history-${appointment.id}`,
        date: appointment.date,
        title: 'Limpeza realizada',
        description: appointment.helperName
          ? `Helper: ${appointment.helperName}`
          : 'Equipe dedicada no local',
        type: 'history',
      }),
    );
    contracts.forEach((contract) =>
      events.push({
        id: `contract-${contract.id}`,
        date: contract.createdAt,
        title: 'Contrato',
        description:
          contract.status === 'ACEITO'
            ? 'Contrato aceito por você.'
            : contract.status === 'PENDENTE'
              ? 'Aguardando sua confirmação.'
              : 'Contrato arquivado.',
        type: 'contract',
      }),
    );
    return events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [data?.upcoming, data?.history, contracts]);

  const galleryItems = useMemo(() => {
    if (data?.history.length) {
      return data.history.slice(0, 2).map((appointment, index) => ({
        title: appointment.serviceType ?? 'Serviço concluído',
        caption: appointment.notes?.slice(0, 80) ?? 'Ambiente finalizado com capricho.',
        url: GALLERY_PLACEHOLDERS[index % GALLERY_PLACEHOLDERS.length].url,
      }));
    }
    return GALLERY_PLACEHOLDERS;
  }, [data?.history]);

  const toggleFocusArea = (area: string) => {
    setPreferences((prev) => {
      const exists = prev.focusAreas.includes(area);
      return {
        ...prev,
        focusAreas: exists ? prev.focusAreas.filter((item) => item !== area) : [...prev.focusAreas, area],
      };
    });
  };

  const handleSavePreferences = async () => {
    try {
      setPreferencesSaving(true);
      setPreferencesMessage('');
      await clientPortalApi.updatePreferences(preferences);
      setPreferencesMessage('Preferências salvas!');
      setTimeout(() => setPreferencesMessage(''), 2500);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível salvar.';
      setPreferencesMessage(message);
    } finally {
      setPreferencesSaving(false);
    }
  };

  useEffect(() => {
    if (data?.customer?.preferences) {
      setPreferences({
        focusAreas: data.customer.preferences.focusAreas ?? [],
        fragrance: data.customer.preferences.fragrance ?? 'Cítrico',
        notes: data.customer.preferences.notes ?? '',
      });
    }
  }, [data?.customer?.preferences]);

  const handleAcceptContract = async () => {
    if (!reviewContract) return;
    try {
      setAccepting(true);
      const updated = await clientPortalApi.acceptContract(reviewContract.id, contractNotes.trim() || undefined);
      setContracts((prev) => prev.map((contract) => (contract.id === updated.id ? updated : contract)));
      setReviewContract(null);
      setContractNotes('');
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível aceitar o contrato.';
      alert(message);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl">{error}</div>
      ) : (
        <>
          <section className="rounded-[32px] border border-gray-100 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.08)] p-6 lg:p-8 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
                  Portal do cliente
                </p>
                <h1 className="text-3xl font-bold text-gray-900">Olá, {firstName}! 👋</h1>
                <p className="text-sm text-gray-600">
                  {nextAppointment
                    ? 'Sua próxima visita já está confirmada. Veja os detalhes e personalize suas preferências.'
                    : 'Assim que uma nova limpeza for agendada, avisaremos por aqui e por SMS.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {quickStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex-1 min-w-[140px] rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.sublabel}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {notifications.slice(0, 2).map((notification, index) => (
                  <div
                    key={`${notification.title}-chip-${index}`}
                    className="px-3 py-2 rounded-full text-xs font-semibold bg-gray-900 text-white"
                  >
                    {notification.title}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[30px] border border-white/10 bg-[#15173a] text-white p-6 space-y-4 shadow-[0_15px_35px_rgba(15,23,42,0.25)] md:border-none md:bg-gradient-to-br md:from-[#0d0b2d] md:via-[#191545] md:to-[#311859] md:shadow-[0_25px_60px_rgba(15,23,42,0.4)]">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Resumo rápido</p>
                <p className="text-2xl font-semibold">
                  {nextAppointment
                    ? new Date(nextAppointment.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                      })
                    : 'Sem visita agendada'}
                </p>
                <p className="text-sm text-white/80">
                  {nextAppointment ? `Horário previsto ${nextAppointment.startTime}` : 'Aguardando confirmação.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 border border-white/20 p-3">
                  <p className="text-xs uppercase tracking-wide font-semibold text-white/60">Serviço</p>
                  <p className="text-lg font-semibold">
                    {nextAppointment?.serviceType ?? data?.customer?.serviceType ?? 'Personalizado'}
                  </p>
                  <p className="text-xs text-white/70 mt-1">
                    {nextAppointment?.helperName
                      ? `Responsável: ${nextAppointment.helperName}`
                      : 'Equipe dedicada da sua empresa parceira.'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/20 p-3">
                  <p className="text-xs uppercase tracking-wide font-semibold text-white/60">Status geral</p>
                  <p className="text-lg font-semibold">
                    {pendingContract ? 'Contrato aguardando' : 'Tudo em dia ✨'}
                  </p>
                  <p className="text-xs text-white/70 mt-1">
                    {pendingContract
                      ? 'Revise o contrato para liberar novas visitas.'
                      : 'Nenhuma pendência registrada.'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/20 p-3">
                <p className="text-xs uppercase tracking-wide font-semibold text-white/60">Mensal</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(nextAppointment?.price ?? lastAcceptedBlueprint?.payment.amount ?? 0)}
                </p>
                <p className="text-xs text-white/70 mt-1">Valor estimado por visita do seu plano</p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {data?.customer && (
              <div className="rounded-[28px] border border-gray-100 bg-gradient-to-br from-[#f7f8fc] via-white to-[#fdfbff] shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-3xl bg-gray-900 text-white flex items-center justify-center overflow-hidden">
                    {companyLogo ? (
                      <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-semibold">{companyInitials}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Sua empresa parceira</p>
                    <p className="text-lg font-bold text-gray-900">{companyName}</p>
                    <p className="text-xs text-gray-500">
                      Administradora: <span className="font-semibold">{data.customer.ownerName ?? 'Equipe dedicada'}</span>
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-2">
                  {data.customer.contactPhone && (
                    <a
                      href={`tel:${data.customer.contactPhone}`}
                      className="px-4 py-2 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
                    >
                      Ligar
                    </a>
                  )}
                  {data.customer.whatsappNumber && (
                    <a
                      href={`https://wa.me/${data.customer.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-2xl border border-primary-200 text-sm font-semibold text-primary-700 hover:bg-primary-50 text-center"
                    >
                      WhatsApp
                    </a>
                  )}
                  {websiteLink && (
                    <a
                      href={websiteLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
                    >
                      Site
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCompanyModalOpen(true)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-primary-600"
                >
                  Ver detalhes da empresa
                  <ExternalLink size={14} />
                </button>
              </div>
            )}

            <div className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  <FileText size={16} /> Contrato de serviço
                </div>
                {(pendingContract || lastAcceptedContract) && (
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-semibold ${
                      CONTRACT_STATUS_BADGES[pendingContract ? pendingContract.status : lastAcceptedContract!.status]
                    }`}
                  >
                    {CONTRACT_STATUS_LABELS[pendingContract ? pendingContract.status : lastAcceptedContract!.status]}
                  </span>
                )}
              </div>
              {contractsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                </div>
              ) : contractsError ? (
                <p className="text-sm text-red-600">{contractsError}</p>
              ) : pendingContract ? (
                <div className="space-y-3">
                  {pendingBlueprint && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>
                        Frequência:{' '}
                        <span className="font-semibold text-gray-900">
                          {BLUEPRINT_FREQUENCY_LABELS[pendingBlueprint.client.frequency] ||
                            pendingBlueprint.client.frequency}
                        </span>
                      </p>
                      <p>
                        Valor:{' '}
                        <span className="font-semibold text-gray-900">
                          {usdFormatter.format(pendingBlueprint.payment.amount)} por visita
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {getBlueprintServices(pendingBlueprint).length} itens incluídos
                      </p>
                      {pendingAddonList.length > 0 && (
                        <div className="space-y-0.5 text-[11px] text-gray-500">
                          <p className="font-semibold text-gray-700">Extras pagos:</p>
                          {pendingAddonList.map((addon) => (
                            <p key={addon.id}>
                              {addon.label} (+{usdFormatter.format(addon.price)})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-600">
                    Você tem um novo acordo aguardando confirmação. Revise os detalhes e aceite para liberar todos os recursos.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewContract(pendingContract)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
                    >
                      Revisar e aceitar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(pendingContract.id, pendingContract.title)}
                      disabled={downloadingContractId === pendingContract.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <Download size={16} />
                      {downloadingContractId === pendingContract.id ? 'Gerando...' : 'Baixar PDF'}
                    </button>
                  </div>
                </div>
              ) : lastAcceptedContract ? (
                <div className="space-y-2">
                  {lastAcceptedBlueprint && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>
                        Frequência:{' '}
                        <span className="font-semibold text-gray-900">
                          {BLUEPRINT_FREQUENCY_LABELS[lastAcceptedBlueprint.client.frequency] ||
                            lastAcceptedBlueprint.client.frequency}
                        </span>
                      </p>
                      <p>
                        Último valor:{' '}
                        <span className="font-semibold text-gray-900">
                          {usdFormatter.format(lastAcceptedBlueprint.payment.amount)} por visita
                        </span>
                      </p>
                      {lastAcceptedAddonList.length > 0 && (
                        <div className="space-y-0.5 text-[11px] text-gray-500">
                          <p className="font-semibold text-gray-700">Extras pagos:</p>
                          {lastAcceptedAddonList.map((addon) => (
                            <p key={addon.id}>
                              {addon.label} (+{usdFormatter.format(addon.price)})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-sm font-semibold text-gray-900">{lastAcceptedContract.title}</p>
                  <p className="text-xs text-gray-500">
                    Aceito em{' '}
                    {new Date(lastAcceptedContract.acceptedAt ?? lastAcceptedContract.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewContract(lastAcceptedContract)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Ver documento
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(lastAcceptedContract.id, lastAcceptedContract.title)}
                      disabled={downloadingContractId === lastAcceptedContract.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <Download size={16} />
                      {downloadingContractId === lastAcceptedContract.id ? 'Gerando...' : 'Baixar PDF'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Assim que um contrato for disponibilizado, você poderá aceitar por aqui.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Timeline das visitas</h3>
                <span className="text-xs text-gray-500">Últimos movimentos</span>
              </div>
              <div className="space-y-4">
                {timelineEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        event.type === 'upcoming'
                          ? 'bg-primary-50 text-primary-700'
                          : event.type === 'history'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {event.type === 'upcoming' ? '🗓️' : event.type === 'history' ? '✨' : '📄'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleDateString('pt-BR')} • {event.description}
                      </p>
                    </div>
                  </div>
                ))}
                {!timelineEvents.length && (
                  <p className="text-sm text-gray-500">Sem eventos recentes.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Notificações rápidas</h3>
              <div className="space-y-3">
                {notifications.map((notification, index) => (
                  <div
                    key={`${notification.title}-${index}`}
                    className={`px-4 py-3 rounded-2xl border ${notification.accent}`}
                  >
                    <p className="text-sm font-semibold">{notification.title}</p>
                    <p className="text-xs">{notification.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Highlights visuais</h3>
                <span className="text-xs text-gray-500">Em breve: fotos reais da sua casa</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {galleryItems.map((item, index) => (
                  <div key={index} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <img src={item.url} alt={item.title} className="w-full h-36 object-cover" />
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Suas preferências</h3>
                {preferencesMessage && <span className="text-xs text-primary-600">{preferencesMessage}</span>}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Áreas de foco</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {FOCUS_AREAS.map((area) => {
                      const selected = preferences.focusAreas.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => toggleFocusArea(area)}
                          className={`px-4 py-2 rounded-2xl text-sm font-semibold border transition ${
                            selected
                              ? 'bg-primary-50 text-primary-700 border-primary-200'
                              : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fragrância preferida</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {FRAGRANCE_OPTIONS.map((option) => {
                      const selected = preferences.fragrance === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setPreferences((prev) => ({ ...prev, fragrance: option }))}
                          className={`px-4 py-2 rounded-2xl text-sm font-semibold border transition ${
                            selected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Observações extras</p>
                  <textarea
                    rows={3}
                    value={preferences.notes}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full mt-2 px-3 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Ex: atenção ao quarto das crianças, aromatizador suave..."
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={preferencesSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {preferencesSaving ? 'Salvando...' : 'Salvar preferências'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="inline-flex items-center gap-2 text-primary-600 text-sm font-semibold uppercase tracking-wide">
                <Calendar size={16} /> Próximas limpezas
              </div>
              {data?.upcoming.length ? (
                <div className="space-y-3">
                  {data.upcoming.map((appointment) => (
                    <div key={appointment.id} className="p-3 rounded-2xl bg-primary-50/60 border border-primary-100">
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(appointment.date).toLocaleDateString('pt-BR')} — {appointment.startTime}
                      </p>
                      <p className="text-xs text-gray-500">
                        {appointment.serviceType ?? 'Serviço recorrente'} • {formatCurrency(appointment.price)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Você não possui limpezas futuras no momento.</p>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="inline-flex items-center gap-2 text-primary-600 text-sm font-semibold uppercase tracking-wide">
                <Sparkles size={16} /> Últimas visitas
              </div>
              {data?.history.length ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {data.history.map((appointment) => (
                    <div key={appointment.id} className="p-3 rounded-2xl border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(appointment.date).toLocaleDateString('pt-BR')} — {appointment.startTime}
                      </p>
                      <p className="text-xs text-gray-500">
                        {appointment.serviceType ?? 'Serviço'} • {appointment.helperName ? `Helper: ${appointment.helperName}` : 'Equipe padrão'}
                      </p>
                      <p className="text-xs text-gray-500">Status: {appointment.status}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Ainda não temos histórico registrado.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Gostou do atendimento?</p>
              <p className="text-sm text-gray-500">Clique em uma reação para nos contar como foi sua experiência.</p>
            </div>
            <div className="flex gap-2">
              {['😍', '👍', '😐'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedReaction(emoji)}
                  className={`px-4 py-2 rounded-2xl border text-lg ${
                    selectedReaction === emoji
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {companyModalOpen && data?.customer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur" onClick={() => setCompanyModalOpen(false)} />
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute right-5 top-5 text-white/80 hover:text-white bg-black/20 rounded-full w-8 h-8 flex items-center justify-center"
              onClick={() => setCompanyModalOpen(false)}
            >
              ✕
            </button>
            <div className="rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 text-white p-5 space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden border border-white/30">
                    {companyLogo ? (
                      <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold text-white">{companyInitials}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/80 font-semibold">Sua empresa parceira</p>
                    <p className="text-2xl font-bold">{companyName}</p>
                    <p className="text-xs text-white/80">
                      Administradora: <span className="font-semibold">{data.customer.ownerName ?? 'Equipe dedicada'}</span>
                    </p>
                    {companyShowcase.headline && (
                      <p className="text-sm text-white mt-1">{companyShowcase.headline}</p>
                    )}
                  </div>
                </div>
                {websiteLink && (
                  <a
                    href={websiteLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 border border-white/30 text-sm font-semibold text-white hover:bg-white/20"
                  >
                    <Globe size={16} />
                    Visitar site
                  </a>
                )}
              </div>
              <div>
                <p className="text-sm text-white/80">{companyShowcase.description}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">Contato direto</p>
                <div className="space-y-2 text-sm text-gray-600">
                  {data.customer.contactPhone && (
                    <a
                      href={`tel:${data.customer.contactPhone}`}
                      className="flex items-center justify-between px-3 py-2 rounded-2xl border border-gray-200 hover:bg-gray-50"
                    >
                      <span>Telefone</span>
                      <span className="font-semibold text-gray-900">{data.customer.contactPhone}</span>
                    </a>
                  )}
                  {data.customer.whatsappNumber && (
                    <a
                      href={`https://wa.me/${data.customer.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-2xl border border-primary-100 text-primary-700 hover:bg-primary-50"
                    >
                      <span>WhatsApp</span>
                      <span className="font-semibold">{data.customer.whatsappNumber}</span>
                    </a>
                  )}
                  {data.customer.contactEmail && (
                    <a
                      href={`mailto:${data.customer.contactEmail}`}
                      className="flex items-center justify-between px-3 py-2 rounded-2xl border border-gray-200 hover:bg-gray-50"
                    >
                      <span>Email</span>
                      <span className="font-semibold text-gray-900">{data.customer.contactEmail}</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">Links e feedbacks</p>
                <div className="space-y-2">
                  {reviewActions.map((action) =>
                    action.href ? (
                      <a
                        key={action.key}
                        href={action.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 px-3 py-2 rounded-2xl border border-gray-200 hover:bg-gray-50"
                      >
                        <span className={action.accent}>
                          <action.icon size={18} />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                          <p className="text-xs text-gray-500">{action.description}</p>
                        </div>
                        <ExternalLink size={16} className="text-gray-400" />
                      </a>
                    ) : (
                      <div
                        key={action.key}
                        className="flex items-center gap-3 px-3 py-2 rounded-2xl border border-dashed border-gray-200 text-gray-400"
                      >
                        <span className={action.accent}>
                          <action.icon size={18} />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">Em breve</p>
                          <p className="text-xs">Peça ao time para adicionar o link do {action.label}.</p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div
              className={`grid gap-3 ${
                showcaseLayout === 'stacked' ? 'grid-cols-1' : 'md:grid-cols-2'
              }`}
            >
              {showcaseSections.map((section) => (
                <div key={section.id} className="border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="text-2xl">{section.emoji ?? '✨'}</div>
                  <p className="text-sm font-semibold text-gray-900 mt-2">{section.title}</p>
                  <p className="text-xs text-gray-500">{section.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-primary-50 rounded-2xl p-4 text-sm text-primary-800 border border-primary-100">
              Lembrete: avaliações no Google e Nextdoor ajudam outros clientes a confiarem no seu time favorito.
            </div>
          </div>
        </div>
      )}

      {reviewContract && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur" onClick={() => setReviewContract(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{reviewContract.title}</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setReviewContract(null)}>
                ✕
              </button>
            </div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Status: {CONTRACT_STATUS_LABELS[reviewContract.status]}
            </p>
            {reviewBlueprint ? (
              <div className="space-y-4">
                <div
                  className="rounded-2xl text-white p-4"
                  style={{ background: reviewBlueprint.brand.accentColor || '#22c55e' }}
                >
                  <p className="text-xs uppercase tracking-wide opacity-80">Resumo do plano</p>
                  <p className="text-lg font-semibold">{reviewBlueprint.client.name}</p>
                  <p className="text-sm">
                    {BLUEPRINT_FREQUENCY_LABELS[reviewBlueprint.client.frequency] || reviewBlueprint.client.frequency} •{' '}
                    {usdFormatter.format(reviewBlueprint.payment.amount)} por visita
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Início</p>
                    <p className="font-semibold">{reviewBlueprint.startDate || 'A combinar'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Pagamento</p>
                    <p className="font-semibold">{reviewBlueprint.payment.billingType.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">
                      Aceitamos {reviewBlueprint.payment.paymentMethods.join(', ')}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">O que está incluído</p>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1 max-h-48 overflow-y-auto">
                    {getBlueprintServices(reviewBlueprint).map((service) => (
                      <p key={service} className="text-sm text-gray-700 flex items-center gap-2">
                        <CheckCircle size={14} className="text-emerald-500" />
                        {service}
                      </p>
                    ))}
                  </div>
                </div>
                {reviewAddonList.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">Extras com valor adicional</p>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                      {reviewAddonList.map((addon) => (
                        <p key={addon.id} className="text-sm text-gray-700 flex items-center justify-between">
                          <span>{addon.label}</span>
                          <span className="font-semibold">{usdFormatter.format(addon.price)}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3 text-xs text-gray-600">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-semibold text-gray-900 text-sm mb-1">Política de atraso</p>
                    <p>{reviewBlueprint.payment.latePolicy || 'Cobrança padrão da equipe.'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-semibold text-gray-900 text-sm mb-1">Cancelamentos</p>
                    <p>{reviewBlueprint.cancellation}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900 mb-1">Acesso combinado</p>
                  <p>
                    {reviewBlueprint.access.method === 'DOOR_CODE'
                      ? 'Código de portaria'
                      : reviewBlueprint.access.method === 'KEY'
                        ? 'Chave / lockbox'
                        : reviewBlueprint.access.method === 'GARAGE'
                          ? 'Código da garagem'
                          : 'Alguém estará em casa'}
                  </p>
                  {reviewBlueprint.access.notes && <p className="text-xs text-gray-500 mt-1">{reviewBlueprint.access.notes}</p>}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-700 whitespace-pre-line">
                {reviewContract.body}
              </div>
            )}
            <button
              type="button"
              onClick={() => handleDownloadPdf(reviewContract.id, reviewContract.title)}
              disabled={downloadingContractId === reviewContract.id}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 disabled:opacity-60"
            >
              <Download size={16} />
              {downloadingContractId === reviewContract.id ? 'Gerando PDF...' : 'Baixar PDF'}
            </button>
            {reviewContract.gallery && reviewContract.gallery.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3">
                {reviewContract.gallery.map((item, index) => (
                  <a
                    key={index}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl overflow-hidden border border-gray-100"
                  >
                    <img src={item.url} alt={item.caption ?? `Galeria ${index + 1}`} className="w-full h-40 object-cover" />
                    {item.caption && (
                      <p className="text-xs text-gray-500 p-2">{item.caption}</p>
                    )}
                  </a>
                ))}
              </div>
            )}
            {reviewContract.status === 'PENDENTE' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Observações (opcional)</label>
                <textarea
                  rows={3}
                  value={contractNotes}
                  onChange={(e) => setContractNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Gostaria que trouxessem atenção especial à cozinha..."
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewContract(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700"
              >
                Fechar
              </button>
              {reviewContract.status === 'PENDENTE' && (
                <button
                  type="button"
                  onClick={handleAcceptContract}
                  disabled={accepting}
                  className="px-4 py-2 rounded-xl bg-primary-600 text-white font-semibold disabled:opacity-60"
                >
                  {accepting ? 'Confirmando...' : 'Aceitar contrato'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientHome;

