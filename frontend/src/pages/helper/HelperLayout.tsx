import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, MapPin, Menu, User, X, Sparkles, CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';

const HelperLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const tabs = [
    { to: '/helper/today', label: 'Hoje' },
    { to: '/helper/settings', label: 'Configurações' },
    { to: '/helper/appointments', label: 'Histórico', disabled: true },
  ];

  const today = useMemo(() => {
    return format(new Date(), "EEEE, dd 'de' MMM", { locale: ptBR }).replace(/^./, (c) => c.toUpperCase());
  }, []);

  return (
    <div className="min-h-screen bg-[#03050f] text-white flex flex-col">
      <header className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d3f2d] via-[#0b1f3d] to-[#050710] opacity-90" />
        <div className="relative max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/60 font-semibold flex items-center gap-2">
                <Sparkles size={14} /> Partner route
              </p>
              <h1 className="text-3xl font-semibold">
                Olá, {user?.name?.split(' ')[0] ?? 'helper'}
              </h1>
              <p className="text-sm text-white/70 flex items-center gap-2">
                <MapPin size={14} /> {user?.companyName || 'Clean Up'} • {today}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="md:hidden w-11 h-11 rounded-2xl border border-white/20 flex items-center justify-center hover:bg-white/10 transition"
                onClick={() => setMenuOpen(true)}
              >
                <Menu size={20} />
              </button>
              <button
                type="button"
                className="hidden md:inline-flex rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/80"
              >
                Status: Online
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Data</p>
              <p className="text-lg font-semibold">{today}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Operação</p>
              <p className="text-lg font-semibold">{user?.companyName || 'Equipe Clean Up'}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 flex items-center gap-2">
              <CalendarDays size={18} className="text-white/70" />
              <div>
                <p className="text-xs uppercase tracking-wide text-white/60">Próximos serviços</p>
                <p className="text-lg font-semibold">Confira no app</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative border-t border-white/10">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto text-sm font-semibold">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.disabled ? '#' : tab.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-2xl transition ${
                    tab.disabled
                      ? 'text-white/30 border border-white/10 cursor-not-allowed'
                      : isActive
                        ? 'bg-white text-gray-900 shadow-[0_15px_35px_rgba(5,7,16,0.35)]'
                        : 'text-white/70 hover:bg-white/10'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-[#050914] rounded-t-[32px] p-6 space-y-4 border-t border-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{user?.companyName || 'Clean Up'}</p>
                <p className="text-xs text-white/60">{today}</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-10 h-10 rounded-2xl border border-white/15 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/70">
              <User size={18} />
              <span>{user?.name}</span>
            </div>
            <div className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={`mobile-${tab.to}`}
                  type="button"
                  disabled={tab.disabled}
                  onClick={() => {
                    if (!tab.disabled) {
                      navigate(tab.to);
                      setMenuOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left ${
                    tab.disabled ? 'text-white/30 border border-white/10' : 'text-white border border-white/15 hover:bg-white/5'
                  }`}
                >
                  <span>{tab.label}</span>
                  {!tab.disabled && <span className="text-xs text-white/50">›</span>}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 bg-gradient-to-b from-slate-50 via-white to-white">
        <Outlet />
      </main>
    </div>
  );
};

export default HelperLayout;

