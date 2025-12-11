import { Users, CalendarDays, DollarSign, Search, PlusCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { pageGutters } from '../styles/uiTokens';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();
  const greeting = user?.name ? `Olá, ${user.name}` : 'Olá';
  // Placeholder estático; depois podemos conectar na API (clientes, agenda, financeiro)
  const metrics = [
    {
      label: 'Clientes ativos',
      value: '24',
      help: 'Base atualizada',
      icon: Users,
      tone: 'text-primary-600',
    },
    {
      label: 'Serviços na semana',
      value: '12',
      help: 'Próximos 7 dias',
      icon: CalendarDays,
      tone: 'text-amber-500',
    },
  ];

  const pendingCard = {
    label: 'Pagamentos pendentes',
    value: '$320',
    help: 'Aguardando confirmação',
    icon: DollarSign,
    tone: 'text-emerald-600',
  };

  return (
    <div className="min-h-screen bg-[#f5f9fc]">
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 text-gray-900 pb-8 pt-4">
        <div className={`${pageGutters} flex items-center justify-between`}>
          <div>
            <h1 className="text-3xl font-bold leading-tight text-slate-900">{greeting}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full text-sm font-semibold border border-slate-200 shadow-sm">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold shadow-sm">
                ☀
              </span>
              <span className="text-slate-800">Hoje · {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-800 font-semibold shadow-sm">
              🙂
            </div>
          </div>
        </div>
      </div>

      <div className={`${pageGutters} -mt-10 space-y-5 pb-16`}>
        <div className="rounded-3xl border border-emerald-100 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] p-4 md:p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck size={24} />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-slate-900">Você tem 3 serviços hoje.</p>
            <p className="text-sm text-slate-600">Confirme horários ou crie um novo agendamento.</p>
          </div>
          <button className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition">
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {metrics.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-3xl border border-slate-100 bg-white px-4 py-4 shadow-sm flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <Icon size={18} className={item.tone} />
                  <span>{item.label}</span>
                </div>
                <div className="text-3xl font-bold text-slate-900">{item.value}</div>
                <p className="text-sm text-slate-500">{item.help}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1">
          <div className="rounded-3xl border border-slate-100 bg-white px-4 py-4 shadow-sm flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <pendingCard.icon size={18} className={pendingCard.tone} />
              <span>{pendingCard.label}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{pendingCard.value}</div>
            <p className="text-sm text-slate-500">{pendingCard.help}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-200 flex items-center justify-center hover:bg-primary-600 transition"
        aria-label="Buscar"
      >
        <Search size={22} />
      </button>

      <button
        type="button"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-200 flex items-center justify-center hover:bg-primary-600 transition"
        aria-label="Criar"
      >
        <PlusCircle size={26} />
      </button>
    </div>
  );
};

export default Home;

