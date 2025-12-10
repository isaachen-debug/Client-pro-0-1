import { useEffect, useMemo, useState } from 'react';
import { Crown, Info, Sparkles, Users, Bell, Shield, ArrowRight } from 'lucide-react';
import { plans, formatPrice, planFeatures, PlanId, localPlanStorageKey } from '../constants/plans';
import { PageHeader, SurfaceCard, StatusBadge } from '../components/OwnerUI';
import { pageGutters, labelSm } from '../styles/uiTokens';

const badgeColors: Record<PlanId, string> = {
  free: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
  basic: 'text-indigo-600 bg-indigo-50 border border-indigo-100',
  pro: 'text-purple-600 bg-purple-50 border border-purple-100',
  scale: 'text-amber-700 bg-amber-50 border border-amber-100',
};

const Plans = () => {
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free');

  useEffect(() => {
    const stored = localStorage.getItem(localPlanStorageKey) as PlanId | null;
    if (stored && plans.find((p) => p.id === stored)) {
      setCurrentPlan(stored);
    }
  }, []);

  const handleSelect = (planId: PlanId) => {
    setCurrentPlan(planId);
    localStorage.setItem(localPlanStorageKey, planId);
  };

  const currentPlanData = useMemo(() => plans.find((p) => p.id === currentPlan) ?? plans[0], [currentPlan]);

  return (
    <div className={`${pageGutters} max-w-6xl mx-auto space-y-6`}>
      <PageHeader
        label="PLANOS"
        title="Planos & Billing"
        subtitle="Escolha o plano ideal para sua operação. Stripe entra depois; aqui você testa o visual e define limites."
      />

      <SurfaceCard className="bg-gradient-to-br from-primary-50 via-white to-accent-50 border-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className={labelSm}>Seu plano atual</p>
            <p className="text-2xl md:text-3xl font-semibold text-slate-900 flex items-center gap-2">
              {currentPlanData.name}
              {currentPlanData.id === 'scale' && <Crown size={16} className="text-amber-500" />}
            </p>
            <p className="text-sm text-slate-600">
              Alterar aqui afeta apenas o front por enquanto. Limites e recursos seguem o plano selecionado.
            </p>
          </div>
          <StatusBadge tone="primary" className="whitespace-nowrap">
            Plano atual (mock)
          </StatusBadge>
        </div>
      </SurfaceCard>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isActive = plan.id === currentPlan;
          const isScale = plan.id === 'scale';
          return (
            <div
              key={plan.id}
              className={`relative rounded-[24px] border bg-white p-5 space-y-4 shadow-sm ${
                isActive ? 'border-primary-200 shadow-[0_20px_50px_rgba(34,197,94,0.18)]' : 'border-slate-100'
              }`}
            >
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeColors[plan.id]}`}>
                {plan.name}
                {isActive && <span className="text-emerald-700">Plano atual</span>}
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{formatPrice(plan.priceCents)}</p>
                {plan.priceCents > 0 && <p className="text-xs text-slate-500">por mês</p>}
                <p className="text-sm text-slate-600 mt-2">{plan.description}</p>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <FeatureLine icon={Users} label={`${planFeatures.maxClientsLabel(plan)} no CRM`} />
                <FeatureLine icon={Users} label={`${planFeatures.maxHelpersLabel(plan)} helpers`} />
                <FeatureLine icon={Sparkles} label="Portal do cliente" enabled={plan.clientPortal} />
                <FeatureLine icon={Bell} label="Notificações" enabled={plan.notifications} />
                <FeatureLine icon={Shield} label="Suporte prioritário" enabled={plan.id !== 'free'} />
              </div>
              <div className="pt-2">
                {isScale ? (
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 font-semibold py-3 hover:bg-amber-100 transition"
                  >
                    Falar com vendas <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelect(plan.id)}
                    className={`w-full rounded-full py-3 font-semibold transition ${
                      isActive
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'border border-slate-200 bg-white text-slate-900 hover:border-primary-200 hover:text-primary-700'
                    }`}
                  >
                    {isActive ? 'Plano ativo' : 'Mudar para este plano'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-[24px] border border-gray-100 bg-white p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-emerald-600" />
          <p className="text-sm font-semibold text-gray-900">Como cada plano afeta limites e recursos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-800">Limites de clientes</p>
            <p className="text-gray-700 mt-2">
              Free: 10 • Basic: 40 • Pro: 150 • Scale: ilimitado. Ao chegar no limite, exibimos aviso e CTA para upgrade.
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="font-semibold text-indigo-800">Helpers por plano</p>
            <p className="text-gray-700 mt-2">Free/Basic: sem helpers. Pro: até 3. Scale: até 10 helpers.</p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
            <p className="font-semibold text-purple-800">Portal & Notificações</p>
            <p className="text-gray-700 mt-2">Liberados a partir do Pro (portal do cliente + notificações).</p>
          </div>
        </div>
      </section>
    </div>
  );
};

type FeatureLineProps = { icon: any; label: string; enabled?: boolean };

const FeatureLine = ({ icon: Icon, label, enabled = true }: FeatureLineProps) => (
  <div className="flex items-center gap-2">
    <span
      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
        enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
      }`}
    >
      <Icon size={14} />
    </span>
    <span className={enabled ? 'text-gray-800' : 'text-gray-400'}>{label}</span>
    {!enabled && <span className="text-[10px] text-gray-400 uppercase tracking-wide">Upgrade</span>}
  </div>
);

export default Plans;

