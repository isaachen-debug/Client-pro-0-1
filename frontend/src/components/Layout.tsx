import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Menu,
  X,
  PlayCircle,
  UserCircle,
  LogOut,
  Building2,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { usePreferences } from '../contexts/PreferencesContext';

const LogoMark = () => (
  <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 p-[2px] shadow-lg shadow-emerald-300/30">
    <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center">
      <svg viewBox="0 0 64 64" className="w-10 h-10 text-emerald-600">
        <defs>
          <linearGradient id="clientProGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="url(#clientProGradient)" opacity="0.15" />
        <path
          d="M21 19h22a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4V23a4 4 0 0 1 4-4Z"
          fill="#fff"
          stroke="url(#clientProGradient)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M24 15v6M40 15v6"
          stroke="url(#clientProGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M24 33l5 5 11-11"
          stroke="#22c55e"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 40c4 4 9.5 6 14.5 6 8 0 13.5-3.5 18-11"
          stroke="#15803d"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="47" cy="24" r="4" fill="#22c55e" stroke="#fff" strokeWidth="2" />
        <path d="M45.5 24l1.5 1.5L49 23" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  </div>
);

const BrandBlock = ({ subtitle }: { subtitle: string }) => (
  <div className="flex items-center space-x-2">
    <LogoMark />
    <div>
      <h1 className="text-lg font-bold text-gray-900 tracking-tight">Client Pro</h1>
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
  const { t } = usePreferences();

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
        ]
      : []),
    { path: '/app/profile', icon: UserCircle, labelKey: 'nav.profile' },
  ];

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
          <p className="text-xs text-primary-600 font-medium">
            Use o menu “Perfil” para enviar logo e ajustar cores do app.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex transition-colors duration-200">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200 relative">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 pr-2">
            <BrandBlock subtitle={t('layout.brandSubtitle')} />
          </div>

          {/* Menu */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="border-t border-gray-200 p-4">
            <ProfileQuickInfo />
            <div className="mt-4 space-y-2">
              <Link
                to="/app/profile"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <UserCircle size={18} />
                <span>Perfil</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut size={18} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <BrandBlock subtitle={t('layout.brandSubtitle')} />
              <button onClick={() => setSidebarOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <nav className="px-4 py-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
              <div className="mt-6 border-t border-gray-200 pt-4 space-y-3">
                <ProfileQuickInfo hideTip />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={18} />
                  <span>Sair</span>
                </button>
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <header className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Client Pro</h1>
          <div className="w-6" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {canInstall && !dismissed && (
            <div className="px-4 pt-4">
              <div className="bg-white border border-primary-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Instale o Client Pro</p>
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
                    Instalar Client Pro
                  </button>
                </div>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

