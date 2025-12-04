import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronDown,
  Loader2,
  Mail,
  MessageCircle,
  Navigation2,
  Phone,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { customersApi, teamApi, type CreateHelperPayload } from '../services/api';
import type { CompanyShowcase, CompanyShowcaseSection, Customer, HelperAppointment, HelperDayResponse, OwnerReviewLinks, User } from '../types';
import { useRegisterQuickAction } from '../contexts/QuickActionContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

const generateSectionId = () => Math.random().toString(36).substring(2, 10);

const createDefaultShowcase = (): CompanyShowcase => ({
  headline: 'Sua empresa parceira',
  description: 'Explique rapidamente por que seu serviço é a escolha certa para o cliente.',
  layout: 'grid',
  sections: [
    {
      id: generateSectionId(),
      title: 'Limpezas premium',
      description: 'Equipe fixa, supervisão periódica e materiais inclusos.',
      emoji: '✨',
    },
    {
      id: generateSectionId(),
      title: 'Planos flexíveis',
      description: 'Atendimentos semanais, quinzenais ou sob demanda.',
      emoji: '🗓️',
    },
  ],
});

const normalizeShowcase = (showcase?: CompanyShowcase | null): CompanyShowcase => {
  const fallback = createDefaultShowcase();
  if (!showcase) return fallback;
  return {
    headline: showcase.headline ?? fallback.headline,
    description: showcase.description ?? fallback.description,
    layout: showcase.layout === 'stacked' ? 'stacked' : 'grid',
    sections:
      Array.isArray(showcase.sections) && showcase.sections.length
        ? showcase.sections.map((section) => ({
            id: section.id ?? generateSectionId(),
            title: section.title ?? '',
            description: section.description ?? '',
            emoji: section.emoji ?? '✨',
          }))
        : fallback.sections,
  };
};

const roleLabels: Record<string, string> = {
  OWNER: 'Administradora',
  HELPER: 'Helper',
  CLIENT: 'Cliente',
};

const normalizePhone = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length ? digits : null;
};

type DayKey = 'today' | 'tomorrow';

const Team = () => {
  const { user, updateProfile } = useAuth();
  const location = useLocation();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CreateHelperPayload>({
    name: '',
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedHelperId, setExpandedHelperId] = useState<string | null>(null);
  const [helperDayData, setHelperDayData] = useState<
    Record<string, Record<DayKey, { loading: boolean; data: HelperDayResponse | null; error: string }>>
  >({});
  const [helperSelectedDay, setHelperSelectedDay] = useState<Record<string, DayKey>>({});
  const [newChecklistTitles, setNewChecklistTitles] = useState<Record<string, string>>({});
  const [checklistActionId, setChecklistActionId] = useState<string | null>(null);
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [notesSavingId, setNotesSavingId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [portalAccessForm, setPortalAccessForm] = useState({
    customerId: '',
    name: '',
    email: '',
    password: '',
  });
  const [portalAccessSaving, setPortalAccessSaving] = useState(false);
  const [portalAccessMessage, setPortalAccessMessage] = useState<{ email: string; password: string } | null>(null);
  const [portalAccessError, setPortalAccessError] = useState('');
  const [portalAccessOpen, setPortalAccessOpen] = useState(false);
  const [showcasePanelOpen, setShowcasePanelOpen] = useState(false);
  const [reviewLinksForm, setReviewLinksForm] = useState<OwnerReviewLinks>({
    google: user?.reviewLinks?.google ?? '',
    nextdoor: user?.reviewLinks?.nextdoor ?? '',
    instagram: user?.reviewLinks?.instagram ?? '',
    facebook: user?.reviewLinks?.facebook ?? '',
    website: user?.reviewLinks?.website ?? user?.companyWebsite ?? '',
  });
  const [showcaseForm, setShowcaseForm] = useState<CompanyShowcase>(() => normalizeShowcase(user?.companyShowcase ?? null));
  const [showcaseStatus, setShowcaseStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showcaseSaving, setShowcaseSaving] = useState(false);
  const helperNameInputRef = useRef<HTMLInputElement | null>(null);
  const portalAccessSectionRef = useRef<HTMLDivElement | null>(null);
  const focusHelperForm = useCallback(() => {
    if (typeof window === 'undefined') return;
    const formBlock = document.getElementById('create-helper');
    formBlock?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      helperNameInputRef.current?.focus();
    }, 350);
  }, []);
  useRegisterQuickAction('team:add-helper', focusHelperForm);
  const focusPortalSection = useCallback(() => {
    if (typeof window === 'undefined') return;
    portalAccessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPortalAccessOpen(true);
  }, []);
  useRegisterQuickAction('team:portal-access', focusPortalSection);
  const teamMembers = useMemo(() => members.filter((member) => member.role !== 'CLIENT'), [members]);
  const clientMembers = useMemo(() => members.filter((member) => member.role === 'CLIENT'), [members]);
  const helpers = useMemo(() => teamMembers.filter((member) => member.role === 'HELPER'), [teamMembers]);
  const customersWithPortal = useMemo(() => customers.filter((customer) => !!customer.email).length, [customers]);
  const usdFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    [],
  );

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

  const handleShowcaseSectionChange = (id: string, field: keyof CompanyShowcaseSection, value: string) => {
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

  const handlePortalAccessCustomerChange = (customerId: string) => {
    setPortalAccessForm((prev) => {
      const selected = customers.find((customer) => customer.id === customerId);
      return {
        ...prev,
        customerId,
        name: selected?.name ?? '',
        email: selected?.email ?? '',
      };
    });
  };

  const handlePortalAccessSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPortalAccessError('');
    setPortalAccessMessage(null);
    if (!portalAccessForm.customerId || !portalAccessForm.email.trim()) {
      setPortalAccessError('Selecione um cliente e informe o e-mail.');
      return;
    }
    try {
      setPortalAccessSaving(true);
      const response = await teamApi.createClientPortalAccess(portalAccessForm.customerId, {
        email: portalAccessForm.email.trim(),
        name: portalAccessForm.name.trim() || undefined,
        password: portalAccessForm.password.trim() || undefined,
      });
      setPortalAccessMessage({ email: response.user.email, password: response.temporaryPassword });
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === portalAccessForm.customerId ? { ...customer, email: response.user.email } : customer,
        ),
      );
      setPortalAccessForm((prev) => ({ ...prev, password: '' }));
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
    } catch (err) {
      console.error('Erro ao copiar senha:', err);
    }
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
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível salvar as personalizações.';
      setShowcaseStatus({ type: 'error', message });
    } finally {
      setShowcaseSaving(false);
    }
  };

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const data = await customersApi.list();
      setCustomers(data);
    } catch (err) {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await teamApi.list();
      setMembers(data.members);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível carregar a equipe.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (!customers.length) return;
    setPortalAccessForm((prev) => {
      if (prev.customerId) {
        const current = customers.find((customer) => customer.id === prev.customerId);
        return {
          ...prev,
          name: prev.name || current?.name || '',
          email: prev.email || current?.email || '',
        };
      }
      const first = customers[0];
      return {
        customerId: first.id,
        name: first.name,
        email: first.email ?? '',
        password: '',
      };
    });
  }, [customers]);

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('view') === 'portal') {
      focusPortalSection();
    }
  }, [location.search, focusPortalSection]);

  const fetchHelperDay = async (helperId: string, day: DayKey) => {
    setHelperDayData((prev) => ({
      ...prev,
      [helperId]: {
        today: prev[helperId]?.today ?? { loading: false, data: null, error: '' },
        tomorrow: prev[helperId]?.tomorrow ?? { loading: false, data: null, error: '' },
        [day]: { ...(prev[helperId]?.[day] ?? { data: null }), loading: true, error: '' },
      },
    }));
    try {
      const targetDate = new Date();
      if (day === 'tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      const data = await teamApi.getHelperDay(helperId, targetDate.toISOString());
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: {
          ...(prev[helperId] ?? { today: { loading: false, data: null, error: '' }, tomorrow: { loading: false, data: null, error: '' } }),
          [day]: { loading: false, error: '', data },
        },
      }));
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível carregar a rota da helper.';
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: {
          ...(prev[helperId] ?? { today: { loading: false, data: null, error: '' }, tomorrow: { loading: false, data: null, error: '' } }),
          [day]: { loading: false, error: message, data: null },
        },
      }));
    }
  };

  const toggleHelperDetails = (helperId: string) => {
    if (expandedHelperId === helperId) {
      setExpandedHelperId(null);
      return;
    }
    setExpandedHelperId(helperId);
    if (!helperDayData[helperId]) {
      setHelperSelectedDay((prev) => ({ ...prev, [helperId]: 'today' }));
      fetchHelperDay(helperId, 'today');
      fetchHelperDay(helperId, 'tomorrow');
    }
  };

  const getChecklistProgress = (appointment: HelperAppointment) => {
    const total = appointment.checklist.length || 1;
    const completed = appointment.checklist.filter((item) => item.completedAt).length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  };
  const handleAddChecklistItem = async (helperId: string, appointmentId: string) => {
    const title = (newChecklistTitles[appointmentId] ?? '').trim();
    if (!title) return;
    setChecklistActionId(appointmentId);
    try {
      await teamApi.addChecklistItem(appointmentId, title);
      setNewChecklistTitles((prev) => ({ ...prev, [appointmentId]: '' }));
      const day = helperSelectedDay[helperId] ?? 'today';
      await fetchHelperDay(helperId, day);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível adicionar o item.';
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: { ...(prev[helperId] ?? { data: null }), error: message, loading: false },
      }));
    } finally {
      setChecklistActionId(null);
    }
  };

  const handleRemoveChecklistItem = async (helperId: string, appointmentId: string, taskId: string) => {
    setChecklistActionId(taskId);
    try {
      await teamApi.removeChecklistItem(appointmentId, taskId);
      const day = helperSelectedDay[helperId] ?? 'today';
      await fetchHelperDay(helperId, day);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível remover o item.';
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: { ...(prev[helperId] ?? { data: null }), error: message, loading: false },
      }));
    } finally {
      setChecklistActionId(null);
    }
  };

  const handleToggleChecklistItem = async (helperId: string, appointmentId: string, taskId: string) => {
    setChecklistActionId(taskId);
    try {
      await teamApi.toggleChecklistItem(appointmentId, taskId);
      const day = helperSelectedDay[helperId] ?? 'today';
      await fetchHelperDay(helperId, day);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível atualizar o item.';
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: { ...(prev[helperId] ?? { data: null }), error: message, loading: false },
      }));
    } finally {
      setChecklistActionId(null);
    }
  };

  const handleSaveNotes = async (helperId: string, appointmentId: string) => {
    const draft = notesDrafts[appointmentId] ?? '';
    setNotesSavingId(appointmentId);
    try {
      await teamApi.updateAppointmentNotes(appointmentId, draft);
      const day = helperSelectedDay[helperId] ?? 'today';
      await fetchHelperDay(helperId, day);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível salvar as observações.';
      setHelperDayData((prev) => ({
        ...prev,
        [helperId]: { ...(prev[helperId] ?? { data: null }), error: message, loading: false },
      }));
    } finally {
      setNotesSavingId(null);
    }
  };

  const formatDuration = (appointment: HelperAppointment) => {
    if (!appointment.startedAt) return null;
    const start = new Date(appointment.startedAt).getTime();
    const end = appointment.finishedAt ? new Date(appointment.finishedAt).getTime() : Date.now();
    if (!start || start > end) return null;
    const diff = Math.floor((end - start) / 1000);
    const hrs = Math.floor(diff / 3600)
      .toString()
      .padStart(2, '0');
    const mins = Math.floor((diff % 3600) / 60)
      .toString()
      .padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setSubmitting(true);
    try {
      await teamApi.createHelper(form);
      setSuccessMessage('Helper criada com sucesso! Compartilhe o e-mail e senha com ela.');
      setForm({ name: '', email: '', password: '' });
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível criar a helper.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalMembers = teamMembers.length;
  const ownerCount = teamMembers.filter((member) => member.role === 'OWNER').length;
  const teamHighlights = [
    { label: 'Membros totais', value: totalMembers },
    { label: 'Helpers ativos', value: helpers.length },
    { label: 'Administradoras', value: ownerCount },
    { label: 'Convites livres', value: Math.max(0, 5 - helpers.length) },
  ];
  const reviewLinkFields: Array<{ key: keyof OwnerReviewLinks; label: string; placeholder: string }> = [
    { key: 'website', label: 'Site oficial', placeholder: 'https://suaempresa.com' },
    { key: 'google', label: 'Google Meu Negócio', placeholder: 'https://g.page/suaempresa/review' },
    { key: 'nextdoor', label: 'Nextdoor', placeholder: 'https://nextdoor.com/pages/suaempresa' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/suaempresa' },
    { key: 'facebook', label: 'Facebook / Meta', placeholder: 'https://facebook.com/suaempresa' },
  ];
  const canAddShowcaseSection = showcaseForm.sections.length < 5;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#05040f] text-white shadow-[0_40px_120px_rgba(5,4,15,0.55)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#312e81] via-[#4c1d95] to-[#0f172a] opacity-90" />
        <div className="relative p-6 md:p-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/70 font-semibold">Squad & Helpers</p>
            <h1 className="text-3xl md:text-4xl font-semibold">Equipe alinhada ao novo fluxo FlowOps</h1>
            <p className="text-sm text-white/70 max-w-2xl">
              Convide helpers, acompanhe rotas diárias e envie recados direto para o app delas. Toda gestão fica centralizada em
              um painel rápido e responsivo.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2">
                <BarChart3 size={16} className="text-white/70" />
                {helpers.length} helpers monitoradas
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white/80">
                Última atualização {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>
          <div className="w-full md:w-auto flex flex-col gap-3">
            <div className="rounded-3xl border border-white/20 bg-white/10 px-5 py-4 space-y-1">
              <p className="text-sm text-white/70">Capacidade atual</p>
              <p className="text-3xl font-semibold">{helpers.length}/10 helpers</p>
              <p className="text-xs text-white/60">
                {Math.max(0, 10 - helpers.length)} vagas disponíveis para convites imediatos
              </p>
            </div>
            <a
              href="#create-helper"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-gray-900 px-5 py-3 text-sm font-semibold shadow-[0_20px_40px_rgba(15,23,42,0.25)] hover:-translate-y-0.5 transition"
            >
              <UserPlus size={18} />
              Adicionar helper agora
            </a>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {teamHighlights.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-gray-100 bg-white/90 backdrop-blur-sm p-4 shadow-[0_20px_50px_rgba(15,23,42,0.05)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-indigo-100 bg-white p-5 flex gap-4">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
              <BarChart3 size={20} />
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p className="font-semibold text-gray-900">Controle rápido das rotas</p>
              <p>
                Use o botão <span className="font-semibold text-primary-700">“Ver rotas”</span> para abrir o painel da helper,
                editar checklist, enviar recados e abrir rotas no Maps sem sair da página.
              </p>
            </div>
          </div>

          <div id="create-helper" className="rounded-[28px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
                <UserPlus size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Adicionar helper</p>
                <p className="text-gray-500 text-sm">Crie o acesso e compartilhe as credenciais.</p>
              </div>
            </div>

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl px-3 py-2">
                {successMessage}
              </div>
            )}
            {error && !loading && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</label>
                <input
                  type="text"
                  ref={helperNameInputRef}
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="helper@clientpro.com"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Senha inicial</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 text-white font-semibold py-3 hover:bg-primary-700 transition disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Criar helper'
                )}
              </button>
            </form>
          </div>

          <div
            ref={portalAccessSectionRef}
            className="rounded-[32px] bg-gradient-to-br from-[#0d0b2d] via-[#181641] to-[#311858] text-white shadow-[0_30px_80px_rgba(7,11,30,0.45)] p-6 space-y-5"
          >
            <button
              type="button"
              onClick={() => setPortalAccessOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Client portal access</p>
                <p className="text-lg font-semibold">
                  {customersWithPortal}/{customers.length || '0'} clients com login ativo
                </p>
                <p className="text-sm text-white/70">
                  Gere credenciais instantâneas e personalize o pop-up “Sua empresa parceira”.
                </p>
              </div>
              <ChevronDown className={`text-white/80 w-5 h-5 transition-transform ${portalAccessOpen ? 'rotate-180' : ''}`} />
            </button>
            {portalAccessOpen && (
              <div className="space-y-5">
                <form className="grid gap-3 md:grid-cols-[1.2fr,1fr,1fr,auto]" onSubmit={handlePortalAccessSubmit}>
                  <select
                    value={portalAccessForm.customerId}
                    onChange={(e) => handlePortalAccessCustomerChange(e.target.value)}
                    className="px-3 py-2.5 rounded-2xl text-sm bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60"
                    required
                    disabled={customersLoading || !customers.length}
                  >
                    <option value="">{customersLoading ? 'Carregando clientes...' : 'Selecione o cliente'}</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id} className="text-gray-900">
                        {customer.name}
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
                    <ChevronDown className={`w-4 h-4 transition-transform ${showcasePanelOpen ? 'rotate-180' : ''}`} />
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

        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-gray-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.06)] p-6 space-y-5">
            <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Time ativo</p>
            <h2 className="text-2xl font-bold text-gray-900">
              {totalMembers} membro{totalMembers === 1 ? '' : 's'}{' '}
              <span className="text-base font-medium text-gray-500">({helpers.length} helpers)</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">{error}</div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => {
                const dayState = helperDayData[member.id];
                const selectedDay = helperSelectedDay[member.id] ?? 'today';
                const dayData = dayState?.[selectedDay]?.data ?? null;
                const dayLoading = dayState?.[selectedDay]?.loading ?? false;
                const dayError = dayState?.[selectedDay]?.error ?? '';

                return (
                  <div
                    key={member.id}
                    className="rounded-[22px] border border-gray-100 bg-white/90 p-4 md:p-5 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{member.name}</p>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Mail size={14} /> {member.email}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                          <ShieldCheck size={12} />
                          {roleLabels[member.role ?? 'HELPER'] ?? 'Colaborador'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-gray-600">
                          <Phone size={14} />
                          {member.contactPhone || member.whatsappNumber || 'Sem telefone'}
                        </span>
                        {member.role === 'HELPER' && normalizePhone(member.contactPhone ?? member.whatsappNumber) && (
                          <a
                            href={`sms:${normalizePhone(member.contactPhone ?? member.whatsappNumber)}`}
                            className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-primary-700"
                          >
                            <MessageCircle size={14} /> SMS
                          </a>
                        )}
                      </div>
                    </div>

                    {member.role === 'HELPER' && (
                      <button
                        type="button"
                        onClick={() => toggleHelperDetails(member.id)}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition"
                      >
                        <BarChart3 size={16} />
                        {expandedHelperId === member.id ? 'Fechar painel' : 'Ver rotas'}
                      </button>
                    )}

                    {member.role === 'HELPER' && expandedHelperId === member.id && (
                      <div className="space-y-4 border-t border-gray-200 pt-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="inline-flex bg-white border border-gray-200 rounded-full p-1">
                            {(['today', 'tomorrow'] as DayKey[]).map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  setHelperSelectedDay((prev) => ({ ...prev, [member.id]: day }));
                                  if (!helperDayData[member.id]?.[day]) {
                                    fetchHelperDay(member.id, day);
                                  }
                                }}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                                  selectedDay === day ? 'bg-primary-600 text-white shadow' : 'text-gray-600'
                                }`}
                              >
                                {day === 'today' ? 'Hoje' : 'Amanhã'}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            {dayData?.date && (
                              <p className="capitalize">
                                {new Date(dayData.date).toLocaleDateString('pt-BR', {
                                  weekday: 'long',
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => fetchHelperDay(member.id, selectedDay)}
                              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 font-semibold text-gray-600 hover:border-primary-200"
                            >
                              Atualizar rotas
                            </button>
                            <a
                              href="/app/financeiro"
                              className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 font-semibold text-primary-700"
                            >
                              Ver custos no Financeiro
                            </a>
                          </div>
                        </div>

                        {dayLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                          </div>
                        ) : dayError ? (
                          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">{dayError}</div>
                        ) : dayData?.appointments.length ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              {[
                                { label: 'Serviços', value: dayData?.summary.total ?? 0 },
                                { label: 'Pendentes', value: dayData?.summary.pending ?? 0 },
                                { label: 'Em andamento', value: dayData?.summary.inProgress ?? 0 },
                                { label: 'Concluídos', value: dayData?.summary.completed ?? 0 },
                                {
                                  label: 'Pagamento helper',
                                  value: usdFormatter.format(dayData?.summary.payoutTotal ?? 0),
                                },
                              ].map((card) => (
                                <div key={card.label} className="bg-white rounded-2xl border border-gray-100 px-3 py-2">
                                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">{card.label}</p>
                                  <p className="text-lg font-semibold text-gray-900">{card.value}</p>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-3">
                              {dayData?.appointments.map((appointment) => {
                                  const progress = getChecklistProgress(appointment);
                                  const durationLabel = formatDuration(appointment);
                                  const smsLink = normalizePhone(appointment.customer.phone)
                                    ? `sms:${normalizePhone(appointment.customer.phone)}`
                                    : null;
                                  const directions =
                                    appointment.customer.latitude && appointment.customer.longitude
                                      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                          `${appointment.customer.latitude},${appointment.customer.longitude}`,
                                        )}`
                                      : appointment.customer.address
                                      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                          appointment.customer.address,
                                        )}`
                                      : null;
                                  return (
                                    <div key={appointment.id} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                                      <div className="flex flex-wrap items-center gap-2 justify-between">
                                        <div>
                                          <p className="text-sm font-semibold text-gray-900">{appointment.customer.name}</p>
                                          <p className="text-xs text-gray-500">{appointment.startTime}</p>
                                        </div>
                                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                                          {appointment.status === 'AGENDADO'
                                            ? 'Pendente'
                                            : appointment.status === 'EM_ANDAMENTO'
                                            ? 'Em andamento'
                                            : 'Concluído'}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                          <span>
                                            Checklist {progress.completed}/{progress.total}
                                          </span>
                                          <span>{progress.percent}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress.percent}%` }} />
                                        </div>
                                      </div>
                                      {durationLabel && (
                                        <p className="text-xs text-gray-500">Tempo total: {durationLabel}</p>
                                      )}
                                      <p className="text-xs text-emerald-600 font-semibold">
                                        Pagamento helper: {usdFormatter.format(appointment.helperFee ?? 0)}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-primary-700 font-semibold">
                                        {smsLink && (
                                          <a href={smsLink} className="inline-flex items-center gap-1">
                                            <MessageCircle size={14} /> SMS cliente
                                          </a>
                                        )}
                                        {directions && (
                                          <a href={directions} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                                            <Navigation2 size={14} /> Traçar rota
                                          </a>
                                        )}
                                      </div>
                                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 space-y-3">
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                          <span className="font-semibold text-gray-700">Checklist</span>
                                          <span>
                                            {appointment.checklist.filter((item) => item.completedAt).length}/
                                            {appointment.checklist.length}
                                          </span>
                                        </div>
                                        <div className="space-y-2">
                                          {appointment.checklist.length ? (
                                            appointment.checklist.map((task) => (
                                              <div
                                                key={task.id}
                                                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm gap-2"
                                              >
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleChecklistItem(member.id, appointment.id, task.id)}
                                                  disabled={checklistActionId === task.id}
                                                  className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                                                    task.completedAt
                                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                                      : 'border-gray-300 text-gray-400'
                                                  }`}
                                                >
                                                  {task.completedAt && <Check size={14} />}
                                                </button>
                                                <span
                                                  className={`flex-1 ${
                                                    task.completedAt ? 'text-emerald-600 font-semibold' : 'text-gray-700'
                                                  }`}
                                                >
                                                  {task.title}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveChecklistItem(member.id, appointment.id, task.id)}
                                                  disabled={checklistActionId === task.id}
                                                  className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                                >
                                                  <X size={14} />
                                                </button>
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-xs text-gray-500">Nenhum item cadastrado.</p>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            value={newChecklistTitles[appointment.id] ?? ''}
                                            onChange={(e) =>
                                              setNewChecklistTitles((prev) => ({
                                                ...prev,
                                                [appointment.id]: e.target.value,
                                              }))
                                            }
                                            placeholder="Novo item..."
                                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleAddChecklistItem(member.id, appointment.id)}
                                            disabled={
                                              !newChecklistTitles[appointment.id]?.trim() || checklistActionId === appointment.id
                                            }
                                            className="px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
                                          >
                                            Adicionar
                                          </button>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                          Recados para a helper
                                        </p>
                                        <textarea
                                          value={notesDrafts[appointment.id] ?? appointment.notes ?? ''}
                                          onChange={(e) =>
                                            setNotesDrafts((prev) => ({
                                              ...prev,
                                              [appointment.id]: e.target.value,
                                            }))
                                          }
                                          rows={3}
                                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                          placeholder="Ex: Foque nos armários da cozinha, levar aspirador..."
                                        />
                                        <div className="flex justify-end">
                                          <button
                                            type="button"
                                            onClick={() => handleSaveNotes(member.id, appointment.id)}
                                            disabled={notesSavingId === appointment.id}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
                                          >
                                            {notesSavingId === appointment.id ? (
                                              <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                                              </>
                                            ) : (
                                              'Salvar recado'
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Nenhum serviço atribuído para o dia selecionado.</p>
                          )}
                        
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
          </div>

          <div className="rounded-[32px] border border-gray-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.06)] p-6 space-y-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Clientes com acesso</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{clientMembers.length}</h2>
                <span className="text-sm text-gray-500">
                  {customersWithPortal}/{customers.length || 0} no portal
                </span>
              </div>
            </div>

            {clientMembers.length ? (
              <div className="space-y-3">
                {clientMembers.map((client) => (
                  <div key={client.id} className="rounded-2xl border border-gray-100 p-4 space-y-2">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{client.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail size={14} /> {client.email}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        Cliente
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1">
                        <Phone size={12} />
                        {client.contactPhone || client.whatsappNumber || 'Sem telefone'}
                      </span>
                      <button
                        type="button"
                        onClick={focusPortalSection}
                        className="inline-flex items-center gap-1 text-primary-600 font-semibold"
                      >
                        <UserPlus size={12} />
                        Gerenciar acesso
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 space-y-2">
                <p>Nenhum cliente com login ativo ainda.</p>
                <button
                  type="button"
                  onClick={focusPortalSection}
                  className="inline-flex items-center gap-2 text-primary-600 font-semibold"
                >
                  <UserPlus size={14} />
                  Criar acesso agora
                </button>
              </div>
            )}
          </div>
        </div>
    </section>
  </div>
  );
};

export default Team;

