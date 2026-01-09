import { FormEvent, useState, useEffect, TouchEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import { FileText, MessageSquare, Smartphone, Mail, Lock, User, Building2, ArrowRight, Loader2, X } from 'lucide-react';
import logoFull from '../assets/brand-logo.png';
import loginHero from '../assets/login-hero.png';

type LoginPersona = UserRole;

type Language = 'en' | 'pt';

const LANGUAGE_STORAGE_KEY = 'clientup:language';

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'pt' ? 'pt' : 'en';
};

type SlideCopy = { title: string; description: string; highlight: string; subcopy: string };
type WorkflowKnot = { title: string; description: string; accent: string };
type SolutionsHighlight = { title: string; description: string };
type AiCardCopy = { title: string; description: string; badge: string };
type PersonaCopyMap = Record<LoginPersona, { title: string; description: string }>;
type Translation = {
  navLinks: { href: string; label: string }[];
  loginButton: string;
  hero: {
    badge: string;
    title: string;
    description: string;
    chips: { sms: string; contracts: string; portal: string };
    primaryCta: string;
    secondaryCta: string;
    note: string;
  };
  mobile: {
    brandTag: string;
    slides: SlideCopy[];
    primaryCta: string;
    ownerBtn: string;
    clientBtn: string;
  };
  workSprawl: { badge: string; title: string; description: string; cards: WorkflowKnot[] };
  featureMatrix: { badge: string; title: string; description: string };
  superAgents: { badge: string; title: string; description: string; button: string };
  ai: { badge: string; title: string; description: string; cards: AiCardCopy[] };
  solutions: { badge: string; title: string; description: string; tabs: string[]; highlights: SolutionsHighlight[] };
  finalCta: { badge: string; title: string; description: string; primary: string; client: string; owner: string; note: string };
  personaCopy: PersonaCopyMap;
  mismatchMessages: Record<LoginPersona, string>;
  modal: {
    ownerBadge: string;
    ownerSubtitle: string;
    ownerDescription: string;
    clientBadge: string;
    clientSubtitle: string;
    clientDescription: string;
    question: string;
    personaPrompt: string;
    infoBoxTitle: string;
    forgotPassword: string;
    createOwner: string;
  };
  form: { emailPlaceholder: string; passwordPlaceholder: string; submitIdle: string; submitLoading: string };
  errors: { default: string };
};

const translations: Record<Language, Translation> = {
  en: {
    navLinks: [
      { href: '#platform', label: 'Platform' },
      { href: '#agents', label: 'Super Agents' },
      { href: '#solutions', label: 'Solutions' },
      { href: '#cta', label: 'Start' },
    ],
    loginButton: 'Sign in',
    hero: {
      badge: 'Clean Up · Operating system for cleaning businesses',
      title: 'Maximize human productivity with a panel that unites Owners, Partners, and Clients.',
      description:
        'Replace spreadsheets, chat groups, and scattered apps. Clean Up brings schedules, smart SMS, contracts, finance, and the Client portal into one experience.',
      chips: {
        sms: 'Automated SMS',
        contracts: 'Dynamic contracts',
        portal: 'Client portal',
      },
      primaryCta: 'Get started – Owner / Partner',
      secondaryCta: 'Sign in as Client',
      note: 'Free forever to test your operation. No credit card required.',
    },
    mobile: {
      brandTag: 'Clean Up',
      slides: [
        {
          title: 'Your cleaning business in one place.',
          description: 'With Partners and Clients aligned by SMS, you gain time to grow.',
          highlight: 'Win a free day every week.',
          subcopy: 'Focused dashboard, automated SMS, and a Client portal with your brand.',
        },
        {
          title: 'Operations guided by SMS.',
          description: 'Send intelligent reminders before the route and forget improvisation.',
          highlight: 'Everything ready before the visit.',
          subcopy: 'Partners get the full briefing on their phone; Clients confirm in seconds.',
        },
        {
          title: 'Portal with your brand look.',
          description: 'Contracts, photos, and “Your partner company” pop-up in one tap.',
          highlight: 'VIP experience for Clients.',
          subcopy: 'Share news, before/after shots, and keep relationships active.',
        },
      ],
      primaryCta: 'Get started',
      ownerBtn: "I'm Owner or Partner",
      clientBtn: "I'm Client",
    },
    workSprawl: {
      badge: 'End work sprawl',
      title: 'Fewer apps. More focus on who delivers.',
      description:
        'Without Clean Up, your operation gets lost in apps, AI, and scattered context. With it, SMS, contracts, and dashboards live in one continuous flow.',
      cards: [
        {
          title: 'App Sprawl',
          description: 'Kills collaboration when each team uses a different app.',
          accent: 'text-emerald-500',
        },
        {
          title: 'AI Sprawl',
          description: 'Destroys productivity when each AI stores data in its own silo.',
          accent: 'text-sky-500',
        },
        {
          title: 'Context Sprawl',
          description: 'Removes visibility when no one knows where information lives.',
          accent: 'text-amber-500',
        },
      ],
    },
    featureMatrix: {
      badge: 'Tudo o que você precisa',
      title: '100+ resources for Owners, Partners, and Clients',
      description:
        'Pick the modules you need and keep a coherent panel: Projects, Docs, Brain, Chat, automations, forms, finance, and more.',
    },
    superAgents: {
      badge: 'Super Agents™',
      title: 'A new era of humans with applied AI.',
      description:
        'Create agents that distribute tasks, save Client preferences, remind Partners via SMS, and feed finance automatically.',
      button: 'Build your own agent',
    },
    ai: {
      badge: '@Brain',
      title: 'The only AI that works where you work.',
      description:
        'Use AI to answer questions, generate SMS, summarize visits, and trigger alerts without leaving Clean Up.',
      cards: [
        { badge: 'Ambient answers', title: '@Brain Agent', description: '24/7 assistant that searches data, drafts messages, and answers the team.' },
        {
          badge: 'Context in seconds',
          title: 'Ambient Answers',
          description: 'Clients don’t ask “where is the link?” anymore. AI replies inside the chat.',
        },
        {
          badge: 'Never reassign manually',
          title: 'Project Manager',
          description: 'Delegate tasks, generate checklists, and review status without spreadsheets.',
        },
      ],
    },
    solutions: {
      badge: 'AI solutions for every team',
      title: 'Your favorite workflow, powered with Agents.',
      description: 'Pick the type of operation and let the platform suggest automations, checklists, and comms.',
      tabs: ['Projects', 'Marketing', 'Product & Eng', 'IT', 'HR', 'Leadership'],
      highlights: [
        { title: 'Intake Agent standardizes kickoffs', description: 'Centralize briefs and onboarding checklists without dozens of forms.' },
        { title: 'Assign Agent defines owners', description: 'Smart rules distribute responsibilities according to your plan.' },
        { title: 'Timeline Agent watches deliveries', description: 'Intelligent alerts before any delay in the schedule.' },
        { title: 'Live Answers keeps everyone informed', description: 'Clients get answers instantly via the portal, no calls required.' },
      ],
    },
    finalCta: {
      badge: 'Time is priceless',
      title: 'Right client, right partner, everything ready in one panel.',
      description:
        'Save hours every week with smart SMS, dynamic contracts, and a Client portal that looks like your brand.',
      primary: 'Open login',
      client: 'Sign in as Client',
      owner: 'Create Owner account',
      note: 'Try it today. No card, easy cancelation.',
    },
    personaCopy: {
      OWNER: {
        title: 'Sign in as Owner',
        description: 'Use your Owner login to control Clients, Partners, contracts, schedule, and finances.',
      },
      HELPER: {
        title: 'Sign in as Partner',
        description: 'Use the email and password sent by the Owner to view your route, SMS notes, and checklists.',
      },
      CLIENT: {
        title: 'Sign in as Client',
        description: 'Use the email where you get confirmations to follow visits, photos, and contracts.',
      },
    },
    mismatchMessages: {
      OWNER: 'This email belongs to a Partner or Client profile. Pick the correct option to sign in.',
      HELPER: 'This email is linked to the full Owner panel. Go back and choose “Owner”.',
      CLIENT: 'This email is associated with the internal panel (Owner or Partner). Use the correct option.',
    },
    modal: {
      ownerBadge: 'Owner / Partner panel',
      ownerSubtitle: 'Sign in to control your operation',
      ownerDescription: 'Choose Owner or Partner to access schedule, SMS, finance, and the internal portal.',
      clientBadge: 'Client portal',
      clientSubtitle: 'Sign in to follow your visits',
      clientDescription: 'Use the email where you get confirmations to see timeline, photos, and contracts.',
      question: 'How do you use Clean Up?',
      personaPrompt: 'Select the profile that matches your access.',
      infoBoxTitle: 'Need a hint?',
      forgotPassword: 'Forgot your password?',
      createOwner: 'Create Owner account',
    },
    form: {
      emailPlaceholder: 'Access email',
      passwordPlaceholder: 'Password',
      submitIdle: 'Sign in now',
      submitLoading: 'Signing in...',
    },
    errors: {
      default: 'Unable to sign in. Please check your credentials.',
    },
  },
  pt: {
    navLinks: [
      { href: '#platform', label: 'Plataforma' },
      { href: '#agents', label: 'Super Agents' },
      { href: '#solutions', label: 'Soluções' },
      { href: '#cta', label: 'Começar' },
    ],
    loginButton: 'Fazer login',
    hero: {
      badge: 'Clean Up · Operating system para cleaning businesses',
      title: 'Maximize a produtividade humana, com um painel que une Owners, Partners e Clients.',
      description:
        'Substitua planilhas, grupos e apps soltos. O Clean Up reúne agenda, SMS inteligentes, contratos, financeiro e portal do Client em uma única experiência.',
      chips: {
        sms: 'SMS automáticos',
        contracts: 'Contratos dinâmicos',
        portal: 'Portal do Client',
      },
      primaryCta: 'Get started – Owner / Partner',
      secondaryCta: 'Entrar como Client',
      note: 'Free forever para testar com a sua operação. Sem cartão de crédito.',
    },
    mobile: {
      brandTag: 'Clean Up',
      slides: [
        {
          title: 'Sua limpeza em um só lugar.',
          description: 'Com Partners e Clients alinhados por SMS, sobra tempo para crescer o negócio.',
          highlight: 'Ganhe um dia livre por semana.',
          subcopy: 'Painel focado, SMS automáticos e portal para Clients com a cara da sua marca.',
        },
        {
          title: 'Operação guiada por SMS.',
          description: 'Envie recados inteligentes antes da rota e evite ligações e improviso.',
          highlight: 'Tudo preparado antes da visita.',
          subcopy: 'Partners recebem briefing completo no celular; Clients confirmam em segundos.',
        },
        {
          title: 'Portal com a cara da sua marca.',
          description: 'Contratos, fotos, medidores e pop-up “Sua empresa parceira” em um toque.',
          highlight: 'Experiência VIP para Clients.',
          subcopy: 'Compartilhe novidades, antes/depois e mantenha o relacionamento sempre ativo.',
        },
      ],
      primaryCta: 'Começar agora',
      ownerBtn: 'Sou Owner ou Partner',
      clientBtn: 'Sou Client',
    },
    workSprawl: {
      badge: 'Acabe com o Work Sprawl',
      title: 'Menos apps. Mais foco em quem entrega.',
      description:
        'Sem Clean Up, sua operação se perde em apps, IA e contexto espalhados. Com ele, SMS, contratos e dashboards vivem em um fluxo contínuo.',
      cards: [
        {
          title: 'App Sprawl',
          description: 'Derruba a colaboração quando cada time usa um app.',
          accent: 'text-emerald-500',
        },
        {
          title: 'AI Sprawl',
          description: 'Mata a produtividade quando cada IA guarda dados em um silo.',
          accent: 'text-sky-500',
        },
        {
          title: 'Context Sprawl',
          description: 'Acaba com a visibilidade quando ninguém sabe onde está a informação.',
          accent: 'text-amber-500',
        },
      ],
    },
    featureMatrix: {
      badge: 'Everything you need',
      title: '100+ recursos para Owners, Partners e Clients',
      description:
        'Escolha os módulos e mantenha um painel coerente: Projects, Docs, Brain, Chat, automações, formulários, financeiro e mais.',
    },
    superAgents: {
      badge: 'Super Agents™',
      title: 'Uma nova era de humanos com IA aplicada à operação.',
      description:
        'Crie agentes que distribuem tarefas, salvam preferências dos Clients, lembram Partners por SMS e alimentam o financeiro automaticamente.',
      button: 'Crie seu próprio agent',
    },
    ai: {
      badge: '@Brain',
      title: 'A única IA que trabalha onde você trabalha.',
      description:
        'Use IA para responder perguntas, gerar SMS, resumir visitas e disparar alertas sem sair do Clean Up.',
      cards: [
        { badge: 'Ambient answers', title: '@Brain Agent', description: 'Assistente 24/7 que busca dados, cria mensagens e responde ao time.' },
        {
          badge: 'Contexto em segundos',
          title: 'Ambient Answers',
          description: 'Clients não perguntam mais “onde está o link?”. A IA responde direto no chat.',
        },
        {
          badge: 'Nunca mais reatribua manualmente',
          title: 'Project Manager',
          description: 'Delegue tarefas, gere checklists e revise status sem abrir planilhas.',
        },
      ],
    },
    solutions: {
      badge: 'AI solutions para todo time',
      title: 'Seu workflow favorito, turbinado com Agents.',
      description: 'Selecione o tipo de operação e deixe a plataforma sugerir automações, checklists e comunicações.',
      tabs: ['Projects', 'Marketing', 'Product & Eng', 'IT', 'HR', 'Leadership'],
      highlights: [
        { title: 'Intake Agent padroniza kickoffs', description: 'Centralize briefings e checklists iniciais sem formulários soltos.' },
        { title: 'Assign Agent distribui responsáveis', description: 'Regras inteligentes distribuem responsabilidades conforme o plano.' },
        { title: 'Timeline Agent vigia entregas', description: 'Alertas inteligentes antes de qualquer atraso na agenda.' },
        { title: 'Live Answers mantém todos informados', description: 'Clients recebem respostas na hora via portal, sem precisar ligar.' },
      ],
    },
    finalCta: {
      badge: 'Time is priceless',
      title: 'Cliente certo, Partner certo, tudo pronto em um só painel.',
      description:
        'Economize horas por semana com SMS inteligentes, contratos dinâmicos e portal do Client com a cara da sua marca.',
      primary: 'Abrir pop-up de login',
      client: 'Entrar como Client',
      owner: 'Criar conta Owner',
      note: 'Experimente hoje. Sem cartão, cancelamento simples.',
    },
    personaCopy: {
      OWNER: {
        title: 'Entrar como Owner',
      description: 'Acesse sua agenda, clientes e financeiro.',
      },
      HELPER: {
        title: 'Entrar como Partner',
      description: 'Use o login enviado pelo Owner para ver sua rota.',
      },
      CLIENT: {
        title: 'Entrar como Client',
      description: 'Use o e-mail das confirmações para ver suas visitas.',
      },
    },
    mismatchMessages: {
      OWNER: 'Este e-mail pertence a um perfil de Partner ou Client. Escolha a opção correta para entrar.',
      HELPER: 'Este e-mail está vinculado ao painel completo de Owner. Volte e escolha “Owner”.',
      CLIENT: 'Este e-mail está associado ao painel interno (Owner ou Partner). Use a opção correta.',
    },
    modal: {
      ownerBadge: 'Owner / Partner',
      ownerSubtitle: 'Entrar no painel interno',
      ownerDescription: 'Escolha o perfil para acessar a agenda e clientes.',
      clientBadge: 'Portal do Client',
      clientSubtitle: 'Acompanhe suas visitas',
      clientDescription: 'Use o e-mail das confirmações para ver visitas e contratos.',
      question: 'Como você usa o Clean Up?',
      personaPrompt: 'Escolha seu perfil para entrar.',
      infoBoxTitle: 'Precisa de ajuda?',
      forgotPassword: 'Esqueceu a senha?',
      createOwner: 'Criar conta como Owner',
    },
    form: {
      emailPlaceholder: 'E-mail de acesso',
      passwordPlaceholder: 'Senha',
      submitIdle: 'Entrar agora',
      submitLoading: 'Entrando...',
    },
    errors: {
      default: 'Não foi possível fazer login. Verifique suas credenciais.',
    },
  },
};

const roleRedirect: Record<UserRole, string> = {
  OWNER: '/app/agenda',
  HELPER: '/helper/today',
  CLIENT: '/client/home',
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user, resetSession } = useAuth();
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, [language]);
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [persona, setPersona] = useState<LoginPersona>('OWNER');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginSegment, setLoginSegment] = useState<'ownerPartner' | 'client' | null>(null);
  const navigationLinks = t.navLinks;
  const mobileSlides = t.mobile.slides;
  const [mobileSlideIndex, setMobileSlideIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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
        err?.response?.data?.error || err?.response?.data?.message || t.errors.default;
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
  const mismatchMessages = t.mismatchMessages;
  const trustLogos = ['Wayfair', 'Deloitte', 'Pfizer', 'Adobe', 'American Express', 'NBCUniversal'];
  const workflowKnots = t.workSprawl.cards;
  const featureMatrixItems = [
    'Projects',
    'Docs',
    'Brain',
    'Chat',
    'Forms',
    'Automation',
    'Proofing',
    'Templates',
    'Time Tracking',
    'Dashboards',
    'Mind Maps',
    'Integrations',
  ];

  const aiCards = t.ai.cards;
  const solutionTabs = t.solutions.tabs;
  const solutionHighlights = t.solutions.highlights;
  const heroChips = [
    { icon: MessageSquare, label: t.hero.chips.sms, accent: 'text-emerald-500' },
    { icon: FileText, label: t.hero.chips.contracts, accent: 'text-sky-500' },
    { icon: Smartphone, label: t.hero.chips.portal, accent: 'text-amber-500' },
  ];
  const languageOptions: { key: Language; label: string }[] = [
    { key: 'en', label: 'EN' },
    { key: 'pt', label: 'PT' },
  ];

  const goToSlide = (index: number) => {
    const total = mobileSlides.length;
    const nextIndex = ((index % total) + total) % total;
    setMobileSlideIndex(nextIndex);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.changedTouches[0].clientX);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    const delta = touchStartX - event.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) {
      goToSlide(mobileSlideIndex + (delta > 0 ? 1 : -1));
    }
    setTouchStartX(null);
  };

  return (
    <div className="min-h-screen bg-white sm:bg-[#fffaf4] flex flex-col pb-10 sm:pb-0">
      <header className="hidden sm:block w-full border-b border-white/70 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logoFull} alt="Clean Up logo" className="h-16 w-auto" />
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-gray-600">
            {navigationLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-primary-600 transition">
                {link.label}
              </a>
            ))}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-full border border-gray-200 overflow-hidden text-xs font-semibold">
                {languageOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setLanguage(option.key)}
                    className={`px-2.5 py-1 transition ${
                      language === option.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => openLoginModal('ownerPartner')}
                className="inline-flex items-center px-4 py-2 rounded-full bg-primary-600 text-white text-xs uppercase tracking-wide"
              >
                {t.loginButton}
              </button>
            </div>
          </nav>
        </div>
      </header>

      <section className="sm:hidden bg-gradient-to-b from-white via-[#f7f8ff] to-[#eef7f3] text-gray-900 pt-8 pb-10">
        <div className="max-w-sm mx-auto flex flex-col gap-6 px-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center rounded-full border border-gray-200 overflow-hidden text-[11px] font-semibold bg-white">
              {languageOptions.map((option) => (
                <button
                  key={`mobile-lang-${option.key}`}
                  type="button"
                  onClick={() => setLanguage(option.key)}
                  className={`px-3 py-1 transition ${
                    language === option.key ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div
            className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-gradient-to-b from-white via-[#f4f6ff] to-[#e9f6ef] shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex transition-transform duration-300"
              style={{ transform: `translateX(-${mobileSlideIndex * 100}%)` }}
            >
              {mobileSlides.map((slide) => (
                <div
                  key={slide.title}
                  className="w-full flex-shrink-0 flex flex-col items-center gap-6 py-8 text-center px-4"
                >
                  <div className="space-y-2">
                    <img src={logoFull} alt="Clean Up" className="h-10 mx-auto" />
                    <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-600 font-semibold">
                      {t.mobile.brandTag}
                    </p>
                    <h1 className="text-2xl font-bold leading-tight text-gray-900">{slide.title}</h1>
                    <p className="text-sm text-gray-600">{slide.description}</p>
                  </div>
                  <div className="w-48 h-48 rounded-[32px] border border-gray-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)] flex items-center justify-center overflow-hidden">
                    <img src={loginHero} alt="Clean Up app preview" className="w-full h-full object-contain" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-gray-900">{slide.highlight}</p>
                    <p className="text-sm text-gray-600">{slide.subcopy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            {mobileSlides.map((_, index) => (
              <button
                key={`hero-dot-${index}`}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Ir para slide ${index + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition ${
                  mobileSlideIndex === index ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={() => openLoginModal('ownerPartner')}
              className="w-full rounded-2xl bg-emerald-500 text-gray-900 font-semibold py-3 shadow-[0_20px_40px_rgba(16,185,129,0.35)]"
            >
              {t.mobile.primaryCta}
            </button>
            <div className="flex gap-2 text-sm">
              <button
                className="flex-1 rounded-2xl border border-gray-200 py-2.5 bg-white text-gray-900 font-semibold"
                onClick={() => openLoginModal('ownerPartner')}
              >
                {t.mobile.ownerBtn}
              </button>
              <button
                className="flex-1 rounded-2xl border border-gray-200 py-2.5 bg-white text-gray-900 font-semibold"
                onClick={() => openLoginModal('client')}
              >
                {t.mobile.clientBtn}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* HERO DESKTOP */}
      <section id="hero" className="hidden sm:block bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16 grid gap-12 lg:grid-cols-[1.2fr,0.9fr] items-center">
          <div className="space-y-6 text-center lg:text-left">
            <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
              {t.hero.badge}
            </p>
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">{t.hero.title}</h1>
              <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0">{t.hero.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start text-sm text-gray-700">
              {heroChips.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1"
                >
                  <chip.icon size={16} className={chip.accent} /> {chip.label}
                </span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => openLoginModal('ownerPartner')}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 text-white px-4 py-3 text-sm font-semibold shadow-lg hover:bg-black"
              >
                {t.hero.primaryCta}
              </button>
              <button
                type="button"
                onClick={() => openLoginModal('client')}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-gray-900 px-4 py-3 text-sm font-semibold border border-gray-200 hover:border-gray-300"
              >
                {t.hero.secondaryCta}
              </button>
            </div>
            <p className="text-xs text-gray-500">{t.hero.note}</p>
          </div>

          <div className="relative">
            <div className="rounded-[40px] bg-gradient-to-br from-[#ff8cf0] via-[#8e7dff] to-[#5dd6ff] p-[2px] shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
              <div className="rounded-[38px] bg-white text-gray-900 p-6 space-y-4">
                <div className="rounded-3xl bg-gradient-to-br from-[#0e0f29] via-[#121434] to-[#070814] px-6 py-8 text-white space-y-6">
                  <div className="text-left space-y-1">
                    <p className="text-sm font-semibold text-white/60 uppercase tracking-wide">Hoje às 9h</p>
                    <p className="text-2xl font-bold">Cleaning schedule</p>
                    <p className="text-sm text-white/70">3 visitas · 2 Partners · $420 em receita</p>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Sarah · Standard clean</p>
                        <p className="text-xs text-white/60">SMS enviado com foco em cozinha</p>
                      </div>
                      <span className="text-xs text-emerald-300">Done</span>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Office Main St.</p>
                        <p className="text-xs text-white/60">Contrato atualizado + fotos</p>
                      </div>
                      <span className="text-xs text-amber-300">Next</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white text-gray-900 flex items-center justify-center font-semibold">
                      <img src={loginHero} alt="Clean Up app" className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/60">Portal Client</p>
                      <p className="text-sm font-semibold">“Antes e depois” enviados</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-6 -left-6 bg-white shadow-xl rounded-2xl px-4 py-2 text-xs font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Operação estável hoje
            </div>
            <div className="absolute -bottom-6 right-0 bg-gray-900 text-white shadow-xl rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2">
              ⭐ Client portal atualizado
            </div>
          </div>
        </div>
      </section>



      {/* Logo trust row */}
      <section className="hidden sm:block bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 border-b border-gray-100 flex flex-wrap items-center justify-center gap-6 text-gray-400 text-xs font-semibold tracking-wide uppercase">
          {trustLogos.map((logo) => (
            <span key={logo} className="text-gray-400">{logo}</span>
          ))}
        </div>
      </section>

      {/* Work sprawl narrative */}
      <section id="platform" className="hidden sm:block bg-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-10">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.workSprawl.badge}</p>
            <h2 className="text-3xl font-bold text-gray-900">{t.workSprawl.title}</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">{t.workSprawl.description}</p>
          </div>
          <div className="relative">
            <div className="h-2 bg-gray-100 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-between px-4">
              {workflowKnots.map((knot) => (
                <div
                  key={knot.title}
                  className="w-32 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm text-left"
                >
                  <p className={`text-xs font-semibold ${knot.accent}`}>{knot.title}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{knot.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature matrix */}
      <section className="hidden sm:block bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.featureMatrix.badge}</p>
            <h2 className="text-3xl font-bold text-gray-900">{t.featureMatrix.title}</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">{t.featureMatrix.description}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {featureMatrixItems.map((feature, index) => {
              const highlight = index < 4;
              return (
                <div
                  key={feature}
                  className={`rounded-2xl px-4 py-5 text-center text-sm font-semibold ${
                    highlight
                      ? 'bg-white border border-gray-100 text-gray-900 shadow-sm'
                      : 'bg-gray-100/70 border border-transparent text-gray-500'
                  }`}
                >
                  {feature}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Super Agents */}
      <section id="agents" className="hidden sm:block bg-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-[40px] bg-gradient-to-br from-[#ff8ef2] via-[#ff7b7b] to-[#ffa64d] text-white p-10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top, #fff, transparent 55%)' }} />
            <div className="relative grid gap-8 lg:grid-cols-[1.1fr,0.9fr] items-center">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em]">{t.superAgents.badge}</p>
                <h2 className="text-3xl font-bold leading-tight">{t.superAgents.title}</h2>
                <p className="text-sm text-white/80">{t.superAgents.description}</p>
                <button
                  type="button"
                  onClick={() => openLoginModal('ownerPartner')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-gray-900 px-6 py-3 text-sm font-semibold"
                >
                  {t.superAgents.button}
                </button>
              </div>
              <div className="rounded-3xl bg-white/10 border border-white/30 p-6 space-y-4 backdrop-blur">
                <div className="rounded-2xl bg-white/90 text-gray-900 px-4 py-3 shadow-lg">
                  <p className="text-xs font-semibold text-gray-500">Agent status</p>
                  <p className="text-lg font-semibold">Delegando qualquer tarefa em segundos</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/30 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-white/70">Works 24/7</p>
                  <p className="text-sm font-semibold">Entrega checklists antes da rota</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/30 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-white/70">Infinite memory</p>
                  <p className="text-sm font-semibold">Guarda preferências fixas dos Clients</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dark AI section */}
      <section className="hidden sm:block bg-black text-white py-16">
        <div className="max-w-6xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">{t.ai.badge}</p>
            <h2 className="text-3xl font-bold">{t.ai.title}</h2>
            <p className="text-white/70 max-w-3xl mx-auto">{t.ai.description}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {aiCards.map((card) => (
              <div key={card.title} className="rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 p-6 space-y-3">
                <p className="text-xs uppercase tracking-wide text-white/50">{card.badge}</p>
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="text-sm text-white/70">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section id="solutions" className="hidden sm:block bg-white py-16">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t.solutions.badge}</p>
            <h2 className="text-3xl font-bold text-gray-900">{t.solutions.title}</h2>
            <p className="text-gray-600">{t.solutions.description}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {solutionTabs.map((tab, index) => (
              <span
                key={tab}
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  index === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {solutionHighlights.map((solution) => (
              <div key={solution.title} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 text-left space-y-2">
                <p className="text-sm font-semibold text-gray-900">{solution.title}</p>
                <p className="text-sm text-gray-500">{solution.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="hidden sm:block bg-gradient-to-br from-[#06010a] via-[#12061c] to-[#32104d] text-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">{t.finalCta.badge}</p>
          <h2 className="text-3xl font-bold">{t.finalCta.title}</h2>
          <p className="text-white/70 max-w-3xl mx-auto">{t.finalCta.description}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => openLoginModal('ownerPartner')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-gray-900 px-6 py-3 text-sm font-semibold"
            >
              {t.finalCta.primary}
            </button>
            <button
              type="button"
              onClick={() => openLoginModal('client')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white/90"
            >
              {t.finalCta.client}
            </button>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white/90"
            >
              {t.finalCta.owner}
            </Link>
          </div>
          <p className="text-xs text-white/50">{t.finalCta.note}</p>
        </div>
      </section>

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
            
            {/* Header Background */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white -z-10" />
            
            <div className="p-8 pt-10 relative">
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginSegment(null);
                }}
                className="absolute top-0 right-0 p-2 m-4 rounded-full bg-white/50 hover:bg-white text-slate-400 hover:text-slate-600 transition-all shadow-sm hover:shadow-md"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-4 mb-8">
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm text-xs font-bold uppercase tracking-wider ${
                  loginSegment === 'client' 
                    ? 'bg-blue-50 text-blue-700 border-blue-100' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                  {loginSegment === 'client' ? <User size={14} /> : <Building2 size={14} />}
                  {loginSegment === 'client' ? t.modal.clientBadge : t.modal.ownerBadge}
                </div>
                
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    {loginSegment === 'client' ? 'Área do Cliente' : 'Bem-vindo de volta'}
                  </h2>
                  <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-[280px] mx-auto">
                    {loginSegment === 'client' ? t.modal.clientDescription : t.modal.ownerDescription}
                  </p>
                </div>
              </div>

              {loginSegment !== 'client' && (
                <div className="grid grid-cols-2 gap-2 mb-8 p-1.5 bg-slate-100/80 rounded-2xl">
                  {personaOptions.map((option) => {
                    const active = persona === option.key;
                    return (
                      <button
                        type="button"
                        key={option.key}
                        onClick={() => setPersona(option.key as LoginPersona)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                          active
                            ? 'bg-white text-slate-900 shadow-md transform scale-[1.02]'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium placeholder:text-slate-400 text-slate-900"
                      placeholder={t.form.emailPlaceholder}
                      required
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium placeholder:text-slate-400 text-slate-900"
                      placeholder={t.form.passwordPlaceholder}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex gap-3 items-start animate-in slide-in-from-top-2">
                    <div className="bg-red-100 p-1 rounded-full shrink-0">
                      <X size={12} className="text-red-600" />
                    </div>
                    <p className="text-xs font-medium text-red-600 leading-snug pt-0.5">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>{t.form.submitLoading}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.form.submitIdle}</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex flex-col gap-4 text-center">
                  <button type="button" className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    {t.modal.forgotPassword}
                  </button>
                  
                  {loginSegment !== 'client' && (
                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                      <p className="text-sm text-slate-600 mb-3">Ainda não tem conta?</p>
                      <Link
                        to="/register"
                        className="inline-flex w-full items-center justify-center py-3 bg-white border border-emerald-200 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm"
                      >
                        {t.modal.createOwner}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
