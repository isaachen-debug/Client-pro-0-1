import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  DollarSign,
  Menu,
  X,
  PlayCircle,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const LogoMark = () => (
  <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center">
    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center relative">
      <div className="w-2 h-2 bg-primary-600 rounded-full absolute top-1" />
      <div className="w-4 h-2 bg-primary-600 rounded-full absolute bottom-1" />
      <div className="w-3 h-1 bg-white rounded-full absolute bottom-0 right-0 rotate-45 origin-bottom-left"></div>
    </div>
  </div>
);

const BrandBlock = () => (
  <div className="flex items-center space-x-2">
    <LogoMark />
    <div>
      <h1 className="text-lg font-bold text-gray-900">ClientePro</h1>
      <p className="text-xs text-gray-500">Gestão de clientes e agenda</p>
    </div>
  </div>
);

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { canInstall, install, dismissed, dismiss } = useInstallPrompt();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/start', icon: PlayCircle, label: 'Today' },
    { path: '/clientes', icon: Users, label: 'Clientes' },
    { path: '/agenda', icon: Calendar, label: 'Agenda' },
    { path: '/semana', icon: CalendarDays, label: 'Semana' },
    { path: '/financeiro', icon: DollarSign, label: 'Financeiro' },
    { path: '/profile', icon: UserCircle, label: 'Perfil' },
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
    <BrandBlock />
          </div>

          {/* Menu */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="border-t border-gray-200 p-4">
            <ProfileQuickInfo />
            <div className="mt-4 space-y-2">
              <Link
                to="/profile"
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
              <BrandBlock />
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
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
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
          <h1 className="text-lg font-bold text-gray-900">ClientePro</h1>
          <div className="w-6" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {canInstall && !dismissed && (
            <div className="px-4 pt-4">
              <div className="bg-white border border-primary-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Instale o ClientePro</p>
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
                    Instalar ClientePro
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

