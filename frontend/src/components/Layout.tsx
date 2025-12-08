import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  X,
  PlayCircle,
  UserCircle,
  LogOut,
  Building2,
  Grid,
  Plus,
  Search,
  UserPlus,
  ChevronDown,
  Bot,
  CalendarDays,
  Bell,
  Settings as SettingsIcon,
  HelpCircle,
  Mail,
  Star,
  Power,
  ChevronRight,
  CreditCard,
  AppWindow,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TouchEvent, UIEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { usePreferences } from '../contexts/PreferencesContext';
import brandLogo from '../assets/brand-logo.png';
import { QuickActionProvider, QuickActionKey } from '../contexts/QuickActionContext';

const LogoMark = () => (
  <div className="w-12 h-12 rounded-3xl bg-white border border-gray-100 shadow-lg shadow-emerald-300/30 flex items-center justify-center overflow-hidden">
    <img src={brandLogo} alt="Clean Up logo" className="w-10 h-10 object-contain" />
  </div>
);

const BrandBlock = ({ subtitle, className = '' }: { subtitle: string; className?: string }) => (
  <div className={`flex items-center space-x-2 ${className}`}>
    <LogoMark />
    <div>
      <h1 className="text-lg font-bold text-gray-900 tracking-tight">Clean Up</h1>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  </div>
);

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { canInstall, install, dismissed, dismiss } = useInstallPrompt();
  const { t, theme } = usePreferences();
  const isOwner = user?.role === 'OWNER';
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [morePanelOpen, setMorePanelOpen] = useState(false);
  const [mobileWorkspaceExpanded, setMobileWorkspaceExpanded] = useState(false);
  const [workspaceQuery, setWorkspaceQuery] = useState('');
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [mobileHeaderCondensed, setMobileHeaderCondensed] = useState(false);
  const [createTouchStart, setCreateTouchStart] = useState<number | null>(null);
  const [createTouchDelta, setCreateTouchDelta] = useState(0);
  const [launchTouchStart, setLaunchTouchStart] = useState<number | null>(null);
  const [launchTouchDelta, setLaunchTouchDelta] = useState(0);
  const quickActionHandlersRef = useRef(new Map<QuickActionKey, () => void>());
  const registerQuickAction = useCallback((key: QuickActionKey, handler: () => void) => {
    quickActionHandlersRef.current.set(key, handler);
    return () => {
      const current = quickActionHandlersRef.current.get(key);
      if (current === handler) {
        quickActionHandlersRef.current.delete(key);
      }
    };
  }, []);
  const triggerQuickAction = useCallback((key: QuickActionKey) => {
    const handler = quickActionHandlersRef.current.get(key);
    if (handler) {
      handler();
      return true;
    }
    return false;
  }, []);

  const handleWorkspaceNavigate = useCallback(
    (path: string) => {
      navigate(path);
      setMobileWorkspaceExpanded(false);
      setWorkspaceQuery('');
      setWorkspaceMenuOpen(false);
    },
    [navigate],
  );

  const handleWorkspaceMenuAction = useCallback(
    (path?: string, action?: () => void) => {
      if (path) {
        navigate(path);
      }
      if (action) {
        action();
      }
      setWorkspaceMenuOpen(false);
      setMobileWorkspaceExpanded(false);
    },
    [navigate],
  );

  const WorkspaceMenu = ({ className }: { className: string }) => (
    <div
      ref={workspaceMenuRef}
      className={`${className} ${
        isDarkTheme ? 'bg-[#060911] border border-white/15 text-white' : 'bg-white border border-gray-200 text-gray-900'
      } rounded-3xl shadow-[0_25px_45px_rgba(15,23,42,0.25)] p-4 space-y-3 z-30 animate-dropdown`}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">Workspace</p>
        <p className={`text-sm ${isDarkTheme ? 'text-white/70' : 'text-gray-600'}`}>Gerencie plano, apps e perfil rapidamente.</p>
      </div>
      <button
        type="button"
        onClick={() => handleWorkspaceMenuAction('/app/plans')}
        className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold ${
          isDarkTheme ? 'bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/20' : 'bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100'
        }`}
      >
        <CreditCard size={16} />
        Plans & Billing
      </button>
      <button
        type="button"
        onClick={() =>
          handleWorkspaceMenuAction(
            undefined,
            () => alert('Clean Up Apps: em breve um hub completo para novos produtos.')
          )
        }
        className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold ${
          isDarkTheme ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border border-gray-200 text-gray-900 hover:bg-gray-200'
        }`}
      >
        <AppWindow size={16} />
        Apps
      </button>
      <button
        type="button"
        onClick={() => handleWorkspaceMenuAction('/app/profile')}
        className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold ${
          isDarkTheme ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <UserCircle size={16} />
        Meu perfil
      </button>
      <button
        type="button"
        onClick={() => handleWorkspaceMenuAction('/app/settings')}
        className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold ${
          isDarkTheme ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <SettingsIcon size={16} />
        Configurações
      </button>
      <div
        className={`pt-3 space-y-2 border-t ${isDarkTheme ? 'border-white/10' : 'border-gray-100'}`}
      >
        <p className={`text-[11px] uppercase tracking-wide ${isDarkTheme ? 'text-white/50' : 'text-gray-500'}`}>Equipe</p>
        <button
          type="button"
          onClick={() => handleWorkspaceMenuAction('/app/team?view=invite')}
          className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold ${
            isDarkTheme ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border border-gray-200 text-gray-900 hover:bg-gray-200'
          }`}
        >
          <UserPlus size={16} />
          Invite users
        </button>
        <button
          type="button"
          onClick={() =>
            handleWorkspaceMenuAction(
              undefined,
              () => alert('Helper resources: em breve uma central de materiais para seu time.')
            )
          }
          className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold ${
            isDarkTheme ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <HelpCircle size={16} />
          Helper resources
        </button>
      </div>
      <button
        type="button"
        onClick={() => handleWorkspaceMenuAction(undefined, handleLogout)}
        className={`w-full flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-semibold ${
          isDarkTheme ? 'bg-red-500/10 text-red-200 border border-red-400/30 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
        }`}
      >
        <span className="flex items-center gap-2">
          <Power size={16} />
          Logout
        </span>
        <ChevronRight size={14} />
      </button>
    </div>
  );
  const quickActionContextValue = useMemo(
    () => ({
      registerQuickAction,
    }),
    [registerQuickAction],
  );

  useEffect(() => {
    if (!mobileWorkspaceExpanded) {
      setWorkspaceQuery('');
    }
  }, [mobileWorkspaceExpanded]);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const headerSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContentScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setMobileHeaderCondensed(event.currentTarget.scrollTop > 48);
  }, []);

  useEffect(() => {
    const handleWindowScroll = () => {
      const target = contentScrollRef.current;
      const scrollTop = target ? target.scrollTop : window.scrollY;
      setMobileHeaderCondensed(scrollTop > 48);
    };
    handleWindowScroll();
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const rootElement = contentScrollRef.current;
    const sentinel = headerSentinelRef.current;
    if (!rootElement || !sentinel) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setMobileHeaderCondensed(!entry.isIntersecting);
      },
      {
        root: rootElement,
        threshold: 1,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);
  const quickActionGridItems = [
    {
      key: 'clientes',
      label: 'Clientes',
      iconComponent: Users,
      path: '/app/clientes',
    },
    {
      key: 'financeiro',
      label: 'Financeiro',
      iconComponent: Wallet,
      path: '/app/financeiro',
    },
    {
      key: 'empresa',
      label: 'Empresa',
      iconComponent: Building2,
      path: '/app/empresa',
    },
    {
      key: 'equipe',
      label: 'Helpers & Clients',
      iconComponent: UserPlus2,
      path: '/app/team',
    },
  ];
  const quickCreateActions = [
    {
      key: 'helper',
      label: 'Adicionar helper',
      description: 'Convide Partners e configure acessos.',
      icon: '🤝',
      action: () => navigate('/app/team'),
    },
    {
      key: 'client',
      label: 'Adicionar cliente',
      description: 'Cadastre Clients e preferências fixas.',
      icon: '👤',
      action: () => navigate('/app/clientes'),
    },
    {
      key: 'profile',
      label: 'Perfil do cliente',
      description: 'Personalize o portal do Client.',
      icon: '✨',
      action: () => navigate('/app/clientes?tab=list'),
    },
    {
      key: 'schedule',
      label: 'Novo agendamento',
      description: 'Crie um serviço único ou recorrente.',
      icon: '📆',
      action: () => navigate('/app/agenda?quick=create'),
    },
    {
      key: 'contract',
      label: 'Enviar contrato',
      description: 'Use o wizard multi-etapas.',
      icon: '📄',
      action: () => navigate('/app/clientes?tab=contracts'),
    },
    {
      key: 'invoice',
      label: 'Registrar cobrança',
      description: 'Controle financeiro em um toque.',
      icon: '💳',
      action: () => navigate('/app/financeiro'),
    },
  ];
  const isDarkTheme = theme === 'dark';
  const mobileHeaderSpacingClass = mobileHeaderCondensed ? 'rounded-2xl px-2 py-1.5 space-y-1' : 'rounded-[28px] px-3 pt-3 pb-5 space-y-3';
  const mobileHeaderPanelSurface = isDarkTheme
    ? 'border border-white/12 bg-gradient-to-b from-[#090d19] to-[#04060d] shadow-[0_20px_60px_rgba(0,0,0,0.45)] text-white'
    : 'border border-gray-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.08)] text-gray-900';
  const mobileHeaderContainerClass = `md:hidden border-b sticky top-0 z-40 backdrop-blur-xl ${
    isDarkTheme ? 'bg-[#03050c]/95 text-white border-white/10' : 'bg-white/95 text-gray-900 border-gray-200 shadow-sm'
  }`;
  const mobileHeaderPanelClass = `${mobileHeaderSpacingClass} ${mobileHeaderPanelSurface} transition-all duration-300 ${
    mobileHeaderCondensed ? 'scale-[0.95]' : ''
  }`;
  const mobileIconButtonClass = `${isDarkTheme ? 'bg-white/10 border border-white/15 text-white' : 'bg-gray-100 border border-gray-200 text-gray-900'} rounded-2xl flex items-center justify-center`;
  const mobileInputWrapperClass = `rounded-2xl flex items-center gap-2 px-4 py-2.5 ${isDarkTheme ? 'bg-white/10 border border-white/10' : 'bg-gray-50 border border-gray-200'}`;
  const mobileInputClass = `bg-transparent flex-1 text-sm placeholder:text-current/40 focus:outline-none ${isDarkTheme ? 'text-white' : 'text-gray-900'}`;
  const mobileMutedTextClass = isDarkTheme ? 'text-white/50' : 'text-gray-500';
  const mobileSecondaryTextClass = isDarkTheme ? 'text-white/70' : 'text-gray-600';
  const sidebarSurfaceClass = isDarkTheme ? 'bg-[#05070c] text-white' : 'bg-white text-gray-900';

  const menuItems = [
    { path: '/app/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { path: '/app/start', icon: PlayCircle, labelKey: 'nav.today' },
    { path: '/app/clientes', icon: Users, labelKey: 'nav.clients' },
    { path: '/app/agenda', icon: Calendar, labelKey: 'nav.agenda' },
    { path: '/app/financeiro', icon: DollarSign, labelKey: 'nav.finance' },
    ...(user?.role === 'OWNER'
      ? [
          { path: '/app/empresa', icon: Building2, labelKey: 'nav.company' },
          { path: '/app/team', icon: Users, labelKey: 'nav.team' },
          { path: '/app/settings', icon: SettingsIcon, labelKey: 'nav.settings' },
        ]
      : []),
    { path: '/app/profile', icon: UserCircle, labelKey: 'nav.profile' },
  ];

  const workspaceLinks = useMemo(
    () => [
      { key: 'dashboard', label: t('nav.dashboard'), path: '/app/dashboard', icon: LayoutDashboard },
      { key: 'today', label: t('nav.today'), path: '/app/start', icon: PlayCircle },
      { key: 'clients', label: t('nav.clients'), path: '/app/clientes', icon: Users },
      { key: 'agenda', label: t('nav.agenda'), path: '/app/agenda', icon: Calendar },
      { key: 'finance', label: t('nav.finance'), path: '/app/financeiro', icon: DollarSign },
      ...(user?.role === 'OWNER'
        ? [
            { key: 'company', label: t('nav.company'), path: '/app/empresa', icon: Building2 },
            { key: 'team', label: t('nav.team'), path: '/app/team', icon: Users },
            { key: 'settings', label: t('nav.settings'), path: '/app/settings', icon: SettingsIcon },
          ]
        : []),
      { key: 'profile', label: t('nav.profile'), path: '/app/profile', icon: UserCircle },
    ],
    [t, user?.role],
  );

  const filteredWorkspaceLinks = useMemo(() => {
    const query = workspaceQuery.trim().toLowerCase();
    if (!query) return [];
    return workspaceLinks.filter((link) => link.label.toLowerCase().includes(query)).slice(0, 4);
  }, [workspaceQuery, workspaceLinks]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'CP';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const onCreateTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setCreateTouchStart(event.touches[0].clientY);
  };

  const onCreateTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (createTouchStart === null) return;
    const delta = event.touches[0].clientY - createTouchStart;
    setCreateTouchDelta(delta > 0 ? delta : 0);
  };

  const onCreateTouchEnd = () => {
    if (createTouchDelta > 80) {
      setQuickCreateOpen(false);
    }
    setCreateTouchStart(null);
    setCreateTouchDelta(0);
  };

  const onLaunchTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setLaunchTouchStart(event.touches[0].clientY);
  };

  const onLaunchTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (launchTouchStart === null) return;
    const delta = event.touches[0].clientY - launchTouchStart;
    setLaunchTouchDelta(delta > 0 ? delta : 0);
  };

  const onLaunchTouchEnd = () => {
    if (launchTouchDelta > 80) {
      setMorePanelOpen(false);
    }
    setLaunchTouchStart(null);
    setLaunchTouchDelta(0);
  };

  const currentQuickAction = useMemo<QuickActionKey | null>(() => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    if (path.startsWith('/app/clientes')) {
      return 'clients:add';
    }
    if (path.startsWith('/app/team')) {
      return params.get('view') === 'portal' ? 'team:portal-access' : 'team:add-helper';
    }
    if (path.startsWith('/app/agenda') || path.startsWith('/app/semana')) {
      return 'agenda:add';
    }
    return null;
  }, [location.pathname, location.search]);

  const currentSectionTitle = useMemo(() => {
    const linkMatch = workspaceLinks.find((link) => location.pathname.startsWith(link.path));
    if (linkMatch) {
      return linkMatch.label;
    }
    if (location.pathname.startsWith('/app/start')) {
      return t('nav.today');
    }
    return 'Workspace';
  }, [location.pathname, workspaceLinks, t]);

  const handleFabClick = () => {
    if (currentQuickAction && triggerQuickAction(currentQuickAction)) {
      return;
    }
    setQuickCreateOpen(true);
  };

  const [showProfileTip, setShowProfileTip] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('clientepro:profile-tip-dismissed') !== 'true';
  });

  const shouldShowProfileTip = showProfileTip && (!user?.avatarUrl || !user?.companyName);

  const dismissProfileTip = () => {
    setShowProfileTip(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('clientepro:profile-tip-dismissed', 'true');
    }
  };

  const ProfileQuickInfo = ({ hideTip = false }: { hideTip?: boolean }) => (
    <div className="relative mb-4">
      {shouldShowProfileTip && !hideTip && (
        <div className="absolute -top-3 right-0 translate-y-[-100%] bg-white border border-primary-100 shadow-lg rounded-xl p-3 text-xs text-gray-600 w-60 z-10">
          <p className="text-sm font-semibold text-gray-900">Personalize com o logo da sua empresa</p>
          <p className="mt-1">Envie uma imagem e escolha a cor principal para deixar o app com a sua cara.</p>
          <button type="button" onClick={dismissProfileTip} className="mt-2 text-primary-600 font-semibold hover:underline">
            Entendi
          </button>
        </div>
      )}
      <div className="w-full flex items-center space-x-3 p-3 rounded-xl bg-primary-50/40 border border-primary-100 text-left">
        <div className="relative">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name ?? 'Usuário'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-700 font-semibold text-base">{initials}</span>
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {user?.companyName || user?.name || 'Adicione sua marca'}
          </p>
          <p className="text-xs text-gray-500 truncate">{user?.email ?? 'email@clientepro.com'}</p>
        </div>
      </div>
    </div>
  );

  const mobileNavItems = [
    {
      key: 'home',
      label: 'Home',
      path: '/app/dashboard',
      icon: LayoutDashboard,
      type: 'route' as const,
    },
    {
      key: 'agenda',
      label: 'Schedule',
      path: '/app/agenda',
      icon: Calendar,
      type: 'route' as const,
    },
    {
      key: 'today',
      label: 'Hoje',
      path: '/app/start',
      icon: PlayCircle,
      type: 'route' as const,
    },
    {
      key: 'launch',
      label: 'Explore',
      icon: Grid,
      type: 'launcher' as const,
    },
  ];


  const handleMobileNav = (item: (typeof mobileNavItems)[number]) => {
    if (item.type === 'launcher') {
      setMorePanelOpen(true);
      return;
    }
    navigate(item.path);
  };


  return (
    <QuickActionProvider value={quickActionContextValue}>
      <div className="min-h-screen bg-gray-50 flex transition-colors duration-200">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-72 bg-[#f8f6fb] border-r border-[#eadff8] h-screen sticky top-0">
          <div className="px-5 pt-6 pb-4 space-y-4">
            <div className="flex items-center justify-start relative">
              <button
                type="button"
                onClick={() => setWorkspaceMenuOpen((prev) => !prev)}
                className="inline-flex items-center text-left group"
              >
                <BrandBlock subtitle="Gestão de clientes e agenda" className="text-left" />
              </button>
              {workspaceMenuOpen && <WorkspaceMenu className="absolute left-0 mt-3 w-72" />}
            </div>
            <div className="rounded-2xl bg-white border border-[#eadff8] px-4 py-2 flex items-center gap-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Buscar agenda, Clients ou contratos"
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <ProfileQuickInfo hideTip />
          </div>

          <nav className="flex-1 px-5 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                    isActive ? 'bg-white text-primary-700 shadow-sm border border-primary-100' : 'text-gray-600 hover:bg-white hover:border hover:border-gray-200'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} />
                    {t(item.labelKey)}
                  </span>
                  {isActive && <span className="text-xs text-primary-500">•</span>}
                </Link>
              );
            })}
          </nav>

          <div className="px-5 py-4 space-y-3 border-t border-[#eadff8]">
            <div className="rounded-2xl bg-white border border-[#eadff8] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Starter</p>
                  <p className="text-xs text-gray-500">Até 50 Clients ativos</p>
                </div>
                <span className="text-xs font-semibold text-primary-500">Plano atual</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/plans')}
                className="mt-3 w-full text-sm font-semibold text-white bg-primary-600 rounded-xl py-2 hover:bg-primary-700 transition"
              >
                Ver planos e upgrades
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white border border-red-100 text-red-600 py-2 text-sm font-semibold hover:bg-red-50 transition"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <aside className={`fixed top-0 bottom-0 left-0 right-0 z-50 overflow-y-auto ${sidebarSurfaceClass}`}>
            <div className="px-6 pt-6 pb-8 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">Profile & Settings</p>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDarkTheme ? 'bg-white/10 border border-white/15 text-white' : 'bg-gray-100 border border-gray-200 text-gray-900'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col items-center gap-3 text-center">
                <div
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold overflow-hidden ${
                    isDarkTheme ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user?.name ?? 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                  <span
                    className={`absolute bottom-2 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 ${
                      isDarkTheme ? 'border-[#05070c]' : 'border-white'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xl font-semibold">{user?.name || 'Owner'}</p>
                  <p className={isDarkTheme ? 'text-white/60 text-sm' : 'text-gray-500 text-sm'}>{user?.email}</p>
                </div>
                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/app/profile');
                      setSidebarOpen(false);
                    }}
                    className={`flex-1 rounded-2xl py-2 font-semibold text-sm border ${
                      isDarkTheme ? 'border-white/15 bg-white/5 text-white' : 'border-gray-200 bg-gray-100 text-gray-900'
                    }`}
                  >
                    Edit profile
                  </button>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => alert('Em breve você vai acompanhar resumos automáticos do time por aqui.')}
                      className={`w-full rounded-2xl py-2 font-semibold text-sm flex items-center justify-center gap-2 border ${
                        isDarkTheme ? 'border-white/15 bg-white/5 text-white' : 'border-gray-200 bg-gray-100 text-gray-900'
                      }`}
                    >
                      <Bot size={16} /> AI StandUp
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                {[
                  { label: 'My Calendar', icon: CalendarDays, path: '/app/agenda' },
                  { label: 'Notification settings', icon: Bell },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (item.path) {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition ${
                        isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Icon size={18} className={isDarkTheme ? 'text-white/70' : 'text-gray-500'} />
                      <span className="text-base">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 text-sm">
                <p className={`text-xs uppercase tracking-wide ${isDarkTheme ? 'text-white/40' : 'text-gray-500'}`}>General info</p>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className={isDarkTheme ? 'text-white' : 'text-gray-900'}>Online</span>
                </div>
                <button
                  type="button"
                  className={`flex items-center gap-2 ${isDarkTheme ? 'text-white/80' : 'text-gray-600'}`}
                  onClick={() => {
                    if (user?.email) {
                      navigator.clipboard?.writeText(user.email);
                    }
                  }}
                >
                  <Mail size={16} /> {user?.email || 'email@clientpro.com'}
                </button>
                <div className={`flex items-center gap-2 ${isDarkTheme ? 'text-white/80' : 'text-gray-600'}`}>
                  <Star size={16} /> Favorite
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <p className={`text-xs uppercase tracking-wide ${isDarkTheme ? 'text-white/40' : 'text-gray-500'}`}>Plans</p>
                <div
                  className={`rounded-2xl p-3 border ${
                    isDarkTheme ? 'border-white/10 bg-white/5 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Starter</p>
                      <p className="text-xs opacity-70">Até 50 Clients ativos</p>
                    </div>
                    <span className="text-xs font-semibold text-primary-300">Plano atual</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app/plans')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-primary-200 text-sm font-semibold text-primary-600 hover:bg-primary-50 transition"
                >
                  Ver planos e upgrades
                </button>
              </div>

            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header Mobile */}
        <header className={mobileHeaderContainerClass} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div
            className={`px-4 transition-all duration-300 ${
              mobileHeaderCondensed ? 'pt-2 pb-2' : mobileWorkspaceExpanded ? 'pt-4 pb-6' : 'pt-4 pb-4'
            }`}
          >
            {mobileHeaderCondensed ? (
              <div
                className={`flex items-center justify-between gap-3 rounded-2xl border ${
                  isDarkTheme ? 'bg-[#090d19] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
                } shadow-sm px-3 py-2`}
              >
                <p className="text-sm font-semibold truncate">{currentSectionTitle}</p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setWorkspaceMenuOpen((prev) => !prev)}
                      className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 border border-gray-200 transition-all duration-200 dark:bg-white/10 dark:border-white/15"
                      aria-label="Abrir menu rápido"
                    >
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-7 h-7 rounded-full overflow-hidden border ${
                            isDarkTheme ? 'border-white/20 bg-white/10' : 'border-white/70 bg-white'
                          }`}
                        >
                          {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user?.name ?? 'Owner'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[11px] font-semibold flex items-center justify-center h-full text-gray-900 dark:text-white">
                              {initials}
                            </span>
                          )}
                        </div>
                        <div className="w-5 h-5 rounded-full border border-gray-200 bg-white flex items-center justify-center">
                          <img src={brandLogo} alt="Clean Up" className="w-4 h-4 object-contain" />
                        </div>
                      </div>
                    </button>
                    {workspaceMenuOpen && <WorkspaceMenu className="absolute right-0 mt-3 w-56" />}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="w-9 h-9 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center dark:bg-white/10 dark:border-white/15 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40 dark:border-white/20 bg-white">
                      <img src={brandLogo} alt="Clean Up" className="w-full h-full object-contain" />
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className={mobileHeaderPanelClass}>
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setWorkspaceMenuOpen((prev) => !prev)}
                      className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 border border-gray-200 transition-all duration-200 dark:bg-white/10 dark:border-white/15"
                      aria-label="Abrir menu rápido"
                    >
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-8 h-8 rounded-full overflow-hidden border ${
                            isDarkTheme ? 'bg-white/20 border border-white/30' : 'bg-white border border-gray-200'
                          }`}
                        >
                          {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user?.name ?? 'Owner'} className="w-full h-full object-cover" />
                          ) : (
                            <span className={`text-xs font-semibold flex items-center justify-center h-full ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                              {initials}
                            </span>
                          )}
                        </div>
                        <div className="w-6 h-6 rounded-full border border-gray-200 bg-white flex items-center justify-center">
                          <img src={brandLogo} alt="Clean Up" className="w-4 h-4 object-contain" />
                        </div>
                      </div>
                    </button>
                    {workspaceMenuOpen && <WorkspaceMenu className="absolute left-0 mt-3 w-56" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[11px] uppercase tracking-wide ${mobileMutedTextClass}`}>{currentSectionTitle}</p>
                    <button
                      type="button"
                      onClick={() => setMobileWorkspaceExpanded((prev) => !prev)}
                      aria-expanded={mobileWorkspaceExpanded}
                      className={`flex items-center gap-1 text-base font-semibold ${
                        isDarkTheme ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {user?.companyName || 'Clean Up'}
                      <ChevronDown
                        size={16}
                        className={`${mobileSecondaryTextClass} transition-transform ${
                          mobileWorkspaceExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className={`w-12 h-12 ${mobileIconButtonClass} transition-all duration-200`}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden bg-white">
                      <img src={brandLogo} alt="Clean Up" className="w-7 h-7 object-contain" />
                    </div>
                  </button>
                </div>
                {mobileWorkspaceExpanded && (
                  <>
                    <div className="mt-4">
                      <div className={mobileInputWrapperClass}>
                        <Search size={16} className={mobileSecondaryTextClass} />
                        <input
                          type="text"
                          placeholder="Buscar agenda, Clients ou contratos"
                          value={workspaceQuery}
                          onChange={(e) => setWorkspaceQuery(e.target.value)}
                          className={mobileInputClass}
                        />
                        <button
                          type="button"
                          onClick={() => navigate('/app/agenda')}
                          className={`text-xs font-semibold ${isDarkTheme ? 'text-emerald-300' : 'text-emerald-600'}`}
                        >
                          Schedule
                        </button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {workspaceQuery ? (
                          filteredWorkspaceLinks.length ? (
                            filteredWorkspaceLinks.map((link) => {
                              const Icon = link.icon;
                              return (
                                <button
                                  key={link.key}
                                  type="button"
                                  onClick={() => handleWorkspaceNavigate(link.path)}
                                  className={`w-full flex items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-semibold ${
                                    isDarkTheme ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <Icon size={16} />
                                    {link.label}
                                  </span>
                                  <ChevronRight size={16} className={isDarkTheme ? 'text-white/60' : 'text-gray-500'} />
                                </button>
                              );
                            })
                          ) : (
                            <p className={`${mobileSecondaryTextClass} text-xs`}>Nenhum módulo encontrado.</p>
                          )
                        ) : (
                          <div className={`${mobileSecondaryTextClass} text-sm`}>
                            <p>Veja métricas detalhadas no Dashboard.</p>
                          </div>
                        )}
                        {!workspaceQuery && (
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => navigate('/app/plans')}
                              className={`rounded-2xl px-3 py-2 text-sm font-semibold flex items-center justify-between ${
                                isDarkTheme ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'
                              }`}
                            >
                              Plans
                              <ChevronRight size={14} className={isDarkTheme ? 'text-white/60' : 'text-gray-500'} />
                            </button>
                            <button
                              type="button"
                              onClick={() => alert('Apps adicionais do ecossistema Clean Up chegam em breve.')}
                              className={`rounded-2xl px-3 py-2 text-sm font-semibold flex items-center justify-between ${
                                isDarkTheme ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'
                              }`}
                            >
                              Apps
                              <ChevronRight size={14} className={isDarkTheme ? 'text-white/60' : 'text-gray-500'} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main ref={contentScrollRef} onScroll={handleContentScroll} className="flex-1 overflow-auto pb-28 sm:pb-0">
          <div ref={headerSentinelRef} aria-hidden="true" className="h-px w-full opacity-0 pointer-events-none" />
          {canInstall && !dismissed && (
            <div className="px-4 pt-4">
              <div className="bg-white border border-primary-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Instale o Clean Up</p>
                    <p className="text-xs text-gray-500">
                      Adicione o app na tela inicial para acessar mais rápido.
                    </p>
                  </div>
                  <button
                    onClick={dismiss}
                    className="text-gray-400 hover:text-gray-600 text-sm font-medium"
                  >
                    Não agora
                  </button>
                </div>
                <div>
                  <button
                    onClick={install}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                  >
                    Instalar Clean Up
                  </button>
                </div>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      {isOwner && (
        <>
          <div className="md:hidden fixed inset-x-4 bottom-4 z-40">
            <div className="relative">
              <div className="bg-gradient-to-r from-[#1c0f2a] via-[#130a1f] to-[#1c0f2a] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.55)] rounded-[32px] px-6 py-4 flex items-center justify-between animate-nav-glow">
                <div className="flex items-center gap-6">
                  {mobileNavItems.slice(0, 2).map((item) => {
                    const Icon = item.icon;
                    const isActive = item.type === 'route' && location.pathname.startsWith(item.path);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleMobileNav(item)}
                        className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
                          isActive ? 'text-white' : 'text-white/60'
                        }`}
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-6">
                  {mobileNavItems.slice(2).map((item) => {
                    const Icon = item.icon;
                    const isActive = item.type === 'route' && location.pathname.startsWith(item.path ?? '');
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleMobileNav(item)}
                        className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
                          isActive ? 'text-white' : 'text-white/60'
                        }`}
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={handleFabClick}
                className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full w-14 h-14 bg-white text-gray-900 border border-white/60 flex items-center justify-center animate-fab-glow transition-transform duration-300 hover:-translate-y-1"
              >
                <Plus size={28} />
              </button>
            </div>
          </div>

          {quickCreateOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
              <div className="flex-1" onClick={() => setQuickCreateOpen(false)} />
              <div
                className="rounded-t-[32px] bg-white p-6 space-y-5 border-t border-gray-200 animate-sheet-up"
                style={{ transform: createTouchDelta ? `translateY(${createTouchDelta}px)` : undefined }}
                onTouchStart={onCreateTouchStart}
                onTouchMove={onCreateTouchMove}
                onTouchEnd={onCreateTouchEnd}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Create</p>
                    <p className="text-xs text-gray-500">Escolha uma ação rápida</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickCreateOpen(false)}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="rounded-2xl bg-gray-100 flex items-center gap-2 px-4 py-2">
                  <Search size={16} className="text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar ações"
                    className="bg-transparent flex-1 text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-3">
                  {quickCreateActions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => {
                        setQuickCreateOpen(false);
                        action.action();
                      }}
                      className="w-full flex items-center gap-3 text-left px-3 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 text-xl flex items-center justify-center">
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                        <p className="text-xs text-gray-500">{action.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {morePanelOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-md">
              <div className="flex-1" onClick={() => setMorePanelOpen(false)} />
              <div
                className="rounded-t-[36px] bg-gradient-to-br from-[#120624] via-[#0c152e] to-[#04231f] p-6 space-y-5 border-t border-emerald-400/30 text-white animate-launch-up"
                style={{ transform: launchTouchDelta ? `translateY(${launchTouchDelta}px)` : undefined }}
                onTouchStart={onLaunchTouchStart}
                onTouchMove={onLaunchTouchMove}
                onTouchEnd={onLaunchTouchEnd}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/70">Launchpad</p>
                    <p className="text-2xl font-semibold">Explore Clean Up</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMorePanelOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-white">
                  {quickActionGridItems.map((item) => {
                    const Icon = item.iconComponent;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setMorePanelOpen(false);
                          navigate(item.path);
                        }}
                        className="rounded-3xl bg-white/5 border border-white/10 py-4 flex flex-col items-center gap-2 hover:bg-emerald-500/10 hover:border-emerald-400/40 transition"
                      >
                        <span className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                          <Icon size={18} className="text-white" />
                        </span>
                        <p className="text-xs font-semibold text-white">{item.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </QuickActionProvider>
  );
};

export default Layout;

