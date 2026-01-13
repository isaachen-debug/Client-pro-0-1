import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { MOCK_TEAM } from '../constants/mocks';
import { Bell, LogOut, Moon, Settings, HelpCircle, Crown, ChevronRight, Mail, CheckCircle2, X, Phone, TrendingUp, Users, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import usePushNotifications from '../hooks/usePushNotifications';
import { pageGutters } from '../styles/uiTokens';
import { dashboardApi, teamApi, customersApi } from '../services/api'; // Added teamApi and customersApi
import { DashboardOverview, Customer } from '../types'; // Added Customer type
import OwnerSettings from './OwnerSettings';

const APP_VERSION = '1.0.0';

const Profile = () => {
  const navigate = useNavigate();
  const { isTeamMode, setIsTeamMode } = useOutletContext<{
    isTeamMode: boolean;
    setIsTeamMode: (v: boolean) => void;
  }>();
  const { user, logout, updateProfile } = useAuth();
  const { setThemePreference, theme } = usePreferences();
  const isDarkTheme = theme === 'dark';
  const pushNotifications = usePushNotifications();
  const [savingTheme, setSavingTheme] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardOverview | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Portal Access State
  const [portalOpen, setPortalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [portalForm, setPortalForm] = useState({ customerId: '', name: '', email: '', password: '' });
  const [portalSaving, setPortalSaving] = useState(false);
  const [portalMessage, setPortalMessage] = useState<{ email: string; password: string } | null>(null);
  const [portalError, setPortalError] = useState('');

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoadingMetrics(true);
        const data = await dashboardApi.getMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Erro ao carregar métricas:', err);
      } finally {
        setLoadingMetrics(false);
      }
    };
    loadMetrics();
  }, []);

  // Load customers when portal modal opens
  useEffect(() => {
    if (portalOpen && customers.length === 0) {
      loadCustomers();
    }
  }, [portalOpen]);

  const loadCustomers = async () => {
    setCustomersLoading(true);
    try {
      const data = await customersApi.list();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCustomersLoading(false);
    }
  };

  const handlePortalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalError('');
    setPortalMessage(null);

    if (!portalForm.customerId || !portalForm.email) {
      setPortalError('Selecione um cliente e informe o email.');
      return;
    }

    try {
      setPortalSaving(true);
      const response = await teamApi.createClientPortalAccess(portalForm.customerId, {
        email: portalForm.email,
        name: portalForm.name,
        password: portalForm.password
      });
      setPortalMessage({ email: response.user.email, password: response.temporaryPassword });
      setPortalForm(prev => ({ ...prev, password: '' }));
    } catch (err: any) {
      setPortalError(err?.response?.data?.error || 'Erro ao criar acesso.');
    } finally {
      setPortalSaving(false);
    }
  };

  const handlePortalCustomerChange = (id: string) => {
    const client = customers.find(c => c.id === id);
    setPortalForm(prev => ({
      ...prev,
      customerId: id,
      name: client?.name || '',
      email: client?.email || ''
    }));
  };

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
    <>
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
            <span className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm ${isTeamMode ? 'bg-indigo-600 text-white' : (isDarkTheme ? 'bg-slate-800 text-slate-200' : 'bg-slate-900 text-white')}`}>
              {isTeamMode ? 'Conta Business' : 'Conta Individual'}
            </span>
          </div>

          {/* Portal Access Button (FAB or quick action) */}
          <div className="fixed bottom-24 right-6 z-30 md:hidden">
            <button
              onClick={() => setPortalOpen(true)}
              className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 flex items-center justify-center animate-bounce-subtle"
            >
              <Crown size={24} />
            </button>
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
                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px]">✨</div>
                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px]">📊</div>
                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">+3</div>
              </div>
              <button className="text-sm font-bold hover:text-indigo-300 transition-colors flex items-center gap-1">
                Gerenciar assinatura <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Team Mode Toggle */}
          <div className={`p-1 rounded-3xl ${isDarkTheme ? 'bg-slate-900' : 'bg-white'} border ${isDarkTheme ? 'border-slate-800' : 'border-slate-100'} shadow-sm`}>
            <div className={`relative overflow-hidden rounded-[1.3rem] p-5 transition-all duration-500 ${isTeamMode ? (isDarkTheme ? 'bg-indigo-900/30 ring-1 ring-indigo-500/50' : 'bg-indigo-50 ring-1 ring-indigo-200') : (isDarkTheme ? 'bg-slate-800/50' : 'bg-slate-50')}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${isTeamMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : (isDarkTheme ? 'bg-slate-700 text-slate-400' : 'bg-white text-slate-400 shadow-sm')}`}>
                    <Users size={22} strokeWidth={isTeamMode ? 2.5 : 2} />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Modo Equipe</h3>
                    <p className={`text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Gerenciar ajudantes e rotas</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsTeamMode(!isTeamMode)}
                  className={`w-14 h-8 rounded-full border-2 transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-offset-2 ${isDarkTheme ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white'} ${isTeamMode
                    ? 'bg-indigo-600 border-indigo-600 focus:ring-indigo-500'
                    : (isDarkTheme ? 'bg-slate-800 border-slate-600 focus:ring-slate-500' : 'bg-slate-200 border-slate-300 focus:ring-slate-400')
                    }`}
                >
                  <span className={`absolute top-1 left-1 block h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ${isTeamMode ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                </button>
              </div>

              {/* Team List with Expand Animation */}
              <div className={`grid transition-all duration-500 ease-in-out ${isTeamMode ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-3">
                    <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDarkTheme ? 'text-indigo-300' : 'text-indigo-600'}`}>Minha Equipe</p>
                    {MOCK_TEAM.map((member) => (
                      <div key={member.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isDarkTheme ? 'bg-slate-800/80 border-slate-700/50 hover:bg-slate-800' : 'bg-white border-slate-200/60 hover:bg-white hover:border-indigo-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${member.avatarColor}`}>
                            {member.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>{member.name}</p>
                            <p className={`text-[10px] uppercase font-bold tracking-wide ${isDarkTheme ? 'text-slate-500' : 'text-slate-500'}`}>{member.role}</p>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${member.status === 'Working'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : member.status === 'Available'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'Working'
                            ? 'bg-emerald-500 animate-pulse'
                            : member.status === 'Available'
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                            }`} />
                          {member.status}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => navigate('/app/team/add')}
                      className={`w-full py-3 rounded-xl border-dashed border-2 flex items-center justify-center gap-2 text-sm font-bold transition-all ${isDarkTheme ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
                    >
                      + Adicionar Membro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Portal Access Card */}
        <div className={`p-1 rounded-3xl ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border shadow-sm`}>
          <button
            onClick={() => setPortalOpen(true)}
            className="w-full text-left p-5 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${isDarkTheme ? 'bg-amber-900/30 text-amber-500' : 'bg-amber-50 text-amber-600'}`}>
                <Crown size={22} />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Acesso do Cliente</h3>
                <p className={`text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Gerar credenciais de login para clientes</p>
              </div>
            </div>
            <div className={`p-2 rounded-full transition-colors ${isDarkTheme ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
              <ChevronRight size={18} className={isDarkTheme ? 'text-slate-400' : 'text-slate-500'} />
            </div>
          </button>
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
                className={`w-14 h-8 rounded-full border-2 transition-all duration-300 relative ${notificationsEnabled
                  ? (isDarkTheme ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-900 border-slate-900')
                  : (isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200')
                  } ${pushNotifications.status === 'loading' ? 'opacity-60' : ''}`}
              >
                <span className={`absolute top-1 left-1 block h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
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
                className={`w-14 h-8 rounded-full border-2 transition-all duration-300 relative ${isDark ? (isDarkTheme ? 'bg-purple-600 border-purple-600' : 'bg-slate-900 border-slate-900') : (isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200')
                  } ${savingTheme ? 'opacity-60' : ''}`}
              >
                <span className={`absolute top-1 left-1 block h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ${isDark ? 'translate-x-6' : 'translate-x-0'
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
      {
        settingsOpen && (
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
        )
      }

      {/* Modal de Suporte */}
      {
        supportOpen && (
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
                  <h3 className="text-lg font-bold mb-1">Olá, {user?.name?.split(' ')[0] || 'Parceiro'}! 👋</h3>
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
        )
      }

      {/* Portal Access Modal */}
      {
        portalOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setPortalOpen(false)} />
            <div className={`relative w-full sm:max-w-lg sm:rounded-3xl rounded-t-[2.5rem] shadow-2xl animate-sheet-up sm:animate-scale-in flex flex-col ${isDarkTheme ? 'bg-slate-900' : 'bg-white'}`}>
              <div className={`p-6 border-b flex items-center justify-between ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <h2 className={`text-xl font-black ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>Portal do Cliente</h2>
                <button onClick={() => setPortalOpen(false)} className={`p-2 rounded-full transition ${isDarkTheme ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] p-5 text-white">
                  <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Acesso Premium</p>
                  <h3 className="text-xl font-bold mb-2">Login do Cliente</h3>
                  <p className="text-sm opacity-80">Gere um acesso seguro para que seu cliente veja faturas, agendamentos e fotos.</p>
                </div>

                <form onSubmit={handlePortalSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-wide ${isDarkTheme ? 'text-slate-500' : 'text-slate-500'}`}>Cliente</label>
                    <select
                      value={portalForm.customerId}
                      onChange={(e) => handlePortalCustomerChange(e.target.value)}
                      className={`w-full p-3 rounded-xl border ${isDarkTheme ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    >
                      <option value="">Selecione um cliente...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-wide ${isDarkTheme ? 'text-slate-500' : 'text-slate-500'}`}>Email de Acesso</label>
                    <input
                      type="email"
                      value={portalForm.email}
                      onChange={(e) => setPortalForm({ ...portalForm, email: e.target.value })}
                      className={`w-full p-3 rounded-xl border ${isDarkTheme ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                      placeholder="cliente@email.com"
                    />
                  </div>

                  {portalError && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{portalError}</div>
                  )}

                  {portalMessage && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold">
                        <CheckCircle2 size={18} /> Acesso Criado!
                      </div>
                      <div className="text-sm text-emerald-800 bg-emerald-100/50 p-2 rounded-lg font-mono break-all">
                        Senha: {portalMessage.password}
                      </div>
                      <p className="text-xs text-emerald-600">Copie a senha e envie para o cliente.</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={portalSaving}
                    className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70"
                  >
                    {portalSaving ? 'Criando...' : 'Gerar Acesso'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
};

export default Profile;
