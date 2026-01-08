import { useState } from 'react';
import { Bell, LogOut, Moon, Settings, HelpCircle, Crown, ChevronRight, User, Mail, Shield, CheckCircle2, X, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import usePushNotifications from '../hooks/usePushNotifications';
import { pageGutters } from '../styles/uiTokens';
import OwnerSettings from './OwnerSettings';

const APP_VERSION = '1.0.0';

const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const { setThemePreference, theme } = usePreferences();
  const isDarkTheme = theme === 'dark';
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

  // Mock de plano
  const planInfo = {
    name: 'Plano Pro',
    status: 'Ativo',
    features: ['Agendamentos ilimitados', 'Gestão financeira', 'Suporte prioritário'],
    renewalDate: '10 Fev 2026'
  };

  return (
    <div className={`min-h-full ${isDarkTheme ? 'bg-[#0f172a]' : 'bg-[#f6f7fb]'}`}>
      {/* Header Premium com Curva Suave */}
      <div className={`pt-12 pb-12 px-6 rounded-b-[2.5rem] shadow-sm border-b relative overflow-hidden ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b -z-10 ${isDarkTheme ? 'from-slate-800/50 to-transparent' : 'from-slate-50/50 to-transparent'}`} />
        
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h1 className={`text-3xl font-black tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Meu Perfil</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className={`h-11 w-11 rounded-2xl border shadow-sm flex items-center justify-center transition-all active:scale-95 ${isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              aria-label="Configurações"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={() => setSupportOpen(true)}
              className={`h-11 w-11 rounded-2xl border shadow-sm flex items-center justify-center transition-all active:scale-95 ${isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              aria-label="Ajuda"
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </div>

        {/* Profile Info Centralizado */}
        <div className="flex flex-col items-center relative z-10">
          <div className="relative mb-4 group cursor-pointer">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden border-4 shadow-xl group-hover:scale-105 transition-transform duration-300 ${isDarkTheme ? 'bg-slate-800 text-white border-slate-700 shadow-black/30' : 'bg-slate-900 text-white border-white shadow-slate-200'}`}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name ?? 'Perfil'} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className={`absolute bottom-1 right-1 w-8 h-8 border-4 rounded-full flex items-center justify-center shadow-md ${isDarkTheme ? 'bg-emerald-600 border-slate-900' : 'bg-emerald-500 border-white'}`}>
              <CheckCircle2 size={12} className="text-white" strokeWidth={4} />
            </div>
          </div>
          
          <h2 className={`text-2xl font-black mb-1 ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>{user.name || 'Usuário'}</h2>
          <p className={`font-medium px-4 py-1 rounded-full text-sm mb-4 ${isDarkTheme ? 'text-slate-400 bg-slate-800/50' : 'text-slate-500 bg-slate-100/50'}`}>
            {user.email}
          </p>
          <span className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm ${isDarkTheme ? 'bg-slate-800 text-slate-200' : 'bg-slate-900 text-white'}`}>
            {roleLabel}
          </span>
        </div>
      </div>

      <div className={`${pageGutters} max-w-3xl mx-auto space-y-6 pb-24 pt-6`}>
        {/* Card de Plano - Novo Destaque */}
        <div className={`group relative overflow-hidden rounded-[2rem] p-6 shadow-xl cursor-pointer transition-transform hover:scale-[1.01] ${isDarkTheme ? 'bg-slate-900 text-white shadow-slate-900/30' : 'bg-slate-900 text-white shadow-slate-900/10'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-5 transform group-hover:scale-110 transition-transform duration-700">
            <Crown size={140} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider border border-white/10">
                  {planInfo.status}
                </span>
              </div>
              <h3 className="text-3xl font-black mb-1">{planInfo.name}</h3>
              <p className="text-slate-400 text-sm">Renova em {planInfo.renewalDate}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
              <Crown size={24} className="text-amber-400 fill-amber-400" />
            </div>
          </div>
          
          <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
            <div className="flex -space-x-2">
               {/* Decorative circles representing features */}
               <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px]">✨</div>
               <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px]">📊</div>
               <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">+3</div>
            </div>
            <button className="text-sm font-bold hover:text-indigo-300 transition-colors flex items-center gap-1">
              Gerenciar assinatura <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Configurações Rápidas */}
        <div className="space-y-4">
          <p className={`px-2 text-xs font-bold uppercase tracking-widest ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>Preferências</p>
          
          <div className={`rounded-3xl p-2 shadow-sm border space-y-1 ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className={`flex items-center justify-between p-3 rounded-2xl transition-colors cursor-pointer group ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${isDarkTheme ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <Bell size={22} />
                </div>
                <div>
                  <p className={`text-base font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Notificações</p>
                  <p className={`text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Alertas de agendamentos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleNotifications}
                className={`w-14 h-8 rounded-full border-2 transition-all duration-300 relative ${
                  notificationsEnabled 
                    ? (isDarkTheme ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-900 border-slate-900')
                    : (isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200')
                } ${pushNotifications.status === 'loading' ? 'opacity-60' : ''}`}
              >
                <span className={`absolute top-1 left-1 block h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-2xl transition-colors cursor-pointer group ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${isDarkTheme ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                  <Moon size={22} />
                </div>
                <div>
                  <p className={`text-base font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Modo Escuro</p>
                  <p className={`text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Tema do aplicativo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleTheme}
                className={`w-14 h-8 rounded-full border-2 transition-all duration-300 relative ${
                  isDark ? (isDarkTheme ? 'bg-purple-600 border-purple-600' : 'bg-slate-900 border-slate-900') : (isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200')
                } ${savingTheme ? 'opacity-60' : ''}`}
              >
                <span className={`absolute top-1 left-1 block h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ${
                  isDark ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Botão Sair */}
        <button
          type="button"
          onClick={logout}
          className={`w-full font-bold p-5 rounded-3xl shadow-sm border transition-all flex items-center justify-center gap-3 active:scale-95 ${isDarkTheme ? 'bg-slate-900 border-red-900/30 text-red-400 hover:bg-red-900/10' : 'bg-white text-rose-600 border-rose-100 hover:bg-rose-50 hover:border-rose-200'}`}
        >
          <LogOut size={20} />
          <span>Encerrar sessão</span>
        </button>
        
        <p className={`text-center text-xs font-bold ${isDarkTheme ? 'text-slate-600' : 'text-slate-300'}`}>Versão {APP_VERSION}</p>
      </div>

      {/* Modal de Configurações */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSettingsOpen(false)} />
          <div className={`relative w-full sm:max-w-lg sm:rounded-3xl rounded-t-[2.5rem] shadow-2xl animate-sheet-up sm:animate-scale-in max-h-[90vh] overflow-hidden flex flex-col ${isDarkTheme ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <h2 className={`text-xl font-black ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Configurações</h2>
              <button onClick={() => setSettingsOpen(false)} className={`p-2 rounded-full transition ${isDarkTheme ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <OwnerSettings />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Suporte */}
      {supportOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSupportOpen(false)} />
          <div className={`relative w-full sm:max-w-lg sm:rounded-3xl rounded-t-[2.5rem] shadow-2xl animate-sheet-up sm:animate-scale-in max-h-[90vh] overflow-hidden flex flex-col ${isDarkTheme ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <h2 className={`text-xl font-black ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Central de Ajuda</h2>
              <button onClick={() => setSupportOpen(false)} className={`p-2 rounded-full transition ${isDarkTheme ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg shadow-indigo-500/20">
                <h3 className="text-lg font-bold mb-1">Olá, {user.name?.split(' ')[0]}! 👋</h3>
                <p className="text-indigo-100 text-sm mb-4">Estamos aqui para ajudar você a aproveitar o máximo do app.</p>
                <button className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-50 transition">
                  Iniciar Chat
                </button>
              </div>

              <div className="space-y-4">
                <h3 className={`text-sm font-bold uppercase tracking-wide ${isDarkTheme ? 'text-slate-500' : 'text-slate-900'}`}>Canais de Atendimento</h3>
                <div className="space-y-2">
                  {[
                    { icon: Mail, label: 'Email', value: 'suporte@clientpro.com', action: 'Enviar email' },
                    { icon: Phone, label: 'WhatsApp', value: '(11) 99999-9999', action: 'Enviar mensagem' },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center justify-between p-4 rounded-2xl border shadow-sm transition ${isDarkTheme ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDarkTheme ? 'bg-slate-700 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                          <item.icon size={20} />
                        </div>
                        <div>
                          <p className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>{item.label}</p>
                          <p className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>{item.value}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className={isDarkTheme ? 'text-slate-600' : 'text-slate-300'} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={`text-sm font-bold uppercase tracking-wide ${isDarkTheme ? 'text-slate-500' : 'text-slate-900'}`}>Dúvidas Frequentes</h3>
                <div className={`divide-y border rounded-3xl overflow-hidden ${isDarkTheme ? 'divide-slate-800 border-slate-800 bg-slate-900' : 'divide-slate-100 border-slate-100 bg-white'}`}>
                  {[
                    'Como alterar minha senha?',
                    'Como exportar relatórios?',
                    'Configurando pagamentos',
                  ].map((faq) => (
                    <button key={faq} className={`w-full flex items-center justify-between p-4 text-left transition ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                      <span className={`text-sm font-medium ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>{faq}</span>
                      <ChevronRight size={16} className={isDarkTheme ? 'text-slate-600' : 'text-slate-300'} />
                    </button>
                  ))}
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
