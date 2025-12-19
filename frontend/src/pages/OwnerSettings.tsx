import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Building,
  ChevronRight,
  Link2,
  Languages,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import type { LanguageOption } from '../types';
import { PageHeader, SurfaceCard, StatusBadge } from '../components/OwnerUI';
import { pageGutters, labelSm } from '../styles/uiTokens';
import { getGoogleAuthUrl, getGoogleStatus } from '../services/googleCalendar';

const LANGUAGE_OPTIONS: Array<{ value: LanguageOption; label: string; description: string }> = [
  { value: 'pt', label: 'Português', description: 'Ideal para a equipe no Brasil' },
  { value: 'en', label: 'English', description: 'Indicada para helpers' },
  { value: 'es', label: 'Español', description: 'Clientes latinos' },
];

const QUICK_ACTIONS = [
  { icon: Building, title: 'Identidade visual', subtitle: 'Logo, cores e tipografia', to: '/app/empresa' },
  { icon: ShieldCheck, title: 'Permissões de equipe', subtitle: 'Helpers e admins', to: '/app/team' },
  { icon: Bell, title: 'Notificações e alertas', subtitle: 'SMS, push e e-mail', to: '/app/agenda' },
  { icon: SettingsIcon, title: 'Preferências do app cliente', subtitle: 'Cards, módulos e atalhos', to: '/app/clientes' },
];

const OwnerSettings = () => {
  const { user } = useAuth();
  const { setLanguagePreference } = usePreferences();
  const [language, setLanguage] = useState<LanguageOption>((user?.preferredLanguage as LanguageOption) ?? 'pt');
  const [languageMessage, setLanguageMessage] = useState('');
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteFeedback, setDeleteFeedback] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; reason?: string }>({ connected: false });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleFeedback, setGoogleFeedback] = useState('');

  const initials =
    user?.name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase() ?? 'CP';

  const handleLanguageChange = (value: LanguageOption) => {
    setLanguage(value);
    setLanguagePreference(value);
    setLanguageMessage('Idioma atualizado. As mudanças refletem para toda a organização.');
    setTimeout(() => setLanguageMessage(''), 3500);
  };

  const handleDeleteAccount = () => {
    if (!user?.email) return;
    if (deleteEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteFeedback('Digite seu e-mail exatamente como aparece na conta.');
      return;
    }
    setDeleteFeedback('Enviamos um link seguro para seu e-mail. Confirme por lá para seguir com a exclusão.');
    setDeleteEmail('');
    setTimeout(() => setDeleteFeedback(''), 5000);
  };

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await getGoogleStatus();
        setGoogleStatus(status);
        if (searchParams.get('google') === 'connected') {
          setGoogleFeedback('Google Calendar conectado com sucesso.');
          searchParams.delete('google');
          setSearchParams(searchParams);
          setTimeout(() => setGoogleFeedback(''), 4000);
        }
      } catch (error: any) {
        setGoogleFeedback(error?.response?.data?.error || 'Não foi possível verificar o status do Google.');
      }
    };
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleConnect = async () => {
    try {
      setGoogleLoading(true);
      setGoogleFeedback('');
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (error: any) {
      setGoogleFeedback(error?.response?.data?.error || 'Não foi possível iniciar a conexão com o Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className={`${pageGutters} max-w-full md:max-w-6xl mx-auto space-y-6`}>
      <PageHeader
        label="CONFIGURAÇÕES"
        title="Settings"
        subtitle="Configurações gerais da conta e do workspace."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr] owner-grid-tight">
        <SurfaceCard className="space-y-4">
            <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-semibold overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user?.name ?? 'Avatar'} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            <div className="space-y-1">
              <p className={labelSm}>Conta principal</p>
              <p className="text-lg font-semibold text-slate-900">{user?.name ?? 'Admin'}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <div className="flex gap-2 text-xs font-semibold">
                <StatusBadge tone="primary">Plano {(user?.planStatus ?? 'trial').toUpperCase()}</StatusBadge>
                <StatusBadge tone={user?.isActive ? 'success' : 'warning'}>
                  {user?.isActive ? 'Ativa' : 'Inativa'}
                </StatusBadge>
              </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/app/empresa"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <User size={16} />
                Ver perfil
              </Link>
              <Link
                to="/app/profile"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-700 transition"
              >
                <SettingsIcon size={16} />
                Editar dados da empresa
              </Link>
            </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-3">
          <p className={labelSm}>Atalhos rápidos</p>
          <div className="divide-y divide-slate-100">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.title}
                  to={action.to}
                className="flex items-center gap-3 px-1 py-3 hover:bg-slate-50 rounded-xl"
                >
                <span className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <action.icon size={16} />
                  </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                  <p className="text-xs text-slate-500 truncate">{action.subtitle}</p>
                  </div>
                <ChevronRight size={16} className="text-slate-400" />
                </Link>
              ))}
          </div>
        </SurfaceCard>
          </div>

      <div className="grid gap-4 md:grid-cols-2 owner-grid-tight">
        <SurfaceCard className="space-y-3">
            <div className="flex items-center gap-2">
              <Languages size={18} className="text-primary-600" />
              <div>
              <p className="text-sm font-semibold text-slate-900">Idioma padrão</p>
              <p className="text-xs text-slate-500">Aplica-se ao dashboard, portal e notificações.</p>
              </div>
            </div>
            <div className="space-y-2">
              {LANGUAGE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${
                  language === option.value ? 'border-primary-200 bg-primary-50' : 'border-slate-200'
                  }`}
                >
                  <div>
                  <p className="font-semibold text-slate-900">{option.label}</p>
                  <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                  <input
                    type="radio"
                    name="language-owner"
                    value={option.value}
                    checked={language === option.value}
                    onChange={() => handleLanguageChange(option.value)}
                    className="w-4 h-4 accent-primary-600"
                  />
                </label>
              ))}
            </div>
            {languageMessage && <p className="text-xs text-primary-600">{languageMessage}</p>}
        </SurfaceCard>

        <SurfaceCard className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Notificações</p>
              <p className="text-xs text-slate-500">Escolha como quer receber alertas.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Notificações instantâneas habilitadas. Você pode pausar por 24h.
          </div>
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ajustar canais
          </button>
        </SurfaceCard>
          </div>

      <div className="grid gap-4 md:grid-cols-2 owner-grid-tight">
        <SurfaceCard className="space-y-4">
          <div className="flex items-center justify-between">
              <div>
              <p className={labelSm}>Integrações</p>
              <h3 className="text-lg font-semibold text-slate-900">Google Calendar e apps externos</h3>
              <p className="text-sm text-slate-500">
                Sincronize agendas dos partners com os eventos oficiais e mantenha tudo atualizado.
                </p>
            </div>
            <StatusBadge tone={googleStatus.connected ? 'success' : 'warning'}>
              {googleStatus.connected ? 'Conectado' : 'Desconectado'}
            </StatusBadge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleConnect}
              disabled={googleLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary-100 bg-white px-4 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
            >
              <Link2 size={16} />
              {googleLoading ? 'Redirecionando...' : googleStatus.connected ? 'Reconectar Google' : 'Conectar Google Calendar'}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Sparkles size={16} className="text-amber-500" />
              Ver integrações
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Usamos um calendário dedicado “ClientePro” na sua conta Google. Eventos criados/alterados aqui podem ser enviados para lá.
          </p>
          {googleFeedback && <p className="text-xs text-primary-700">{googleFeedback}</p>}
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary-600" />
              <div>
              <p className="text-sm font-semibold text-slate-900">Time & acesso</p>
              <p className="text-xs text-slate-500">Upgrade rápido e convites extras.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Ativa a gestão de Helpers e Admins neste plano.
            </div>
            <button
              type="button"
            className="w-full rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700"
            >
              Gerenciar plano
            </button>
        </SurfaceCard>
      </div>

      <SurfaceCard className="space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 size={18} className="text-red-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Excluir conta</p>
            <p className="text-xs text-slate-500">
              Digite seu e-mail para receber um link seguro de exclusão. Confirme via inbox.
            </p>
          </div>
        </div>
        <input
          type="email"
          value={deleteEmail}
          onChange={(e) => setDeleteEmail(e.target.value)}
          placeholder="seuemail@exemplo.com"
          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-300"
        />
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={!deleteEmail}
          className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <LogOut size={16} />
          Enviar confirmação por e-mail
        </button>
        {deleteFeedback && <p className="text-xs text-red-600">{deleteFeedback}</p>}
      </SurfaceCard>
    </div>
  );
};

export default OwnerSettings;

