import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Languages, LogOut, MapPin, Phone, Shield, Sparkles, User, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import type { LanguageOption } from '../../types';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponível' },
  { value: 'busy', label: 'Em rota' },
  { value: 'off', label: 'Off hoje' },
];

const LANGUAGE_OPTIONS: Array<{ value: LanguageOption; label: string; description: string }> = [
  { value: 'pt', label: 'Português', description: 'Recomendado para Brasil' },
  { value: 'en', label: 'English', description: 'Ideal para helpers bilíngues' },
  { value: 'es', label: 'Español', description: 'Clientes e colegas latinos' },
];

const HelperSettings = () => {
  const { user, logout } = useAuth();
  const { setLanguagePreference } = usePreferences();
  const [status, setStatus] = useState('available');
  const [language, setLanguage] = useState<LanguageOption>((user?.preferredLanguage as LanguageOption) ?? 'pt');
  const [languageMessage, setLanguageMessage] = useState('');
  const [notificationsMuted, setNotificationsMuted] = useState(false);

  const initials =
    user?.name
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase() ?? 'CP';

  const handleLanguageChange = (value: LanguageOption) => {
    setLanguage(value);
    setLanguagePreference(value);
    setLanguageMessage('Idioma atualizado! O app será reaberto nesta língua.');
    setTimeout(() => setLanguageMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-[32px] bg-[#050b18] text-white border border-white/10 p-6 space-y-4 shadow-[0_30px_80px_rgba(5,11,24,0.6)]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/60 font-semibold">Partner settings</p>
              <h1 className="text-3xl font-semibold">Controle seu app e alertas</h1>
              <p className="text-sm text-white/70">
                Ajuste status, idioma e notificações que aparecem no turno.
              </p>
            </div>
            <div className="text-right space-y-2">
              <p className="text-xs text-white/60 uppercase">Plano</p>
              <p className="text-sm font-semibold">Client Up • Starter</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-3 py-1.5 text-xs font-semibold"
              >
                Ver limites
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Status atual</p>
              <p className="text-lg font-semibold">{STATUS_OPTIONS.find((s) => s.value === status)?.label}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Empresa</p>
              <p className="text-lg font-semibold">{user?.companyName || 'Client Up'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-2">
              <Sparkles size={16} className="text-white/70" />
              <div>
                <p className="text-xs uppercase tracking-wide text-white/60">Turno</p>
                <p className="text-lg font-semibold">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-xl font-semibold">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Status de campo</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={`px-4 py-2 rounded-2xl text-sm font-semibold border ${
                      status === option.value ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4 space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-400">Contato rápido</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={16} /> {user?.companyName || 'Client Up'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={16} /> Central: (00) 0000-0000
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Languages size={18} className="text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Idioma do app</p>
              <p className="text-xs text-gray-500">Escolha como prefere ler os textos do portal.</p>
            </div>
          </div>
          <div className="space-y-2">
            {LANGUAGE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${
                  language === option.value ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200'
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-900">{option.label}</p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
                <input
                  type="radio"
                  name="helper-language"
                  value={option.value}
                  checked={language === option.value}
                  onChange={() => handleLanguageChange(option.value)}
                  className="w-4 h-4 accent-emerald-600"
                />
              </label>
            ))}
          </div>
          {languageMessage && <p className="text-xs text-emerald-600">{languageMessage}</p>}
        </section>

        <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Notificações</p>
              <p className="text-xs text-gray-500">Receba alertas sobre rotas, clientes e pagamentos.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
            <label className="flex items-center justify-between text-sm font-semibold text-gray-900">
              SMS e push
              <button
                type="button"
                onClick={() => setNotificationsMuted((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                  notificationsMuted ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {notificationsMuted ? <BellOff size={14} /> : <Bell size={14} />}
                {notificationsMuted ? 'Pausado' : 'Ativo'}
              </button>
            </label>
            <p className="text-xs text-gray-500">
              Você recebe atualizações instantâneas de novos clientes e mudanças na agenda.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Canais</p>
              <p className="font-semibold text-gray-900">WhatsApp + SMS</p>
              <p className="text-xs">Podemos avisar sobre rota, atrasos e feedbacks.</p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Quiet mode</p>
              <p className="font-semibold text-gray-900">Pausar por 24h</p>
              <button type="button" className="text-xs text-emerald-600 font-semibold mt-2">
                Configurar quiet mode
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Segurança e apps</p>
              <p className="text-xs text-gray-500">Gerencie acesso e conecte recursos extras.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-emerald-600" />
                Conectar agenda pessoal
              </div>
              <p className="text-xs text-gray-500 mt-1">Sincronize com Google Calendar.</p>
            </button>
            <Link
              to="/helper/today"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <User size={16} className="text-emerald-600" />
                Preferências do dia
              </div>
              <p className="text-xs text-gray-500 mt-1">Voltar para a rota ativa.</p>
            </Link>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-5 space-y-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Conta</p>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
          >
            <LogOut size={16} /> Sair do app helper
          </button>
          <p className="text-xs text-gray-500">
            Precisa de ajuda com a conta? Fale com a administradora antes de sair definitivamente.
          </p>
        </section>
      </div>
    </div>
  );
};

export default HelperSettings;

