import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Home, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ClientLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#05040f] text-white">
      <header className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#4c1d95] via-[#312e81] to-[#0f172a] opacity-90" />
        <div className="relative max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/70 font-semibold">Clean Up Portal</p>
            <h1 className="text-2xl font-semibold">Olá, {user?.name}</h1>
            <p className="text-sm text-white/70">
              Veja suas próximas visitas, recados e preferências em um só lugar.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
        <div className="relative border-t border-white/10">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 text-sm font-semibold">
            <NavLink
              to="/client/home"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-2xl transition ${
                  isActive ? 'bg-white text-gray-900 shadow-[0_10px_25px_rgba(15,23,42,0.25)]' : 'text-white/70 hover:bg-white/10'
                }`
              }
            >
              <Home size={16} /> Visão geral
            </NavLink>
            <NavLink
              to="/client/settings"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-2xl transition ${
                  isActive ? 'bg-white text-gray-900 shadow-[0_10px_25px_rgba(15,23,42,0.25)]' : 'text-white/70 hover:bg-white/10'
                }`
              }
            >
              <SettingsIcon size={16} /> Settings
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-gradient-to-b from-slate-50 via-white to-white">
        <Outlet />
      </main>

      <nav className="sm:hidden border-t border-white/10 bg-[#0b0d18]/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 grid grid-cols-2 gap-2 text-xs font-semibold">
          {[
            { to: '/client/home', icon: Home, label: 'Visão' },
            { to: '/client/settings', icon: SettingsIcon, label: 'Settings' },
          ].map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 transition ${
                  isActive ? 'bg-white text-gray-900 shadow-[0_8px_20px_rgba(15,23,42,0.35)]' : 'text-white/70'
                }`}
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default ClientLayout;

