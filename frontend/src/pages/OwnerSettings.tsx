import { useState } from 'react';
import { Link } from 'react-router-dom';
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

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#05040f] text-white shadow-[0_40px_120px_rgba(5,4,15,0.55)]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#4c1d95] via-[#312e81] to-[#0f172a] opacity-90" />
        <div className="relative p-6 md:p-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/70 font-semibold">Profile & Settings</p>
            <h1 className="text-3xl md:text-4xl font-semibold">Centralize identidade, idioma e segurança</h1>
            <p className="text-sm text-white/70 max-w-2xl">
              Atualize as informações da empresa, personalize o portal do cliente e gerencie a segurança da sua conta.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2">
                Plano:{' '}
                <span className="uppercase tracking-wide">{(user?.planStatus ?? 'trial').toLowerCase()}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white/80">
                Equipe ativa monitorada
              </span>
            </div>
          </div>
          <div className="w-full md:w-auto flex flex-col gap-3">
            <div className="rounded-3xl border border-white/20 bg-white/10 px-5 py-4 space-y-1">
              <p className="text-sm text-white/70">Conta criada</p>
              <p className="text-3xl font-semibold">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
              <p className="text-xs text-white/60">Status: {user?.isActive ? 'Ativa' : 'Inativa'}</p>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80 space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <Sparkles size={16} className="text-primary-200" />
                Dica do dia
              </p>
              <p className="text-xs text-white/70">
                Atualize as preferências abaixo para alinhar portal do cliente, app das helpers e materiais de venda.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-2xl font-semibold overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user?.name ?? 'Avatar'} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{user?.name ?? 'Admin'}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                to="/app/empresa"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <User size={16} />
                Ver perfil
              </Link>
              <Link
                to="/app/profile"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700"
              >
                <SettingsIcon size={16} />
                Editar dados da empresa
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.3em]">Atalhos</p>
            </div>
            <div className="divide-y divide-gray-100">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.title}
                  to={action.to}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
                >
                  <span className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600">
                    <action.icon size={16} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                    <p className="text-xs text-gray-500">{action.subtitle}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-gradient-to-br from-[#f7f8ff] via-white to-[#fef9ff] p-6 shadow-[0_25px_70px_rgba(49,46,129,0.12)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-semibold">Integrações</p>
                <h3 className="text-lg font-semibold text-gray-900">Google Calendar e apps externos</h3>
                <p className="text-sm text-gray-500">
                  Sincronize agendas dos partners com os eventos oficiais e mantenha tudo atualizado em tempo real.
                </p>
              </div>
              <span className="text-[11px] uppercase tracking-wide text-indigo-500 font-semibold bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
                Em breve
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                <Link2 size={16} />
                Conectar Google Calendar
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Sparkles size={16} className="text-amber-500" />
                Ver integrações
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Assim que liberar, você poderá aprovar acessos, definir agendas padrão e acompanhar sincronismo por aqui.
            </p>
          </div>

          <div className="bg-white rounded-[28px] border border-gray-100 shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Languages size={18} className="text-primary-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Idioma padrão</p>
                <p className="text-xs text-gray-500">Aplica-se ao dashboard, portal e notificações.</p>
              </div>
            </div>
            <div className="space-y-2">
              {LANGUAGE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${
                    language === option.value ? 'border-primary-200 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
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
          </div>

          <div className="bg-white rounded-[28px] border border-gray-100 shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Trash2 size={18} className="text-red-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Excluir conta</p>
                <p className="text-xs text-gray-500">
                  Digite seu e-mail para receber um link seguro de exclusão. Você precisa confirmar via inbox.
                </p>
              </div>
            </div>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-300"
            />
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={!deleteEmail}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <LogOut size={16} />
              Enviar confirmação por e-mail
            </button>
            {deleteFeedback && <p className="text-xs text-red-600">{deleteFeedback}</p>}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-primary-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Alertas ativos</p>
                <p className="text-xs text-gray-500">SMS + push para clientes e helpers</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              'Notificações instantâneas habilitadas. Você pode pausar por 24h.'
            </div>
            <button
              type="button"
              className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ajustar canais
            </button>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Plano e equipe</p>
                <p className="text-xs text-gray-500">Upgrade rápido e convites extras</p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Ativa a gestão de Helpers e Admins neste plano.
            </div>
            <button
              type="button"
              className="w-full rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700"
            >
              Gerenciar plano
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default OwnerSettings;

