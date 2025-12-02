import { FormEvent, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import logoFull from '../assets/client-pro-logo.svg';

type LoginPersona = UserRole;

const personaCopy: Record<LoginPersona, { title: string; description: string }> = {
  OWNER: {
    title: 'Entrar como Owner',
    description:
      'Use seu acesso de Owner para controlar seu cleaning business: Clients, Partners, contratos, agenda e financeiro.',
  },
  HELPER: {
    title: 'Entrar como Partner',
    description:
      'Use o e-mail e senha enviados pelo Owner para ver sua rota do dia, recados por SMS e checklists.',
  },
  CLIENT: {
    title: 'Entrar como Client',
    description: 'Use o e-mail onde você recebe confirmações para acompanhar suas limpezas, fotos e contratos.',
  },
};

const roleRedirect: Record<UserRole, string> = {
  OWNER: '/app/dashboard',
  HELPER: '/helper/today',
  CLIENT: '/client/home',
};

const mismatchMessages: Record<LoginPersona, string> = {
  OWNER: 'Este e-mail pertence a um perfil de Partner ou Client. Escolha a opção correta para entrar.',
  HELPER: 'Este e-mail está vinculado ao painel completo de Owner. Volte e escolha “Owner”.',
  CLIENT: 'Este e-mail está associado ao painel interno (Owner ou Partner). Use a opção correta para entrar.',
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user, resetSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [persona, setPersona] = useState<LoginPersona>('OWNER');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginSegment, setLoginSegment] = useState<'ownerPartner' | 'client' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const next = (location.state as { from?: string })?.from || roleRedirect[user.role];
      navigate(next, { replace: true });
    }
  }, [isAuthenticated, user?.role, navigate, location.state]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login({ email, password });
      const resolvedRole = (loggedUser.role ?? 'OWNER') as UserRole;

      if (loggedUser.role && resolvedRole !== persona) {
        setError(mismatchMessages[persona]);
        resetSession();
        return;
      }

      const targetPath = roleRedirect[resolvedRole];
      navigate(targetPath, { replace: true });
      // fallback for environments onde a troca de rota via SPA é bloqueada
      setTimeout(() => {
        if (window.location.pathname !== targetPath) {
          window.location.assign(targetPath);
        }
      }, 0);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Não foi possível fazer login. Verifique suas credenciais.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const openLoginModal = (segment: 'ownerPartner' | 'client') => {
    setLoginSegment(segment);
    if (segment === 'client') {
      setPersona('CLIENT');
    } else if (persona === 'CLIENT') {
      setPersona('OWNER');
    }
    setError('');
    setShowLoginModal(true);
  };

  const personaOptions =
    loginSegment === 'client'
      ? [{ key: 'CLIENT', label: 'Client' }]
      : [
          { key: 'OWNER', label: 'Owner' },
          { key: 'HELPER', label: 'Partner' },
        ];
  const personaDescription =
    loginSegment === 'client'
      ? personaCopy.CLIENT
      : personaCopy[persona === 'CLIENT' ? 'OWNER' : persona];

  const navigationLinks = [
    { href: '#benefits', label: 'Benefícios' },
    { href: '#feature-preview', label: 'Preview do app' },
    { href: '#testimonials', label: 'Feedbacks' },
  ];

  return (
    <div className="min-h-screen bg-[#fffaf4] flex flex-col">
      <header className="w-full border-b border-white/70 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logoFull} alt="Client Pro logo" className="h-12 w-auto" />
          </div>
          <nav className="hidden sm:flex flex-wrap items-center gap-4 text-sm font-semibold text-gray-600">
            {navigationLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-primary-600 transition">
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => openLoginModal('ownerPartner')}
              className="inline-flex items-center px-4 py-2 rounded-full bg-primary-600 text-white text-xs uppercase tracking-wide"
            >
              Fazer login
            </button>
          </nav>
          <button
            type="button"
            className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 text-gray-700"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Abrir menu de navegação"
          >
            <span className="flex flex-col gap-1">
              <span className="w-5 h-0.5 bg-gray-700 rounded" />
              <span className="w-5 h-0.5 bg-gray-700 rounded" />
              <span className="w-5 h-0.5 bg-gray-700 rounded" />
            </span>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white/95 backdrop-blur-sm">
            <nav className="px-4 py-4 flex flex-col gap-3 text-sm font-semibold text-gray-700">
              {navigationLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1 hover:text-primary-600 transition"
                >
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => {
                  openLoginModal('ownerPartner');
                  setMobileMenuOpen(false);
                }}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary-600 text-white text-xs uppercase tracking-wide"
              >
                Fazer login
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* HERO PRINCIPAL – inspirado na Unimeal */}
      <section className="relative overflow-hidden bg-[#fff5ec]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-10 w-72 h-72 bg-[#ffe3cc] rounded-full blur-3xl" />
          <div className="absolute top-10 right-[-60px] w-96 h-96 bg-[#e6f7f2] rounded-full blur-3xl" />
          <div className="absolute bottom-[-80px] left-1/2 -translate-x-1/2 w-[120%] h-48 bg-gradient-to-t from-white/80 to-transparent rounded-t-[120px] blur-2xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-14 lg:pb-20 grid gap-10 lg:grid-cols-[1.4fr,1fr] items-center">
          {/* Texto / brand */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/80 border border-white shadow-sm backdrop-blur-sm text-primary-600 text-xs font-semibold">
              <span>Operating system para o seu cleaning business</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                Seu cleaning business, seus Partners e Clients em um só painel.
              </h1>
              <p className="text-gray-600 text-base lg:text-lg max-w-xl mx-auto lg:mx-0">
                Veja a agenda de hoje, envie recados por SMS e mantenha Owners, Partners e Clients sempre na mesma página.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => openLoginModal('ownerPartner')}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 text-white px-4 py-3 text-sm font-semibold shadow-lg hover:bg-primary-700 transition"
              >
                Sou Owner ou Partner
              </button>
              <button
                type="button"
                onClick={() => openLoginModal('client')}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-primary-700 px-4 py-3 text-sm font-semibold border border-primary-100 shadow-sm hover:bg-primary-50 transition"
              >
                Sou Client
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Escolha seu tipo de acesso. Abriremos um pop-up seguro para você entrar.
            </p>
          </div>

          {/* Espaço ilustrativo */}
          <div className="relative w-full max-w-md mx-auto">
            <div className="rounded-[32px] border border-white/60 bg-white/70 shadow-[0_25px_60px_rgba(15,23,42,0.12)] p-6 space-y-4 text-left">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Pro App</p>
              <p className="text-lg font-semibold text-gray-900">Painel resumido</p>
              <div className="space-y-3">
                <div className="rounded-2xl bg-[#fde8d3] px-4 py-3 text-sm">
                  <span className="font-semibold text-[#d97706]">📍 Hoje</span>
                  <p className="text-gray-700">3 visits · 2 SMS enviados • Portal atualizado</p>
                </div>
                <div className="rounded-2xl bg-[#e7faf2] px-4 py-3 text-sm">
                  <span className="font-semibold text-emerald-600">💬 SMS prontos</span>
                  <p className="text-gray-700">Office Main · “Foque em mesas e vidro da recepção”.</p>
                </div>
                <div className="rounded-2xl bg-[#ecf2ff] px-4 py-3 text-sm">
                  <span className="font-semibold text-sky-600">⭐ Client Portal</span>
                  <p className="text-gray-700">Contrato atualizado + fotos antes/depois salvas.</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Faça login no pop-up para acessar a versão completa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO “O que você obtém com Client Pro” – cards maiores */}
      <section id="benefits" className="bg-white py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
              O que você obtém com Client Pro
            </p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">Tudo que seu cleaning business precisa num só app</p>
            <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
              Do primeiro contrato ao último SMS do dia, o Client Pro conecta Owners, Partners e Clients em um fluxo só.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="bg-[#fde8d3] rounded-2xl border border-[#fbd1ad] px-4 py-4 text-left shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-lg">📍</div>
              <p className="text-xs font-semibold text-[#d97706] uppercase tracking-wide">Agenda & rotas</p>
              <p className="text-sm text-gray-700">Veja hoje e amanhã para cada Partner, sem abrir mil conversas.</p>
            </div>
            <div className="bg-[#e8f7f1] rounded-2xl border border-[#c9ecdf] px-4 py-4 text-left shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-lg">💬</div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">SMS como canal oficial</p>
              <p className="text-sm text-gray-700">Recados ligados às visitas, direto no bolso de Partners e Clients.</p>
            </div>
            <div className="bg-[#e9f0ff] rounded-2xl border border-[#cadcff] px-4 py-4 text-left shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-lg">⭐</div>
              <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide">Portal do Client</p>
              <p className="text-sm text-gray-700">Contratos, fotos e histórico num lugar bonito com a cara da sua marca.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex gap-4 bg-[#fff0e0] rounded-2xl p-5 border border-[#f9d3ad]">
              <div className="mt-1 w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 text-lg">
                📅
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-900">Agenda visual e contratos conectados</p>
                <p className="text-sm text-gray-600">
                  Configure frequência, valor e “o que está incluído” uma vez. O contrato vira checklist para Partners e
                  informação clara para Clients.
                </p>
              </div>
            </div>

            <div className="flex gap-4 bg-[#e7faf2] rounded-2xl p-5 border border-[#c1eedc]">
              <div className="mt-1 w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 text-lg">
                💬
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-900">Operação guiada por SMS</p>
                <p className="text-sm text-gray-600">
                  Cada visita pode gerar recados por SMS com foco claro: rota, preferências do Client e próximos passos
                  para o Partner.
                </p>
              </div>
            </div>

            <div className="flex gap-4 bg-[#eef3ff] rounded-2xl p-5 border border-[#cfdcff]">
              <div className="mt-1 w-10 h-10 rounded-xl bg-white flex items-center justify-center text-sky-500 text-lg">
                ⭐
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-900">Experiência VIP para o Client</p>
                <p className="text-sm text-gray-600">
                  Portal com timeline, fotos antes e depois, medalhas de feedback e o pop-up “Sua empresa parceira” com a cara
                  da sua marca.
                </p>
              </div>
            </div>

            <div className="flex gap-4 bg-[#f5edff] rounded-2xl p-5 border border-[#e0d0ff]">
              <div className="mt-1 w-10 h-10 rounded-xl bg-white flex items-center justify-center text-purple-500 text-lg">
                📊
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-900">Visão clara de custos e lucro</p>
                <p className="text-sm text-gray-600">
                  Veja quanto cada Partner recebe, custos extras e quanto realmente sobra por Client e por tipo de serviço.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-left shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Owners que já organizam tudo com o Client Pro
            </p>
            <p className="text-sm text-gray-700">
              “Antes eu vivia perdida em grupos e prints. Agora mando um SMS pelo Client Pro e cada Partner sabe exatamente o que
              fazer em cada Client.”
            </p>
            <p className="mt-1 text-xs text-gray-500">Ana, Owner de um cleaning business residencial</p>
          </div>
        </div>
      </section>

      {/* SEÇÃO “Veja o Client Pro em ação” – prévias estilo telas de app */}
      <section id="feature-preview" className="bg-[#f4f6fb] py-12 md:py-16 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
              Veja o Client Pro em ação
            </p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">Como Owners, Partners e Clients enxergam o app</p>
            <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
              Painéis pensados para cada papel na operação: você vê o todo, Partners veem a rota e Clients veem a experiência.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Owner preview */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col items-center">
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-2">Owner view</p>
              <div className="relative w-full max-w-[260px] aspect-[9/16] rounded-[32px] bg-gray-900/5 border border-gray-200 shadow-inner overflow-hidden">
                <div className="absolute inset-x-8 top-4 h-2 rounded-full bg-gray-200" />
                <div className="absolute inset-x-6 top-8 bottom-6 rounded-2xl bg-white overflow-hidden flex flex-col">
                  <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hoje</p>
                    <p className="text-sm font-semibold text-gray-900">Agenda & SMS</p>
                  </div>
                  <div className="flex-1 overflow-hidden px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Casa Sarah</p>
                        <p className="text-[11px] text-gray-500">08:30 · Partner Ana</p>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        SMS enviado
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Office Main St.</p>
                        <p className="text-[11px] text-gray-500">10:00 · Partner Lucas</p>
                      </div>
                      <span className="text-[11px] text-gray-500">Pronto para SMS</span>
                    </div>
                    <div className="mt-2 rounded-xl border border-dashed border-gray-200 px-3 py-2">
                      <p className="text-[11px] text-gray-500">
                        Veja quanto cada visita rende e quanto vai para cada Partner.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-600 text-center max-w-[220px]">
                Donos enxergam rotas, contratos e SMS em um painel só.
              </p>
            </div>

            {/* Partner preview */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col items-center">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Partner view</p>
              <div className="relative w-full max-w-[260px] aspect-[9/16] rounded-[32px] bg-gray-900/5 border border-gray-200 shadow-inner overflow-hidden">
                <div className="absolute inset-x-8 top-4 h-2 rounded-full bg-gray-200" />
                <div className="absolute inset-x-6 top-8 bottom-6 rounded-2xl bg-white overflow-hidden flex flex-col">
                  <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Today · Partner</p>
                      <p className="text-sm font-semibold text-gray-900">3 visits · $210 payout</p>
                    </div>
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                      On route
                    </span>
                  </div>
                  <div className="flex-1 overflow-hidden px-3 py-2 space-y-2">
                    <div className="rounded-xl border border-gray-100 px-3 py-2">
                      <p className="text-xs font-semibold text-gray-900">Sarah · Standard clean</p>
                      <p className="text-[11px] text-gray-500">SMS: “Foque na cozinha e quarto das crianças.”</p>
                      <ul className="mt-1 space-y-0.5 text-[11px] text-gray-600">
                        <li>▢ Dusting & vacuum</li>
                        <li>▢ Kitchen counters & sink</li>
                        <li>▢ Bathroom reset</li>
                      </ul>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">Next · Office Main St.</p>
                        <p className="text-[11px] text-gray-500">ETA 32 min · route via Maps</p>
                      </div>
                      <span className="text-[11px] text-primary-700 font-semibold">Open route</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-600 text-center max-w-[220px]">
                Partners recebem rota, checklist e recados por SMS conectados à visita.
              </p>
            </div>

            {/* Client preview */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col items-center">
              <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-2">Client view</p>
              <div className="relative w-full max-w-[260px] aspect-[9/16] rounded-[32px] bg-gray-900/5 border border-gray-200 shadow-inner overflow-hidden">
                <div className="absolute inset-x-8 top-4 h-2 rounded-full bg-gray-200" />
                <div className="absolute inset-x-6 top-8 bottom-6 rounded-2xl bg-white overflow-hidden flex flex-col">
                  <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client portal</p>
                    <p className="text-sm font-semibold text-gray-900">Próxima visita · Quinta, 9h</p>
                  </div>
                  <div className="flex-1 overflow-hidden px-3 py-2 space-y-2">
                    <div className="rounded-xl bg-primary-50 px-3 py-2">
                      <p className="text-xs font-semibold text-primary-800">Sua empresa parceira</p>
                      <p className="text-[11px] text-primary-800/80">
                        Equipe treinada, comunicação por SMS e foco nos detalhes da sua casa.
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 px-3 py-2">
                      <p className="text-xs font-semibold text-gray-900">Plano & contrato</p>
                      <p className="text-[11px] text-gray-500">Weekly · $140 / visit · inclui cozinha, banheiros e areas sociais.</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-3 py-2">
                      <p className="text-xs font-semibold text-gray-900 mb-1">Última visita</p>
                      <p className="text-[11px] text-gray-500">Fotos salvas e medalha “Cozinha impecável” recebida.</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-600 text-center max-w-[220px]">
                Clients enxergam o que foi combinado, histórico de visitas e sua marca em destaque.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de depoimentos */}
      <section id="testimonials" className="bg-[#f1f5ff] py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Feedbacks reais</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">Owners e Partners que já usam o Client Pro</p>
            <p className="text-sm text-gray-600 max-w-2xl mx-auto">
              A cada nova limpeza, menos improviso e mais padrão. Veja como o painel mudou a rotina deles.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                name: 'Carla Oliveira',
                role: 'Owner · 12 Partners · 260 Clients',
                text: '“Eu levava 2h toda segunda para montar rotas. Agora envio SMS direto do Client Pro e cada Partner já sabe o foco do dia.”',
              },
              {
                name: 'Lucas Mendes',
                role: 'Partner há 3 anos',
                text: '“Abro meu app, vejo SMS com recados do Owner e sigo a rota. Nunca tinha visto checklist virar pagamento tão rápido.”',
              },
              {
                name: 'Patrícia Lima',
                role: 'Owner · Especializada em Airbnb',
                text: '“O portal do Client salvou minha reputação com hosts. Eles veem fotos e contratos, e eu sei quanto cada visita rendeu.”',
              },
              {
                name: 'Thiago Costa',
                role: 'Partner & field lead',
                text: '“Antes eu dependia de prints. Agora recebo SMS com as preferências daquele Client. Entrego mais e ganho bônus.”',
              },
            ].map((testimonial) => (
              <div key={testimonial.name} className="bg-white border border-[#d9e3ff] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                  <div className="text-amber-400 text-sm">★★★★★</div>
                </div>
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">{testimonial.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção resultados */}
      <section className="bg-[#eef4ff] py-12 md:py-16 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 space-y-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Resultados de operações reais</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">“Em 3 meses, organizei 180 visitas e reduzi 40% das falhas.”</p>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
            Fran, Owner de uma cleaning company em Austin, usou o Client Pro para sincronizar Partners, Clients e contratos. Ela
            reduziu refações e aumentou o faturamento por visita com extras bem registrados.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Visitas organizadas', value: '180' },
              { label: 'SMS enviados automático', value: '320+' },
              { label: 'Novos contratos assinados', value: '27' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white border border-white shadow-lg px-4 py-5 flex flex-col items-center"
              >
                <p className="text-3xl font-bold text-primary-600">{stat.value}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide mt-2 text-center">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <p className="text-sm text-gray-600">
              Quer resultados parecidos? Entre como Owner e comece a testar com sua equipe.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 text-white px-5 py-2 text-sm font-semibold hover:bg-primary-700 transition"
            >
              Criar conta Owner
            </Link>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-amber-50 via-white to-emerald-50 shadow-lg px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                Client Pro inspira com organização & resultado
              </p>
              <p className="text-2xl font-bold text-gray-900">
                Tenha sua operação na mão, com Partners e Clients no mesmo fluxo.
              </p>
              <p className="text-sm text-gray-600">
                Faça login como Owner para centralizar agenda, SMS, contratos e portal do Client.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 text-white px-6 py-3 text-sm font-semibold hover:bg-primary-700 transition"
              >
                Abrir pop-up de login
              </button>
              <p className="text-[11px] text-gray-500 text-center">
                Clientes? Use o e-mail onde você recebe confirmações. Partners? Use o acesso enviado pelo Owner.
              </p>
            </div>
          </div>
        </div>
      </section>

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-5 relative">
            <button
              type="button"
              onClick={() => {
                setShowLoginModal(false);
                setLoginSegment(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                {loginSegment === 'client' ? 'Portal do Client' : 'Painel do Owner / Partner'}
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {loginSegment === 'client'
                  ? 'Entre para acompanhar suas visitas'
                  : 'Entre para controlar sua operação'}
              </p>
              <p className="text-sm text-gray-600">
                {loginSegment === 'client'
                  ? 'Use o e-mail onde recebe confirmações. Você verá timeline, fotos e contratos.'
                  : 'Escolha Owner ou Partner para acessar agenda, SMS e portal interno.'}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">
                Como você usa o Client Pro?
              </p>
              <div className={`grid gap-2 ${personaOptions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {personaOptions.map((option) => {
                  const active = persona === option.key;
                  return (
                    <button
                      type="button"
                      key={option.key}
                      onClick={() => setPersona(option.key as LoginPersona)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                        active
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-500 hover:border-emerald-300'
                      }`}
                      disabled={loginSegment === 'client'}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-emerald-700">{personaDescription.title}</p>
                <p className="text-[11px] text-emerald-600 mt-1 leading-relaxed">{personaDescription.description}</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="E-mail de acesso"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="Senha"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar agora'}
              </button>
            </form>

            <div className="text-center">
              <button type="button" className="text-primary-600 text-sm font-semibold hover:underline">
                Esqueceu a senha?
              </button>
              <div className="h-px bg-gray-200 my-4" />
              <Link
                to="/register"
                className="inline-flex items-center justify-center w-full px-4 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Criar conta como Owner
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

