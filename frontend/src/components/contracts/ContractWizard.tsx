import { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Globe2, Plus, Upload, FileSignature, X } from 'lucide-react';
import type {
  AccessMethod,
  BillingType,
  ContractBlueprint,
  ContractTemplateStyle,
  Customer,
  ServiceFrequency,
} from '../../types';

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const frequencyOptions: Array<{ value: ServiceFrequency; label: string; helper: string }> = [
  { value: 'WEEKLY', label: 'Weekly', helper: '1x por semana' },
  { value: 'BIWEEKLY', label: 'Bi-weekly', helper: 'a cada 15 dias' },
  { value: 'MONTHLY', label: 'Monthly', helper: '1x por mês' },
  { value: 'ONE_TIME', label: 'One-time', helper: 'Visita única' },
];

const billingOptions: Array<{ value: BillingType; label: string; description: string }> = [
  { value: 'PER_VISIT', label: 'Per visit', description: 'Faturamento manual por visita' },
  { value: 'WEEKLY_AUTO', label: 'Weekly auto-charge', description: 'Cobrança automática semanal' },
  { value: 'MONTHLY', label: 'Monthly billing cycle', description: 'Fatura consolidada no mês' },
];

const accessOptions: Array<{ value: AccessMethod; label: string; helper: string }> = [
  { value: 'DOOR_CODE', label: 'Door code', helper: 'Código de portaria ou fechadura digital' },
  { value: 'KEY', label: 'Key', helper: 'Chave física ou lockbox' },
  { value: 'SOMEONE_HOME', label: 'Someone will be home', helper: 'Cliente ou familiar recebe a equipe' },
  { value: 'GARAGE', label: 'Garage code', helper: 'Código de garagem ou acesso lateral' },
];

const standardServices = [
  { key: 'dusting', label: 'Dusting' },
  { key: 'vacuuming', label: 'Vacuuming' },
  { key: 'mopping', label: 'Mopping' },
  { key: 'kitchenExterior', label: 'Kitchen exterior cleaning' },
  { key: 'bathroom', label: 'Bathroom sanitizing' },
  { key: 'trash', label: 'Trash removal' },
];

const deepServices = [
  { key: 'baseboards', label: 'Baseboards' },
  { key: 'insideFridge', label: 'Inside fridge' },
  { key: 'insideOven', label: 'Inside oven' },
  { key: 'windows', label: 'Windows tracks' },
  { key: 'highDusting', label: 'High dusting' },
];

const paymentMethodOptions = ['Credit card', 'Cash', 'Bank transfer', 'Zelle', 'Check'];

const defaultCancellation =
  'Cancellations must be made 24 hours before the appointment. Late cancellations may result in a $40 fee.';

const COMPANY_PANEL_STORAGE_KEY = 'clientepro:company-panel';

const defaultBlueprint = (logo?: string, accent?: string): ContractBlueprint => ({
  brand: {
    logo,
    accentColor: accent ?? '#22c55e',
    template: 'contemporary',
  },
  client: {
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    frequency: 'BIWEEKLY',
    pricePerVisit: 0,
  },
  services: {
    standard: Object.fromEntries(standardServices.map((service) => [service.key, true])),
    deep: Object.fromEntries(deepServices.map((service) => [service.key, false])),
    custom: [],
    addons: [],
  },
  payment: {
    amount: 0,
    billingType: 'PER_VISIT',
    paymentMethods: ['Credit card'],
    latePolicy: 'Late invoices are subject to a $15 fee after 5 days.',
  },
  cancellation: defaultCancellation,
  access: {
    method: 'DOOR_CODE',
    notes: '',
  },
  startDate: new Date().toISOString().slice(0, 10),
});

const stepConfig = [
  { id: 'brand', title: 'Client & brand' },
  { id: 'services', title: 'Included services' },
  { id: 'payment', title: 'Payment terms' },
  { id: 'cancellation', title: 'Policies' },
  { id: 'access', title: 'Access method' },
  { id: 'preview', title: 'Preview & send' },
];

export interface ContractWizardProps {
  clients: Customer[];
  ownerLogo?: string;
  ownerAccentColor?: string;
  saving: boolean;
  onSubmit: (blueprint: ContractBlueprint, action: 'send' | 'sign' | 'save') => Promise<void>;
}

const ContractWizard = ({ clients, ownerLogo, ownerAccentColor, saving, onSubmit }: ContractWizardProps) => {
  const [step, setStep] = useState(0);
  const [customServiceInput, setCustomServiceInput] = useState('');
  const [addonDraft, setAddonDraft] = useState({ label: '', price: '' });
  const [blueprint, setBlueprint] = useState<ContractBlueprint>(() => defaultBlueprint(ownerLogo, ownerAccentColor));
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSending, setLocalSending] = useState(false);
  const [specialtyOptions, setSpecialtyOptions] = useState<Array<{ id: string; label: string; helper: string }>>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialtyAddonDrafts, setSpecialtyAddonDrafts] = useState<Record<string, string>>({});

  // Service Packages
  const [servicePackages, setServicePackages] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/services', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setServicePackages(data);
        }
      } catch (error) {
        console.error('Failed to fetch service packages', error);
      }
    };
    fetchPackages();
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(COMPANY_PANEL_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const activeSpecialties = (parsed?.specialties ?? []).filter((item: any) => item?.active && item?.label);
      setSpecialtyOptions(
        activeSpecialties.map((item: any) => ({
          id: item.id ?? item.label,
          label: item.label,
          helper: item.helper ?? '',
        })),
      );
    } catch (error) {
      console.warn('Não foi possível carregar atuações especiais', error);
    }
  }, []);

  useEffect(() => {
    const activeLabels = specialtyOptions
      .map((spec) => spec.label)
      .filter((label) => blueprint.services.custom.includes(label));
    setSelectedSpecialties(activeLabels);
  }, [specialtyOptions, blueprint.services.custom]);

  const selectedClient = useMemo(() => clients.find((client) => client.id === blueprint.client.id), [
    blueprint.client.id,
    clients,
  ]);
  const hasClientEmail = useMemo(
    () => Boolean(selectedClient?.email?.trim() || blueprint.client.email?.trim()),
    [selectedClient?.email, blueprint.client.email],
  );

  const canProceed = useMemo(() => {
    switch (stepConfig[step].id) {
      case 'brand':
        return Boolean(blueprint.client.id && blueprint.client.frequency && blueprint.client.pricePerVisit >= 0);
      case 'services':
        return (
          Object.values(blueprint.services.standard).some(Boolean) ||
          Object.values(blueprint.services.deep).some(Boolean) ||
          blueprint.services.custom.length > 0
        );
      case 'payment':
        return blueprint.payment.amount > 0 && blueprint.payment.paymentMethods.length > 0;
      case 'cancellation':
        return blueprint.cancellation.trim().length > 10;
      case 'access':
        return Boolean(blueprint.access.method);
      case 'preview':
        return true;
      default:
        return true;
    }
  }, [blueprint, step]);

  const updateBrand = (updates: Partial<ContractBlueprint['brand']>) => {
    setBlueprint((prev) => ({
      ...prev,
      brand: {
        ...prev.brand,
        ...updates,
      },
    }));
  };

  const updateClient = (updates: Partial<ContractBlueprint['client']>) => {
    setBlueprint((prev) => ({
      ...prev,
      client: {
        ...prev.client,
        ...updates,
      },
    }));
  };

  const updateServices = (updates: Partial<ContractBlueprint['services']>) => {
    setBlueprint((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        ...updates,
      },
    }));
  };

  const updatePayment = (updates: Partial<ContractBlueprint['payment']>) => {
    setBlueprint((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        ...updates,
      },
    }));
  };

  const updateAccess = (updates: Partial<ContractBlueprint['access']>) => {
    setBlueprint((prev) => ({
      ...prev,
      access: {
        ...prev.access,
        ...updates,
      },
    }));
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      updateClient({ id: '', name: '', email: '', phone: '', address: '', pricePerVisit: 0 });
      return;
    }
    updateClient({
      id: client.id,
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      pricePerVisit: client.defaultPrice ?? 0,
    });
    updatePayment({ amount: client.defaultPrice ?? blueprint.payment.amount });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateBrand({ logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleCustomServiceAdd = () => {
    if (!customServiceInput.trim()) return;
    updateServices({
      custom: [...blueprint.services.custom, customServiceInput.trim()],
    });
    setCustomServiceInput('');
  };

  const handleCustomServiceRemove = (item: string) => {
    updateServices({
      custom: blueprint.services.custom.filter((service) => service !== item),
    });
  };

  const addAddon = () => {
    const label = addonDraft.label.trim();
    const priceValue = Number(addonDraft.price);
    if (!label || Number.isNaN(priceValue) || priceValue <= 0) return;
    updateServices({
      addons: [
        ...blueprint.services.addons,
        { id: Math.random().toString(36).slice(2, 9), label, price: priceValue },
      ],
    });
    setAddonDraft({ label: '', price: '' });
  };

  const removeAddon = (id: string) => {
    updateServices({
      addons: blueprint.services.addons.filter((addon) => addon.id !== id),
    });
  };

  const toggleSpecialtySelection = (specialty: { id: string; label: string }) => {
    const isSelected = selectedSpecialties.includes(specialty.label);
    if (isSelected) {
      setSelectedSpecialties((prev) => prev.filter((item) => item !== specialty.label));
      updateServices({
        custom: blueprint.services.custom.filter((item) => item !== specialty.label),
        addons: blueprint.services.addons.filter((addon) => addon.id !== `spec-${specialty.id}`),
      });
      setSpecialtyAddonDrafts((prev) => {
        if (!(specialty.id in prev)) return prev;
        const { [specialty.id]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }
    setSelectedSpecialties((prev) => [...prev, specialty.label]);
    updateServices({
      custom: Array.from(new Set([...blueprint.services.custom, specialty.label])),
    });
  };

  const handleSpecialtyAddonSave = (specialty: { id: string; label: string }) => {
    const existingAddon = blueprint.services.addons.find((addon) => addon.id === `spec-${specialty.id}`);
    const rawValue = specialtyAddonDrafts[specialty.id] ?? (existingAddon ? String(existingAddon.price) : '');
    if (!rawValue?.trim()) return;
    const priceValue = Number(rawValue);
    if (Number.isNaN(priceValue) || priceValue <= 0) return;
    updateServices({
      addons: [
        ...blueprint.services.addons.filter((addon) => addon.id !== `spec-${specialty.id}`),
        { id: `spec-${specialty.id}`, label: `${specialty.label} premium`, price: priceValue },
      ],
    });
    setSpecialtyAddonDrafts((prev) => ({ ...prev, [specialty.id]: priceValue.toString() }));
  };

  const togglePaymentMethod = (method: string) => {
    const exists = blueprint.payment.paymentMethods.includes(method);
    updatePayment({
      paymentMethods: exists
        ? blueprint.payment.paymentMethods.filter((item) => item !== method)
        : [...blueprint.payment.paymentMethods, method],
    });
  };

  const includedServices = useMemo(() => {
    const list: string[] = [];
    standardServices.forEach((service) => {
      if (blueprint.services.standard[service.key]) list.push(service.label);
    });
    deepServices.forEach((service) => {
      if (blueprint.services.deep[service.key]) list.push(service.label);
    });
    const addonsWithPrice = blueprint.services.addons.map(
      (addon) => `${addon.label} (+${usdFormatter.format(addon.price)})`,
    );
    return [...list, ...blueprint.services.custom, ...addonsWithPrice];
  }, [blueprint.services]);

  const handleFinish = async (action: 'send' | 'sign' | 'save') => {
    if (!blueprint.client.id) {
      setLocalError('Selecione um cliente para enviar ou assinar.');
      return;
    }
    setLocalError(null);
    // No email? bloqueia apenas o "send"
    if (action === 'send' && !hasClientEmail) {
      setLocalError('Adicione um email do cliente para enviar notificações.');
      return;
    }
    try {
      setLocalSending(true);
      await onSubmit(blueprint, action);
    } catch (err) {
      console.error('Erro ao finalizar contrato', err);
      setLocalError('Não foi possível concluir. Tente novamente em instantes.');
    } finally {
      setLocalSending(false);
    }
  };

  const renderBrandStep = () => (
    <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
      <div className="space-y-4">
        <div className="border border-dashed border-gray-300 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">1. Add a logo</p>
          <label className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-300">
            {blueprint.brand.logo ? (
              <img src={blueprint.brand.logo} alt="Logo" className="h-16 object-contain" />
            ) : (
              <>
                <Upload className="text-gray-400" size={24} />
                <p className="text-sm text-gray-500 text-center">
                  Browse or drop your logo here
                  <br />
                  <span className="text-xs text-gray-400">Máximo 5MB - JPG, PNG ou GIF</span>
                </p>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </label>
        </div>

        <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">2. Choose an accent color</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={blueprint.brand.accentColor}
              onChange={(e) => updateBrand({ accentColor: e.target.value })}
              className="w-12 h-12 border-none rounded-xl overflow-hidden cursor-pointer"
            />
            <input
              type="text"
              value={blueprint.brand.accentColor}
              onChange={(e) => updateBrand({ accentColor: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="#22c55e"
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">3. Choose a template</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['contemporary', 'modern', 'classic'] as ContractTemplateStyle[]).map((template) => (
              <label
                key={template}
                className={`border rounded-xl px-4 py-3 cursor-pointer text-sm font-semibold capitalize ${blueprint.brand.template === template
                  ? 'border-primary-500 text-primary-700 bg-primary-50'
                  : 'border-gray-200 text-gray-600 hover:border-primary-200'
                  }`}
              >
                <input
                  type="radio"
                  name="template"
                  className="hidden"
                  value={template}
                  checked={blueprint.brand.template === template}
                  onChange={() => updateBrand({ template })}
                />
                {template}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Client information</p>
          <select
            value={blueprint.client.id}
            onChange={(e) => handleClientChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {selectedClient && (
            <div className="text-sm text-gray-600 space-y-1">
              <p>{selectedClient.email || 'Sem email cadastrado'}</p>
              <p>{selectedClient.phone || 'Sem telefone'}</p>
              <p className="text-xs text-gray-400">{selectedClient.address || 'Sem endereço'}</p>
            </div>
          )}
        </div>

        <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Service frequency</p>
          <div className="space-y-2">
            {frequencyOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer ${blueprint.client.frequency === option.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-200'
                  }`}
              >
                <span>
                  <span className="font-semibold text-gray-900">{option.label}</span>
                  <span className="block text-xs text-gray-500">{option.helper}</span>
                </span>
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  className="hidden"
                  checked={blueprint.client.frequency === option.value}
                  onChange={() => updateClient({ frequency: option.value })}
                />
                <span
                  className={`w-4 h-4 rounded-full border ${blueprint.client.frequency === option.value ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                    }`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Price per visit</p>
          <input
            type="number"
            min={0}
            value={blueprint.payment.amount}
            onChange={(e) => updatePayment({ amount: Number(e.target.value) })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="USD"
          />
          <p className="text-xs text-gray-500">Preço sugerido: {selectedClient?.defaultPrice ? `$${selectedClient.defaultPrice}` : '--'}</p>
        </div>
      </div>
    </div>
  );

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackageId(packageId);
    const pkg = servicePackages.find(p => p.id === packageId);
    if (!pkg) return;

    let items: string[] = [];
    try { items = JSON.parse(pkg.items); } catch (e) { }

    // Reset current selections
    const newStandard = Object.fromEntries(standardServices.map(s => [s.key, false]));
    const newDeep = Object.fromEntries(deepServices.map(s => [s.key, false]));
    const newCustom: string[] = [];

    // Map items to standard/deep or custom
    items.forEach(item => {
      const stdKey = standardServices.find(s => s.label === item)?.key;
      const deepKey = deepServices.find(s => s.label === item)?.key;

      if (stdKey) newStandard[stdKey] = true;
      else if (deepKey) newDeep[deepKey] = true;
      else newCustom.push(item);
    });

    updateServices({
      standard: newStandard,
      deep: newDeep,
      custom: newCustom
    });

    // Update price if package has one
    if (pkg.price > 0) {
      updatePayment({ amount: pkg.price });
    }
  };

  const renderServicesStep = () => (
    <div className="grid gap-6 lg:grid-cols-2">

      {/* Package Selector */}
      {servicePackages.length > 0 && (
        <div className="lg:col-span-2 border border-emerald-100 bg-emerald-50/50 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-900">Quick Fill from Package</p>
            <p className="text-xs text-emerald-700">Select a service package to auto-fill items and price.</p>
          </div>
          <select
            value={selectedPackageId}
            onChange={(e) => handlePackageSelect(e.target.value)}
            className="px-3 py-2 rounded-xl border border-emerald-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select a package...</option>
            {servicePackages.map(pkg => (
              <option key={pkg.id} value={pkg.id}>{pkg.name} - ${pkg.price}</option>
            ))}
          </select>
        </div>
      )}

      <div className="border border-gray-200 rounded-2xl p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Standard Cleaning</p>
          <p className="text-xs text-gray-500">Esses itens ficam marcados por padrão</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {standardServices.map((service) => (
            <label
              key={service.key}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer ${blueprint.services.standard[service.key]
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-700 hover:border-primary-200'
                }`}
            >
              <input
                type="checkbox"
                checked={blueprint.services.standard[service.key]}
                onChange={(e) =>
                  updateServices({
                    standard: { ...blueprint.services.standard, [service.key]: e.target.checked },
                  })
                }
              />
              {service.label}
            </label>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Deep Cleaning</p>
          <p className="text-xs text-gray-500">Itens extras e cobrança diferenciada</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {deepServices.map((service) => (
            <label
              key={service.key}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer ${blueprint.services.deep[service.key]
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-700 hover:border-primary-200'
                }`}
            >
              <input
                type="checkbox"
                checked={blueprint.services.deep[service.key]}
                onChange={(e) =>
                  updateServices({
                    deep: { ...blueprint.services.deep, [service.key]: e.target.checked },
                  })
                }
              />
              {service.label}
            </label>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl p-4 space-y-3 lg:col-span-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">Custom items</p>
          <span className="text-xs text-gray-500">Laundry folding, pet hair removal, etc.</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customServiceInput}
            onChange={(e) => setCustomServiceInput(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Ex: Laundry folding"
          />
          <button
            type="button"
            onClick={handleCustomServiceAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50"
          >
            <Plus size={16} /> Add
          </button>
        </div>
        {blueprint.services.custom.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {blueprint.services.custom.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm"
              >
                {item}
                <button type="button" onClick={() => handleCustomServiceRemove(item)}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-2xl p-4 space-y-3 lg:col-span-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">Extras com valor adicional</p>
          <span className="text-xs text-gray-500">Cobrança extra por serviços especiais.</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={addonDraft.label}
            onChange={(e) => setAddonDraft((prev) => ({ ...prev, label: e.target.value }))}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Ex: Inside oven deep clean"
          />
          <input
            type="number"
            min={1}
            step="0.01"
            value={addonDraft.price}
            onChange={(e) => setAddonDraft((prev) => ({ ...prev, price: e.target.value }))}
            className="w-32 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="USD"
          />
          <button
            type="button"
            onClick={addAddon}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-200 text-primary-700 font-semibold hover:bg-primary-50"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
        {blueprint.services.addons.length > 0 && (
          <div className="space-y-2">
            {blueprint.services.addons.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary-50 text-primary-800 text-sm"
              >
                <div>
                  <p className="font-semibold">{addon.label}</p>
                  <p className="text-xs">{usdFormatter.format(addon.price)} adicionais</p>
                </div>
                <button type="button" onClick={() => removeAddon(addon.id)} className="text-primary-600 hover:text-primary-800">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {specialtyOptions.length > 0 && (
        <div className="border border-gray-200 rounded-2xl p-4 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Atuações especiais</p>
              <p className="text-xs text-gray-500">Serviços premium configurados na aba Empresa.</p>
            </div>
            <span className="text-[11px] text-gray-400">{selectedSpecialties.length} selecionados</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {specialtyOptions.map((specialty) => {
              const isActive = selectedSpecialties.includes(specialty.label);
              const specialtyAddon = blueprint.services.addons.find((addon) => addon.id === `spec-${specialty.id}`);
              const inputValue =
                specialtyAddonDrafts[specialty.id] ??
                (specialtyAddon ? String(specialtyAddon.price) : '');
              return (
                <div
                  key={specialty.id}
                  className={`border rounded-xl p-3 transition ${isActive
                    ? 'border-primary-300 bg-primary-50 text-primary-900'
                    : 'border-gray-200 text-gray-700 hover:border-primary-200'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSpecialtySelection(specialty)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-semibold">{specialty.label}</p>
                    <p className="text-xs text-gray-500">
                      {specialty.helper || 'Adicionar serviço premium ao contrato.'}
                    </p>
                    <p className="text-[11px] mt-1">
                      Status:{' '}
                      <span className={isActive ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                        {isActive ? 'Selecionado' : 'Desativado'}
                      </span>
                    </p>
                  </button>
                  {isActive && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={inputValue}
                          onChange={(e) =>
                            setSpecialtyAddonDrafts((prev) => ({
                              ...prev,
                              [specialty.id]: e.target.value,
                            }))
                          }
                          placeholder="Valor extra (USD)"
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSpecialtyAddonSave(specialty)}
                          className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
                        >
                          Salvar
                        </button>
                      </div>
                      {specialtyAddon && (
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Aplicado: {usdFormatter.format(specialtyAddon.price)}</span>
                          <button
                            type="button"
                            onClick={() => removeAddon(specialtyAddon.id)}
                            className="text-red-500 font-semibold"
                          >
                            Remover
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderPaymentStep = () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="border border-gray-200 rounded-2xl p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Payment details</p>
          <p className="text-xs text-gray-500">Valor por visita e ciclo de cobrança</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500">Amount per visit</label>
            <input
              type="number"
              value={blueprint.payment.amount}
              min={0}
              onChange={(e) => updatePayment({ amount: Number(e.target.value) })}
              className="mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500">Billing type</label>
            <div className="space-y-2 mt-1">
              {billingOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 px-3 py-2 rounded-xl border cursor-pointer ${blueprint.payment.billingType === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200'
                    }`}
                >
                  <input
                    type="radio"
                    name="billingType"
                    className="mt-1"
                    checked={blueprint.payment.billingType === option.value}
                    onChange={() => updatePayment({ billingType: option.value })}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Payment methods accepted</p>
          <p className="text-xs text-gray-500">Selecione todas as opções disponíveis</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {paymentMethodOptions.map((method) => {
            const active = blueprint.payment.paymentMethods.includes(method);
            return (
              <button
                key={method}
                type="button"
                onClick={() => togglePaymentMethod(method)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border ${active ? 'bg-primary-50 text-primary-700 border-primary-200' : 'border-gray-200 text-gray-600'
                  }`}
              >
                {method}
              </button>
            );
          })}
        </div>
        <div>
          <label className="text-xs uppercase font-semibold text-gray-500">Late policy</label>
          <textarea
            rows={3}
            value={blueprint.payment.latePolicy ?? ''}
            onChange={(e) => updatePayment({ latePolicy: e.target.value })}
            className="mt-1 w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-xs uppercase font-semibold text-gray-500">Start date</label>
          <input
            type="date"
            value={blueprint.startDate}
            onChange={(e) => setBlueprint((prev) => ({ ...prev, startDate: e.target.value }))}
            className="mt-1 w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );

  const renderCancellationStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Ajuste a política de cancelamento. O texto abaixo será exibido para o cliente e helpers.
      </p>
      <textarea
        rows={6}
        value={blueprint.cancellation}
        onChange={(e) => setBlueprint((prev) => ({ ...prev, cancellation: e.target.value }))}
        className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );

  const renderAccessStep = () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-900">How do we enter?</p>
        <div className="space-y-2">
          {accessOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer ${blueprint.access.method === option.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-200'
                }`}
            >
              <span>
                <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                <span className="text-xs text-gray-500">{option.helper}</span>
              </span>
              <input
                type="radio"
                name="accessMethod"
                className="hidden"
                checked={blueprint.access.method === option.value}
                onChange={() => updateAccess({ method: option.value })}
              />
              <span
                className={`w-4 h-4 rounded-full border ${blueprint.access.method === option.value ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                  }`}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Notes for the team</p>
        <textarea
          rows={6}
          value={blueprint.access.notes ?? ''}
          onChange={(e) => updateAccess({ notes: e.target.value })}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Alarm code, pets em casa, lembretes..."
        />
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
      <div className="border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <div
          className="px-6 py-4 text-white"
          style={{ background: blueprint.brand.accentColor || '#22c55e' }}
        >
          <div className="flex items-center gap-3">
            {blueprint.brand.logo ? (
              <img src={blueprint.brand.logo} alt="Logo" className="h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center text-white font-bold">
                {blueprint.client.name.slice(0, 2).toUpperCase() || 'CP'}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide opacity-80">Cleaning agreement</p>
              <p className="text-lg font-semibold">{blueprint.client.name || 'Client name'}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Frequency</p>
              <p className="font-semibold text-gray-900">
                {frequencyOptions.find((f) => f.value === blueprint.client.frequency)?.label || '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Price per visit</p>
              <p className="font-semibold text-gray-900">
                {blueprint.payment.amount ? `$${blueprint.payment.amount.toFixed(2)}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Billing</p>
              <p className="font-semibold text-gray-900">
                {billingOptions.find((option) => option.value === blueprint.payment.billingType)?.label}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Start date</p>
              <p className="font-semibold text-gray-900">{blueprint.startDate || '—'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Included services</p>
            <ul className="text-sm text-gray-600 space-y-1 max-h-36 overflow-y-auto pr-1">
              {includedServices.map((service) => (
                <li key={service} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {service}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-900 mb-1">Payment & policies</p>
            <p className="mb-2">{blueprint.payment.latePolicy}</p>
            <p>{blueprint.cancellation}</p>
          </div>

          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-900 mb-1">Access method</p>
            <p>
              {
                accessOptions.find((option) => option.value === blueprint.access.method)
                  ?.label
              }
            </p>
            {blueprint.access.notes && <p className="text-xs text-gray-500">{blueprint.access.notes}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Client view highlights</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Nome, frequência e preço aparecem logo no topo.</li>
            <li>• Checklist incluído para o cliente e helper.</li>
            <li>• Links de pagamento e políticas aplicadas automaticamente.</li>
          </ul>
        </div>
        <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-gray-50">
          <p className="text-sm font-semibold text-gray-900">Ready to send?</p>
          <p className="text-sm text-gray-600">
            Use "Send to client" para notificar por app/email. Sem email? Use "Save only" para baixar o PDF agora ou
            "Sign now" para arquivar como assinado.
          </p>
          {!hasClientEmail && (
            <p className="text-sm text-amber-600">
              Cliente sem email cadastrado. Para enviar notificações, adicione um email ou use "Save only".
            </p>
          )}
          {localError && <p className="text-sm text-red-600">{localError}</p>}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={saving || localSending || !hasClientEmail}
              onClick={() => handleFinish('send')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60"
            >
              <Globe2 size={16} />{' '}
              {hasClientEmail ? (saving || localSending ? 'Enviando...' : 'Send to client') : 'Add email to send'}
            </button>
            <button
              type="button"
              disabled={saving || localSending}
              onClick={() => handleFinish('save')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60"
            >
              <FileSignature size={16} /> Save only (no email)
            </button>
            <button
              type="button"
              disabled={saving || localSending}
              onClick={() => handleFinish('sign')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60"
            >
              <FileSignature size={16} /> Sign now
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (stepConfig[step].id) {
      case 'brand':
        return renderBrandStep();
      case 'services':
        return renderServicesStep();
      case 'payment':
        return renderPaymentStep();
      case 'cancellation':
        return renderCancellationStep();
      case 'access':
        return renderAccessStep();
      case 'preview':
        return renderPreviewStep();
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {stepConfig.map((item, index) => {
          const active = index === step;
          const completed = index < step;
          return (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${active ? 'bg-primary-600 text-white' : completed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                  }`}
              >
                {completed ? <CheckCircle2 size={16} /> : index + 1}
              </div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {item.title}
              </div>
            </div>
          );
        })}
      </div>

      {renderStep()}

      {stepConfig[step].id !== 'preview' && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep((prev) => Math.min(stepConfig.length - 1, prev + 1))}
            disabled={!canProceed}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ContractWizard;
