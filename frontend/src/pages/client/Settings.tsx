import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, BookOpenCheck, ChevronRight, Languages, LogOut, Settings as SettingsIcon, ShieldCheck, Star, Trash2, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import type { LanguageOption } from '../../types';

const STATUS_OPTIONS = [
  { label: 'Disponível', value: 'available' },
  { label: 'Em viagem', value: 'travel' },
  { label: 'Precisa reagendar', value: 'reschedule' },
];

const LANGUAGE_OPTIONS: Array<{ value: LanguageOption; label: string; description: string }> = [
  { value: 'pt', label: 'Português', description: 'Recomendado para Brasil' },
  { value: 'en', label: 'English', description: 'Ideal para helpers' },
  { value: 'es', label: 'Español', description: 'Clientes latinos' },
];

const QUICK_LINKS = [
  { icon: BookOpenCheck, title: 'My Calendar', subtitle: 'Confira próximas visitas' },
  { icon: BellOff, title: 'Mute notifications', subtitle: 'Pausar lembretes por 24h' },
  { icon: SettingsIcon, title: 'Notification settings', subtitle: 'SMS, push e e-mail' },
  { icon: ShieldCheck, title: 'Invite users', subtitle: 'Adicione alguém da família' },
  { icon: Star, title: 'Help & resources', subtitle: 'FAQ e suporte humanizado' },
];

const ClientSettings = () => {
  const { user } = useAuth();
  const { setLanguagePreference } = usePreferences();
  const [status, setStatus] = useState(STATUS_OPTIONS[0].value);
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
    setLanguageMessage('Idioma atualizado. Você verá o portal traduzido na próxima visita.');
    setTimeout(() => setLanguageMessage(''), 3500);
  };

  const handleDeleteAccount = () => {
    if (!user?.email) return;
    if (deleteEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteFeedback('Digite o seu e-mail exatamente como aparece na conta.');
      return;
    }
    setDeleteFeedback('Enviamos um link seguro para o seu e-mail. Confirme por lá para concluir.');
    setDeleteEmail('');
    setTimeout(() => setDeleteFeedback(''), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        <section className="bg-white rounded-[32px] border border-gray-100 shadow-[0_20px_60px_rgba(15,23,42,0.05)] p-6 space-y-4">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-20 h-20 rounded-full bg-gray-900 text-white flex items-center justify-center text-2xl font-semibold">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user?.name ?? 'Cliente'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-xs font-semibold px-3 py-1 rounded-full border border-gray-200 bg-white"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/client/home"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <UserCircle2 size={16} />
              Ver perfil
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 text-primary-700 px-3 py-2 text-sm font-semibold"
            >
              <Bell size={16} />
              Editar alertas
            </button>
          </div>
        </section>

        <section className="bg-white rounded-[28px] border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.3em]">Atalhos</p>
          </div>
          <div className="divide-y divide-gray-100">
            {QUICK_LINKS.map((item) => (
              <button
                key={item.title}
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
              >
                <span className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600">
                  <item.icon size={16} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.subtitle}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-[28px] border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Languages size={18} className="text-primary-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Idioma do portal</p>
              <p className="text-xs text-gray-500">Escolha como prefere ler os textos.</p>
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
                  name="language"
                  value={option.value}
                  checked={language === option.value}
                  onChange={() => handleLanguageChange(option.value)}
                  className="w-4 h-4 accent-primary-600"
                />
              </label>
            ))}
          </div>
          {languageMessage && <p className="text-xs text-primary-600">{languageMessage}</p>}
        </section>

        <section className="bg-white rounded-[28px] border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 size={18} className="text-red-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Excluir conta</p>
              <p className="text-xs text-gray-500">
                Digite seu e-mail para receber o link seguro de exclusão. Você precisa confirmar via inbox.
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
            className="inline-flex items-center gap-2 rounded-2xl bg-red-500 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
            disabled={!deleteEmail}
          >
            <LogOut size={16} />
            Enviar confirmação por e-mail
          </button>
          {deleteFeedback && <p className="text-xs text-red-600">{deleteFeedback}</p>}
        </section>

        <section className="bg-white rounded-[28px] border border-gray-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.3em]">General info</p>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-gray-900">Status</p>
              <p className="text-xs text-gray-500">Online</p>
            </div>
            <span className="text-emerald-600 font-semibold text-xs px-3 py-1 rounded-full bg-emerald-50">Online</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-gray-900">E-mail de contato</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <a href={`mailto:${user?.email}`} className="text-primary-600 text-xs font-semibold">
              Enviar e-mail
            </a>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-gray-900">Favoritos</p>
              <p className="text-xs text-gray-500">Ambientes marcados</p>
            </div>
            <span className="text-gray-400 text-lg">★</span>
          </div>
        </section>

        <section className="bg-white rounded-[28px] border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-gray-900">Plano atual</p>
              <p className="text-xs text-gray-500">Starter — até 50 visitas/ano</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">Plano atual</span>
          </div>
          <button
            type="button"
            className="w-full rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700"
          >
            Ver planos e upgrades
          </button>
        </section>
      </div>
    </div>
  );
};

export default ClientSettings;

