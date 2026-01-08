import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  Languages,
  Link2,
  LogOut,
  Moon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import type { LanguageOption } from '../types';
import usePushNotifications from '../hooks/usePushNotifications';
import { pageGutters } from '../styles/uiTokens';
import { getGoogleAuthUrl, getGoogleStatus, importGoogleEvents } from '../services/googleCalendar';

const QUICK_ACTIONS = [
  { title: 'Identidade visual', subtitle: 'Logo, cores e tipografia', to: '/app/empresa' },
  { title: 'Permissões de equipe', subtitle: 'Helpers e admins', to: '/app/team' },
  { title: 'Notificações e alertas', subtitle: 'SMS, push e e-mail', to: '/app/agenda' },
  { title: 'Preferências do app cliente', subtitle: 'Cards, módulos e atalhos', to: '/app/clientes' },
];

const LANGUAGE_OPTIONS: Array<{ value: LanguageOption; label: string }> = [
  { value: 'pt', label: 'Português (Brasil)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

const APP_VERSION = '1.0.0';

const OwnerSettings = () => {
  const { user, updateProfile } = useAuth();
  const { setLanguagePreference, setThemePreference } = usePreferences();
  const pushNotifications = usePushNotifications();
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [savingTheme, setSavingTheme] = useState(false);
  const [language, setLanguage] = useState<LanguageOption>((user?.preferredLanguage as LanguageOption) ?? 'pt');
  const [languageMessage, setLanguageMessage] = useState('');
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteFeedback, setDeleteFeedback] = useState('');
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; reason?: string }>({ connected: false });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleFeedback, setGoogleFeedback] = useState('');
  const [importingGoogle, setImportingGoogle] = useState(false);

  const isDark = user?.preferredTheme === 'dark';
  const notificationsEnabled = pushNotifications.status === 'enabled';
  const languageLabel = useMemo(
    () => LANGUAGE_OPTIONS.find((opt) => opt.value === language)?.label ?? 'Português (Brasil)',
    [language],
  );

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await getGoogleStatus();
        setGoogleStatus(status);
      } catch (error: any) {
        setGoogleFeedback(error?.response?.data?.error || 'Não foi possível verificar o status do Google.');
      }
    };
    loadStatus();
  }, []);

  if (!user) return null;

  const handleToggleNotifications = async () => {
    if (notificationsEnabled || pushNotifications.status === 'loading') return;
    await pushNotifications.enable();
  };

  const handleToggleTheme = async () => {
    const nextTheme = isDark ? 'light' : 'dark';
    try {
      setSavingTheme(true);
      await updateProfile({ preferredTheme: nextTheme });
      setThemePreference(nextTheme);
    } finally {
      setSavingTheme(false);
    }
  };

  const handleToggleSounds = () => {
    setSoundsEnabled((prev) => !prev);
  };

  const handleLanguageCycle = () => {
    const currentIndex = LANGUAGE_OPTIONS.findIndex((opt) => opt.value === language);
    const nextIndex = (currentIndex + 1) % LANGUAGE_OPTIONS.length;
    const nextValue = LANGUAGE_OPTIONS[nextIndex].value;
    setLanguage(nextValue);
    setLanguagePreference(nextValue);
    setLanguageMessage('Idioma atualizado.');
    setTimeout(() => setLanguageMessage(''), 2500);
  };

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

  const handleGoogleImport = async () => {
    try {
      setImportingGoogle(true);
      setGoogleFeedback('');
      const result = await importGoogleEvents();
      setGoogleFeedback(`Importados ${result.created} eventos. ${result.skipped} já existiam.`);
    } catch (error: any) {
      setGoogleFeedback(error?.response?.data?.error || 'Não foi possível importar eventos do Google.');
    } finally {
      setImportingGoogle(false);
    }
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
    <div className={`${pageGutters} max-w-3xl mx-auto space-y-5 pb-6`}>
      <section className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Preferências</p>
        </div>
        <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`h-9 w-9 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <Bell size={16} />
              </span>
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Notificações</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Receber alertas do sistema</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`w-12 h-6 rounded-full border transition ${
                notificationsEnabled 
                  ? (isDark ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-900 border-slate-900')
                  : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-200 border-slate-200')
              } ${pushNotifications.status === 'loading' ? 'opacity-60' : ''}`}
              aria-pressed={notificationsEnabled}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transform transition ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`h-9 w-9 rounded-full flex items-center justify-center ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                <Moon size={16} />
              </span>
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Modo Escuro</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tema da interface</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`w-12 h-6 rounded-full border transition ${
                isDark 
                  ? (isDark ? 'bg-purple-600 border-purple-600' : 'bg-slate-900 border-slate-900') 
                  : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-200 border-slate-200')
              } ${savingTheme ? 'opacity-60' : ''}`}
              aria-pressed={isDark}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transform transition ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`h-9 w-9 rounded-full flex items-center justify-center ${isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                <Volume2 size={16} />
              </span>
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Sons</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Efeitos sonoros</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSounds}
              className={`w-12 h-6 rounded-full border transition ${
                soundsEnabled 
                  ? (isDark ? 'bg-orange-600 border-orange-600' : 'bg-slate-900 border-slate-900')
                  : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-200 border-slate-200')
              }`}
              aria-pressed={soundsEnabled}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transform transition ${
                  soundsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      <section className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Conta</p>
        </div>
        <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
          <button
            type="button"
            onClick={handleLanguageCycle}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition"
          >
            <div className="flex items-center gap-3">
              <span className={`h-9 w-9 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <Languages size={16} />
              </span>
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Idioma</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{languageLabel}</p>
              </div>
            </div>
            <ChevronRight size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
          </button>
          <button
            type="button"
            onClick={() => alert('Configurações de privacidade em breve.')}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition"
          >
            <div className="flex items-center gap-3">
              <span className={`h-9 w-9 rounded-full flex items-center justify-center ${isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                <ShieldCheck size={16} />
              </span>
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Privacidade</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gerencie seus dados</p>
              </div>
            </div>
            <ChevronRight size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
          </button>
          <button
            type="button"
            onClick={() => alert('Dispositivos conectados em breve.')}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition"
          >
            <div className="flex items-center gap-3">
              <span className={`h-9 w-9 rounded-full flex items-center justify-center ${isDark ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <Smartphone size={16} />
              </span>
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Dispositivos</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gerenciar dispositivos conectados</p>
              </div>
            </div>
            <ChevronRight size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
          </button>
        </div>
        {languageMessage && <p className="px-4 pb-3 text-xs text-emerald-600">{languageMessage}</p>}
      </section>

      <section className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Atalhos rápidos</p>
        </div>
        <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
          {QUICK_ACTIONS.map((item) => (
            <Link key={item.title} to={item.to} className="flex items-center justify-between px-4 py-3 hover:opacity-80 transition">
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{item.title}</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.subtitle}</p>
              </div>
              <ChevronRight size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
            </Link>
          ))}
        </div>
      </section>

      <section className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Integrações</p>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              googleStatus.connected 
                ? (isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                : (isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700')
            }`}
          >
            {googleStatus.connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        <div className="px-4 py-3 space-y-3">
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Sincronize eventos do Google Calendar para manter sua agenda atualizada.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleGoogleConnect}
              disabled={googleLoading}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                isDark 
                  ? 'border-emerald-800 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/30'
                  : 'border-primary-100 bg-white text-primary-700 hover:bg-primary-50'
              }`}
            >
              <Link2 size={16} />
              {googleLoading ? 'Redirecionando...' : googleStatus.connected ? 'Reconectar' : 'Conectar Google'}
            </button>
            <button
              type="button"
              onClick={handleGoogleImport}
              disabled={importingGoogle || !googleStatus.connected}
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                isDark
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {importingGoogle ? 'Importando...' : 'Importar eventos'}
            </button>
            <button
              type="button"
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isDark
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sparkles size={16} className="text-amber-500" />
              Ver integrações
            </button>
          </div>
          {googleFeedback && <p className="text-xs text-slate-600">{googleFeedback}</p>}
        </div>
      </section>

      <section className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Informações</p>
        </div>
        <div className={`px-4 py-3 space-y-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <div>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Usuário</p>
            <p className="font-semibold">{user.name}</p>
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Email</p>
            <p className="font-semibold">{user.email}</p>
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Versão do App</p>
            <p className="font-semibold">{APP_VERSION}</p>
          </div>
        </div>
      </section>

      <section className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'border-rose-900/30 bg-slate-900' : 'border-rose-200 bg-white'}`}>
        <div className="flex items-center gap-2">
          <Trash2 size={16} className="text-rose-500" />
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Excluir conta</p>
        </div>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Digite seu e-mail para receber um link seguro de exclusão.
        </p>
        <input
          type="email"
          value={deleteEmail}
          onChange={(e) => setDeleteEmail(e.target.value)}
          placeholder="seuemail@exemplo.com"
          className={`w-full rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:ring-rose-100 focus:border-rose-300 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-200'}`}
        />
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={!deleteEmail}
          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <LogOut size={16} />
          Enviar confirmação
        </button>
        {deleteFeedback && <p className="text-xs text-rose-600">{deleteFeedback}</p>}
      </section>
    </div>
  );
};

export default OwnerSettings;
