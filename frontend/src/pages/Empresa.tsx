import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ExternalLink, Globe, MapPin, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { CompanyShowcase, CompanyShowcaseSection, OwnerReviewLinks } from '../types';
import { PageHeader, SurfaceCard, StatusBadge } from '../components/OwnerUI';
import { pageGutters, labelSm } from '../styles/uiTokens';

const generateSectionId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `section-${Date.now()}-${Math.random()}`;

const createDefaultShowcase = (): CompanyShowcase => ({
  headline: 'Sua empresa parceira',
  description: 'Equipe treinada, comunicação transparente e foco nos detalhes que importam.',
  layout: 'grid',
  sections: [
    { id: generateSectionId(), title: 'Qualidade impecável', description: 'Checklists claros em cada visita.', emoji: '🧽' },
    { id: generateSectionId(), title: 'Equipe confiável', description: 'Treinadas internamente e seguradas.', emoji: '🛡️' },
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
    headline: showcase.headline || fallback.headline,
    description: showcase.description || fallback.description,
    layout: showcase.layout === 'stacked' ? 'stacked' : 'grid',
    sections,
  };
};

type ReviewLinksFormState = {
  website: string;
  google: string;
  nextdoor: string;
  instagram: string;
  facebook: string;
};

const MAX_SECTIONS = 5;

const REVIEW_LINKS: Array<{ key: keyof ReviewLinksFormState; label: string; placeholder: string }> = [
  { key: 'website', label: 'Site oficial', placeholder: 'https://suaempresa.com' },
  { key: 'google', label: 'Google Meu Negócio', placeholder: 'https://g.page/suaempresa/review' },
  { key: 'nextdoor', label: 'Nextdoor', placeholder: 'https://nextdoor.com/pages/suaempresa' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/suaempresa' },
  { key: 'facebook', label: 'Facebook / Meta', placeholder: 'https://facebook.com/suaempresa' },
];

const Empresa = () => {
  const { user, updateProfile } = useAuth();
  const [showcaseForm, setShowcaseForm] = useState<CompanyShowcase>(() => normalizeShowcase(user?.companyShowcase ?? null));
  const [reviewLinksForm, setReviewLinksForm] = useState<ReviewLinksFormState>({
    website: user?.companyWebsite ?? user?.reviewLinks?.website ?? '',
    google: user?.reviewLinks?.google ?? '',
    nextdoor: user?.reviewLinks?.nextdoor ?? '',
    instagram: user?.reviewLinks?.instagram ?? '',
    facebook: user?.reviewLinks?.facebook ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setShowcaseForm(normalizeShowcase(user?.companyShowcase ?? null));
    setReviewLinksForm({
      website: user?.companyWebsite ?? user?.reviewLinks?.website ?? '',
      google: user?.reviewLinks?.google ?? '',
      nextdoor: user?.reviewLinks?.nextdoor ?? '',
      instagram: user?.reviewLinks?.instagram ?? '',
      facebook: user?.reviewLinks?.facebook ?? '',
    });
  }, [user?.companyShowcase, user?.reviewLinks, user?.companyWebsite]);

  const updateShowcaseField = (field: keyof CompanyShowcase, value: string | 'grid' | 'stacked') => {
    setShowcaseForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleShowcaseSectionChange = (id: string, field: keyof CompanyShowcaseSection, value: string) => {
    setShowcaseForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === id ? { ...section, [field]: value } : section)),
    }));
  };

  const addShowcaseSection = () => {
    setShowcaseForm((prev) => {
      if (prev.sections.length >= MAX_SECTIONS) return prev;
      return {
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
      };
    });
  };

  const removeShowcaseSection = (id: string) => {
    setShowcaseForm((prev) => {
      if (prev.sections.length <= 1) return prev;
      return {
        ...prev,
        sections: prev.sections.filter((section) => section.id !== id),
      };
    });
  };

  const handleReviewLinkChange = (key: keyof ReviewLinksFormState, value: string) => {
    setReviewLinksForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleShowcaseSave = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setSaving(true);

    const cleanedLinks = Object.entries(reviewLinksForm).reduce<OwnerReviewLinks>((acc, [key, value]) => {
      const trimmed = value.trim();
      if (trimmed) {
        acc[key as keyof OwnerReviewLinks] = trimmed;
      }
      return acc;
    }, {});

    const trimmedWebsite = reviewLinksForm.website.trim();
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
          layout: (showcaseForm.layout === 'stacked' ? 'stacked' : 'grid') as CompanyShowcase['layout'],
          sections: sanitizedSections.length ? sanitizedSections : createDefaultShowcase().sections,
        },
      };

      const updated = await updateProfile(payload);
      setShowcaseForm(normalizeShowcase(updated.companyShowcase ?? null));
      setReviewLinksForm({
        website: updated.companyWebsite ?? updated.reviewLinks?.website ?? '',
        google: updated.reviewLinks?.google ?? '',
        nextdoor: updated.reviewLinks?.nextdoor ?? '',
        instagram: updated.reviewLinks?.instagram ?? '',
        facebook: updated.reviewLinks?.facebook ?? '',
      });
      setStatus({ type: 'success', message: 'Personalização salva com sucesso.' });
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Não foi possível salvar as personalizações.';
      setStatus({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const showcase = useMemo(() => normalizeShowcase(showcaseForm), [showcaseForm]);
  const reviewLinkPreview = REVIEW_LINKS.map((link) => ({
    ...link,
    url: reviewLinksForm[link.key],
  }));
  const googleReviewLink = reviewLinkPreview.find((link) => link.key === 'google')?.url || '';

  const contactCards = [
    {
      label: 'E-mail',
      value: user?.email,
      description: 'Contato oficial para clientes e equipe.',
    },
    {
      label: 'WhatsApp',
      value: user?.whatsappNumber,
      description: 'Comunicação rápida com clientes.',
    },
    {
      label: 'Telefone',
      value: user?.contactPhone,
      description: 'Linha dedicada para urgências ou propostas.',
    },
  ].filter((card) => card.value);

  return (
    <div className={`${pageGutters} max-w-full md:max-w-6xl mx-auto space-y-8`}>
      <PageHeader
        label="EMPRESA"
        title="Brand & Company"
        subtitle="Identidade, dados oficiais e presença online."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/app/clientes"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Ajustar no painel de clientes
              <ExternalLink size={16} />
            </Link>
            <StatusBadge tone="primary">Plano {user?.planStatus ?? 'TRIAL'}</StatusBadge>
            </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <SurfaceCard className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {['Portal do cliente', 'Pop-up “Sua empresa parceira”', 'Links oficiais'].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            Esta visão é o espelho do que os Clients enxergam no portal. Edição oficial em <strong>Clientes → Acesso ao app</strong>.
          </p>
        </SurfaceCard>
        <SurfaceCard className="bg-gradient-to-br from-primary-50 via-white to-accent-50 border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-3xl bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-semibold">
              {(user?.companyName || user?.name || 'CP')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <p className={labelSm}>Marca exibida</p>
              <p className="text-xl font-bold text-slate-900">{user?.companyName || user?.name || 'Adicione sua marca'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white border border-slate-100 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Links ativos</p>
              <p className="text-2xl font-bold text-slate-900">{reviewLinkPreview.filter((link) => link.url).length}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Destaques</p>
              <p className="text-2xl font-bold text-slate-900">{showcase.sections.length}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Plano atual</p>
              <p className="text-2xl font-bold text-slate-900">{user?.planStatus ?? 'Trial'}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Ajustes feitos aqui mantêm a consistência visual com o portal dos Clients e com a landing.
          </p>
        </SurfaceCard>
        </div>

      <section className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500">
              <Building2 size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Identidade visual</p>
              <p className="text-lg font-semibold text-gray-900">{user?.companyName || user?.name || 'Sem nome cadastrado'}</p>
              <p className="text-xs text-gray-500">Ajuste logo, cores e descrição da marca.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Administrador</p>
              <p className="text-sm font-semibold text-gray-900">{user?.name ?? '—'}</p>
              <p className="text-xs text-gray-500">
                Conta criada em {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '--'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Plano</p>
              <p className="text-sm font-semibold text-gray-900">{user?.planStatus ?? 'Trial'}</p>
              {user?.trialEnd && (
                <p className="text-xs text-gray-500">
                  Trial até {new Date(user.trialEnd).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>
          {contactCards.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {contactCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-gray-100 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{card.label}</p>
                  <p className="text-sm font-semibold text-gray-900 break-all">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Links oficiais</p>
          <p className="text-sm text-gray-500">Site, redes sociais e canais de contato.</p>
          <div className="space-y-2">
            {reviewLinkPreview.map((link) => (
              <div key={link.key} className="flex items-center justify-between rounded-2xl border border-gray-100 p-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-500 break-all">{link.url || link.placeholder}</p>
                </div>
                {link.url ? (
                  <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gray-900 text-xs font-semibold">
                    Abrir
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Não preenchido</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Posicionamento</p>
              <p className="text-sm text-gray-500">Mostre por que sua empresa é diferente.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
              Layout {showcase.layout === 'stacked' ? 'Blocos verticais' : 'Cartões lado a lado'}
            </span>
          </div>
          <div className="rounded-[24px] bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 text-white p-5 space-y-2">
            <p className="text-xs uppercase tracking-wide font-semibold opacity-80">Título principal</p>
            <p className="text-2xl font-bold">{showcase.headline}</p>
            <p className="text-sm opacity-90">{showcase.description}</p>
          </div>
          <div className={`grid gap-3 ${showcase.layout === 'stacked' ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
            {showcase.sections.map((section) => (
              <div key={section.id} className="rounded-2xl border border-gray-100 p-4 space-y-2">
                <div className="text-2xl">{section.emoji ?? '✨'}</div>
                <p className="text-sm font-semibold text-gray-900">{section.title}</p>
                <p className="text-xs text-gray-500">
                  {section.description || 'Personalize este texto na Central de Clientes.'}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Avaliações e reputação</p>
            <Star className="text-amber-500" size={18} />
          </div>
          <p className="text-sm text-gray-600">
            Estes links são usados no portal do Client. Peça ao time que mantenha os canais atualizados.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {googleReviewLink ? (
              <a
                href={googleReviewLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Abrir Google Reviews
                <ExternalLink size={16} />
              </a>
            ) : (
              <span className="text-xs text-gray-400">
                Adicione o link do Google Meu Negócio para habilitar o botão de feedback direto.
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-none border-0 bg-white shadow-none p-6 space-y-6">
        <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Personalizar portal do cliente</p>
            <p className="text-sm text-gray-500">
              Edição oficial realizada em Clientes → Acesso ao app. Este módulo permite ajustes rápidos.
            </p>
          </div>
          <Link to="/app/clientes" className="text-xs font-semibold text-gray-900 hover:underline">
            Abrir Central de Clientes →
          </Link>
        </div>

        {status && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-red-50 border-red-100 text-red-700'
            }`}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleShowcaseSave} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Título principal</label>
              <input
                type="text"
                value={showcaseForm.headline || ''}
                onChange={(event) => updateShowcaseField('headline', event.target.value)}
                placeholder="Ex: Nossa promessa para o seu lar"
                className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição rápida</label>
              <textarea
                value={showcaseForm.description || ''}
                onChange={(event) => updateShowcaseField('description', event.target.value)}
                rows={3}
                placeholder="Resumo do que torna sua empresa única."
                className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Layout do pop-up</p>
            <div className="inline-flex rounded-full border border-gray-200 overflow-hidden">
              {[
                { key: 'grid' as const, label: 'Cartões lado a lado' },
                { key: 'stacked' as const, label: 'Blocos verticais' },
              ].map((option) => (
                <button
                  type="button"
                  key={option.key}
                  onClick={() => updateShowcaseField('layout', option.key)}
                  className={`px-4 py-2 text-sm font-semibold transition ${
                    showcaseForm.layout === option.key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Destaques (até 5)</p>
                <p className="text-xs text-gray-500">Estes cartões viram a checklist visual no portal.</p>
              </div>
              <button
                type="button"
                onClick={addShowcaseSection}
                disabled={showcaseForm.sections.length >= MAX_SECTIONS}
                className="text-sm font-semibold text-gray-900 disabled:opacity-40"
              >
                Adicionar destaque
              </button>
            </div>

            <div className="space-y-4">
              {showcaseForm.sections.map((section) => (
                <div key={section.id} className="rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Bloco</p>
                    {showcaseForm.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeShowcaseSection(section.id)}
                        className="text-xs text-red-500 font-semibold"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-[90px,1fr]">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Emoji</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={section.emoji ?? ''}
                        onChange={(event) => handleShowcaseSectionChange(section.id, 'emoji', event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-center text-lg focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(event) => handleShowcaseSectionChange(section.id, 'title', event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900"
                        placeholder="Ex: Equipe certificada"
                      />
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</label>
                      <textarea
                        value={section.description}
                        onChange={(event) => handleShowcaseSectionChange(section.id, 'description', event.target.value)}
                        rows={2}
                        className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900"
                        placeholder="Explique em até 120 caracteres."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Links e redes</p>
            <div className="grid gap-3 md:grid-cols-2">
              {REVIEW_LINKS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{field.label}</label>
                  <input
                    type="url"
                    value={reviewLinksForm[field.key] || ''}
                    onChange={(event) => handleReviewLinkChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Salve para publicar no portal do cliente. É possível reabrir este painel a qualquer momento.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar personalização'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="text-gray-600" size={18} />
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Área de atuação</p>
        </div>
        <p className="text-sm text-gray-600">
          {user?.companyShowcase?.description || 'Defina sua área de atendimento na Central de Clientes.'}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-900">
          <Globe size={16} />
          <a href={user?.companyWebsite || '#'} target="_blank" rel="noreferrer" className="hover:underline">
            {user?.companyWebsite || 'Adicione seu site oficial'}
          </a>
        </div>
      </section>
    </div>
  );
};

export default Empresa;
