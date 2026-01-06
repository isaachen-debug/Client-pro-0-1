import { useState } from 'react';
import { Bell, LogOut, Moon, Settings, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import usePushNotifications from '../hooks/usePushNotifications';
import { pageGutters } from '../styles/uiTokens';
import OwnerSettings from './OwnerSettings';

const APP_VERSION = '1.0.0';

const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const { setThemePreference } = usePreferences();
  const pushNotifications = usePushNotifications();
  const [savingTheme, setSavingTheme] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  if (!user) return null;

  const initials =
    user.name?.trim()
      ? user.name
          .split(' ')
          .map((word) => word[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : 'CP';

  const roleLabel =
    user.role === 'OWNER' ? 'Administrador' : user.role === 'HELPER' ? 'Helper' : 'Cliente';

  const isDark = user.preferredTheme === 'dark';
  const notificationsEnabled = pushNotifications.status === 'enabled';

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

  const handleToggleNotifications = async () => {
    if (notificationsEnabled || pushNotifications.status === 'loading') return;
    await pushNotifications.enable();
  };

  const rowClass =
    'w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0';

  return (
    <div className="min-h-full bg-slate-50">
      <div className="bg-white pt-14 pb-8 px-5 rounded-b-[2rem] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-base font-semibold text-slate-900">Perfil</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
              aria-label="Configurações"
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
              aria-label="Ajuda"
              onClick={() => setSupportOpen(true)}
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-24 h-24 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-semibold overflow-hidden border-4 border-white shadow-lg">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name ?? 'Perfil'} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900">{user.name || 'Seu nome'}</h2>
          <p className="text-sm text-slate-500">{user.email}</p>
          <div className="mt-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wide rounded-full">
            {roleLabel}
          </div>
        </div>
      </div>

      <div className={`${pageGutters} max-w-3xl mx-auto space-y-6 pb-16 pt-6`}>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Configurações</p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className={rowClass}>
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bell size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notificações</p>
                  <p className="text-xs text-slate-500">Receber alertas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleNotifications}
                className={`w-12 h-6 rounded-full border transition ${
                  notificationsEnabled ? 'bg-slate-900 border-slate-900' : 'bg-slate-200 border-slate-200'
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

            <div className={rowClass}>
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Moon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Modo Escuro</p>
                  <p className="text-xs text-slate-500">Aparência do app</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleTheme}
                className={`w-12 h-6 rounded-full border transition ${
                  isDark ? 'bg-slate-900 border-slate-900' : 'bg-slate-200 border-slate-200'
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
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suporte</p>
          </div>
          <div className="divide-y divide-slate-100">
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                  <HelpCircle size={18} />
                </div>
                <span className="font-medium text-slate-800">Ajuda & FAQ</span>
              </div>
              <span className="text-slate-400">↗</span>
            </button>
            <div className="w-full flex items-center justify-between px-4 py-3 bg-white">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">
                  v1
                </div>
                <span className="font-medium text-slate-800">Versão do App</span>
              </div>
              <span className="text-sm text-slate-500"> {APP_VERSION}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full bg-white text-rose-600 font-semibold p-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 border border-rose-100 hover:bg-rose-50 transition"
        >
          <LogOut size={20} />
          <span>Sair da conta</span>
        </button>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0 overflow-auto">
            <div className="min-h-full bg-white">
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                <p className="text-sm font-semibold text-slate-900">Configurações</p>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
                  aria-label="Fechar configurações"
                >
                  ✕
                </button>
              </div>
              <div className="px-4 py-4">
                <OwnerSettings />
              </div>
            </div>
          </div>
        </div>
      )}

      {supportOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0 overflow-auto">
            <div className="min-h-full bg-slate-50">
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                <p className="text-sm font-semibold text-slate-900">Suporte</p>
                <button
                  type="button"
                  onClick={() => setSupportOpen(false)}
                  className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center"
                  aria-label="Fechar suporte"
                >
                  ✕
                </button>
              </div>

              <div className="px-4 py-4 space-y-4">
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-4 text-white">
                  <p className="text-base font-semibold">Como podemos ajudar?</p>
                  <p className="text-xs text-white/85">Estamos aqui para resolver suas duvidas e problemas.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">Formas de Contato</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[
                      { title: 'Email', value: 'suporte@exemplo.com' },
                      { title: 'Telefone', value: '(11) 99999-9999' },
                      { title: 'Chat ao Vivo', value: 'Seg-Sex, 9h as 18h' },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.value}</p>
                        </div>
                        <span className="text-slate-400">↗</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">Perguntas Frequentes</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[
                      {
                        title: 'Como adicionar um novo evento?',
                        text: 'Vá para a pagina Agenda e clique no botao "+".',
                      },
                      {
                        title: 'Como gerenciar clientes?',
                        text: 'Acesse a aba Clientes no menu inferior e use o botao "+".',
                      },
                      {
                        title: 'Como controlar o financeiro?',
                        text: 'Use a pagina Financeiro para registrar receitas e despesas.',
                      },
                    ].map((item) => (
                      <div key={item.title} className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">Documentacao</p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Guia do Usuario</p>
                      <p className="text-xs text-slate-500">Manual completo de uso do sistema</p>
                    </div>
                    <span className="text-slate-400">↗</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
