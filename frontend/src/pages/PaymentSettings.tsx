import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Check, Zap } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';

interface PaymentSettings {
    zelleEmail: string | null;
    venmoUsername: string | null;
    cashAppUsername: string | null;
    stripeConnected: boolean;
    enabledPaymentMethods: string[];
    businessLogo: string | null;
    paymentInstructions: string | null;
    companyName: string | null;
}

const PaymentSettings = () => {
    const navigate = useNavigate();
    const { theme } = usePreferences();
    const isDark = theme === 'dark';

    const [settings, setSettings] = useState<PaymentSettings>({
        zelleEmail: null,
        venmoUsername: null,
        cashAppUsername: null,
        stripeConnected: false,
        enabledPaymentMethods: [],
        businessLogo: null,
        paymentInstructions: null,
        companyName: null,
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/payments/settings', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Error fetching payment settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');

            const response = await fetch('http://localhost:3000/api/payments/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    zelleEmail: settings.zelleEmail || null,
                    venmoUsername: settings.venmoUsername || null,
                    cashAppUsername: settings.cashAppUsername || null,
                    enabledPaymentMethods: settings.enabledPaymentMethods,
                    businessLogo: settings.businessLogo || null,
                    paymentInstructions: settings.paymentInstructions || null,
                }),
            });

            if (response.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                alert('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const toggleMethod = (method: string) => {
        setSettings((prev) => ({
            ...prev,
            enabledPaymentMethods: prev.enabledPaymentMethods.includes(method)
                ? prev.enabledPaymentMethods.filter((m) => m !== method)
                : [...prev.enabledPaymentMethods, method],
        }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // TODO: Implement Cloudinary upload
        // For now, just use a placeholder
        const reader = new FileReader();
        reader.onloadend = () => {
            setSettings((prev) => ({ ...prev, businessLogo: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50/70'} p-4 sm:p-8 pb-32`}>
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/app/settings')}
                        className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}
                    >
                        <ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-900'} />
                    </button>
                    <div>
                        <h1 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Payment Methods
                        </h1>
                        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Configure how customers can pay you
                        </p>
                    </div>
                </div>

                {/* Business Logo */}
                <div className={`p-6 rounded-3xl border mb-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Business Logo
                    </h2>
                    <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        This logo will appear on customer invoices
                    </p>

                    <div className="flex items-center gap-4">
                        {settings.businessLogo ? (
                            <img
                                src={settings.businessLogo}
                                alt="Business logo"
                                className="h-20 w-20 object-contain rounded-xl border-2 border-slate-200"
                            />
                        ) : (
                            <div className="h-20 w-20 rounded-xl bg-slate-100 flex items-center justify-center">
                                <Upload size={32} className="text-slate-400" />
                            </div>
                        )}

                        <label className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer hover:bg-slate-800">
                            Upload Logo
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                    {/* Zelle */}
                    <div
                        className={`p-6 rounded-3xl border transition-all ${settings.enabledPaymentMethods.includes('ZELLE')
                            ? isDark
                                ? 'bg-purple-900/20 border-purple-600'
                                : 'bg-purple-50 border-purple-300'
                            : isDark
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                    <span className="text-2xl">💵</span>
                                </div>
                                <div>
                                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Zelle</h3>
                                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Free, instant bank transfer
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleMethod('ZELLE')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm ${settings.enabledPaymentMethods.includes('ZELLE')
                                    ? 'bg-purple-600 text-white'
                                    : isDark
                                        ? 'bg-slate-800 text-slate-400'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                            >
                                {settings.enabledPaymentMethods.includes('ZELLE') ? '✓ Enabled' : 'Enable'}
                            </button>
                        </div>

                        {settings.enabledPaymentMethods.includes('ZELLE') && (
                            <input
                                type="email"
                                value={settings.zelleEmail || ''}
                                onChange={(e) => setSettings({ ...settings, zelleEmail: e.target.value })}
                                placeholder="your@email.com"
                                className={`w-full px-4 py-3 rounded-xl border-none font-medium ${isDark ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50'
                                    }`}
                            />
                        )}
                    </div>

                    {/* Venmo */}
                    <div
                        className={`p-6 rounded-3xl border transition-all ${settings.enabledPaymentMethods.includes('VENMO')
                            ? isDark
                                ? 'bg-blue-900/20 border-blue-600'
                                : 'bg-blue-50 border-blue-300'
                            : isDark
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <span className="text-2xl">📱</span>
                                </div>
                                <div>
                                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Venmo</h3>
                                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Popular peer-to-peer payment
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleMethod('VENMO')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm ${settings.enabledPaymentMethods.includes('VENMO')
                                    ? 'bg-blue-600 text-white'
                                    : isDark
                                        ? 'bg-slate-800 text-slate-400'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                            >
                                {settings.enabledPaymentMethods.includes('VENMO') ? '✓ Enabled' : 'Enable'}
                            </button>
                        </div>

                        {settings.enabledPaymentMethods.includes('VENMO') && (
                            <input
                                type="text"
                                value={settings.venmoUsername || ''}
                                onChange={(e) => setSettings({ ...settings, venmoUsername: e.target.value })}
                                placeholder="@username"
                                className={`w-full px-4 py-3 rounded-xl border-none font-medium ${isDark ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50'
                                    }`}
                            />
                        )}
                    </div>

                    {/* Cash App */}
                    <div
                        className={`p-6 rounded-3xl border transition-all ${settings.enabledPaymentMethods.includes('CASH_APP')
                            ? isDark
                                ? 'bg-emerald-900/20 border-emerald-600'
                                : 'bg-emerald-50 border-emerald-300'
                            : isDark
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div>
                                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Cash App</h3>
                                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Quick mobile payments
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleMethod('CASH_APP')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm ${settings.enabledPaymentMethods.includes('CASH_APP')
                                    ? 'bg-emerald-600 text-white'
                                    : isDark
                                        ? 'bg-slate-800 text-slate-400'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                            >
                                {settings.enabledPaymentMethods.includes('CASH_APP') ? '✓ Enabled' : 'Enable'}
                            </button>
                        </div>

                        {settings.enabledPaymentMethods.includes('CASH_APP') && (
                            <input
                                type="text"
                                value={settings.cashAppUsername || ''}
                                onChange={(e) => setSettings({ ...settings, cashAppUsername: e.target.value })}
                                placeholder="$username"
                                className={`w-full px-4 py-3 rounded-xl border-none font-medium ${isDark ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50'
                                    }`}
                            />
                        )}
                    </div>

                    {/* Cash */}
                    <div
                        className={`p-6 rounded-3xl border transition-all ${settings.enabledPaymentMethods.includes('CASH')
                            ? isDark
                                ? 'bg-slate-800 border-slate-700'
                                : 'bg-slate-100 border-slate-300'
                            : isDark
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-slate-200 flex items-center justify-center">
                                    <span className="text-2xl">💵</span>
                                </div>
                                <div>
                                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Cash</h3>
                                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Pay in person
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleMethod('CASH')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm ${settings.enabledPaymentMethods.includes('CASH')
                                    ? 'bg-slate-700 text-white'
                                    : isDark
                                        ? 'bg-slate-800 text-slate-400'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                            >
                                {settings.enabledPaymentMethods.includes('CASH') ? '✓ Enabled' : 'Enable'}
                            </button>
                        </div>

                        {settings.enabledPaymentMethods.includes('CASH') && (
                            <textarea
                                value={settings.paymentInstructions || ''}
                                onChange={(e) => setSettings({ ...settings, paymentInstructions: e.target.value })}
                                placeholder="e.g., Pay in cash when service is complete"
                                rows={2}
                                className={`w-full px-4 py-3 rounded-xl border-none font-medium resize-none ${isDark ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50'
                                    }`}
                            />
                        )}
                    </div>

                    {/* Stripe (Future) */}
                    <div
                        className={`p-6 rounded-3xl border opacity-50 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <Zap size={24} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        Credit Card (Stripe)
                                    </h3>
                                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Coming soon - Accept credit cards
                                    </p>
                                </div>
                            </div>
                            <button
                                disabled
                                className={`px-4 py-2 rounded-xl font-bold text-sm ${isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'
                                    }`}
                            >
                                Coming Soon
                            </button>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-8 flex gap-4">
                    <button
                        onClick={handleSave}
                        disabled={saving || settings.enabledPaymentMethods.length === 0}
                        className="flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Saving...
                            </>
                        ) : saveSuccess ? (
                            <>
                                <Check size={20} />
                                Saved!
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>

                {settings.enabledPaymentMethods.length === 0 && (
                    <p className="text-center text-sm text-amber-600 mt-4">
                        ⚠️ Enable at least one payment method to save
                    </p>
                )}
            </div>
        </div>
    );
};

export default PaymentSettings;
