import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, MapPin, Menu, User } from 'lucide-react';
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
    { to: '/helper/appointments', label: 'Histórico', disabled: true },
  ];

  const today = useMemo(() => {
    return format(new Date(), "EEEE, dd 'de' MMM", { locale: ptBR }).replace(/^./, (c) => c.toUpperCase());
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white flex flex-col">
      <header className="bg-white border-b border-emerald-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button type="button" className="md:hidden text-emerald-600" onClick={() => setMenuOpen((prev) => !prev)}>
            <Menu size={24} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-500 font-semibold flex items-center gap-1">
              <MapPin size={14} /> Rota do dia
            </p>
            <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.name?.split(' ')[0] ?? 'helper'}</h1>
            <p className="text-sm text-gray-500">{today}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex space-x-4 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.disabled ? '#' : tab.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-2xl text-sm font-semibold ${
                    tab.disabled
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : isActive
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
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
        <div className="md:hidden bg-white border-b border-emerald-100 px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
          <User size={16} className="text-emerald-500" />
          <div>
            <p className="font-semibold text-gray-800">{user?.companyName || 'Client Pro'}</p>
            <p className="text-xs text-gray-500">Operação coordenada pela administradora</p>
          </div>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default HelperLayout;

