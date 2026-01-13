import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    MapPin,
    Phone,
    DollarSign,
    Shield,
    Truck,
    Star,
    CheckCircle2,
    Calendar,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { teamApi } from '../../services/api';

const AddMember = () => {
    const navigate = useNavigate();
    const { theme } = usePreferences();
    const isDark = theme === 'dark';
    const [role, setRole] = useState<'HELPER' | 'DRIVER' | 'LEADER'>('HELPER');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [avatarColor, setAvatarColor] = useState('bg-pink-500');

    const [permissions, setPermissions] = useState({
        address: false,
        phone: false,
        financial: false
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');


    const colors = [
        'bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500',
        'bg-cyan-500', 'bg-emerald-500', 'bg-orange-500', 'bg-red-500'
    ];

    const handleSave = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) {
            setError('Preencha os campos obrigatórios (Nome, Email, Senha).');
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            await teamApi.createHelper({
                name,
                email,
                password
            });
            // Note: Since API doesn't support permissions/role yet in createHelper, 
            // we assume they are defaults or would be updated in a second call if endpoints existed.
            // For now, we focus on creating the user credentials as per previous logic.
            setSuccess('Membro adicionado com sucesso!');
            setTimeout(() => navigate('/app/team'), 1500);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.error || 'Erro ao criar membro.');
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <div className={`min-h-screen pb-20 md:pb-0 ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
            {/* Header */}
            <div className={`sticky top-0 z-10 px-4 py-4 flex items-center gap-3 border-b backdrop-blur-md ${isDark ? 'bg-[#0f172a]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
                <button
                    onClick={() => navigate(-1)}
                    className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Adicionar Membro</h1>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-6">
                {/* Avatar & Name Section */}
                <div className={`rounded-3xl p-6 text-center ${isDark ? 'bg-slate-900' : 'bg-white'} shadow-sm border ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="relative inline-block mb-4">
                        <div className={`h-24 w-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg ${avatarColor}`}>
                            <User size={40} />
                        </div>
                        <button className={`absolute bottom-0 right-0 p-2 rounded-full border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
                            <Star size={14} />
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder="Nome do Colaborador"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full text-center text-xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-opacity-50 ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
                    />

                    <div className="mt-4 space-y-3 px-4">
                        <input
                            type="email"
                            placeholder="Email de acesso"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full text-center text-sm bg-transparent border-b ${isDark ? 'border-slate-700 text-white placeholder:text-slate-600' : 'border-slate-200 text-slate-900 placeholder:text-slate-400'} focus:border-indigo-500 focus:outline-none px-2 py-2`}
                        />
                        <input
                            type="password"
                            placeholder="Senha inicial"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full text-center text-sm bg-transparent border-b ${isDark ? 'border-slate-700 text-white placeholder:text-slate-600' : 'border-slate-200 text-slate-900 placeholder:text-slate-400'} focus:border-indigo-500 focus:outline-none px-2 py-2`}
                        />
                    </div>

                    <div className="flex justify-center gap-2 mt-6">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setAvatarColor(c)}
                                className={`w-6 h-6 rounded-full transition-transform ${c} ${avatarColor === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-transparent ring-indigo-500' : ''}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-3">
                    <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Função</label>
                    <div className={`grid grid-cols-3 gap-2 p-1 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        {[
                            { id: 'HELPER', icon: User, label: 'Ajudante' },
                            { id: 'DRIVER', icon: Truck, label: 'Motorista' },
                            { id: 'LEADER', icon: Shield, label: 'Líder' }
                        ].map((r) => (
                            <button
                                key={r.id}
                                onClick={() => setRole(r.id as any)}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${role === r.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <r.icon size={16} />
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Focada na execução. Acesso limitado.</p>
                    </div>
                </div>

                {/* Permissions */}
                <div className="space-y-3">
                    <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Acessos & Privacidade</label>

                    <div className={`divide-y rounded-3xl overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'}`}>
                        {/* Address */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Ver Endereços</p>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Visualizar rota e localização exata.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPermissions(p => ({ ...p, address: !p.address }))}
                                className={`relative w-12 h-7 rounded-full transition-colors ${permissions.address ? 'bg-indigo-500' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`}
                            >
                                <div className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${permissions.address ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>

                        {/* Phone */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Ver Telefones</p>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Entrar em contato com o cliente.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPermissions(p => ({ ...p, phone: !p.phone }))}
                                className={`relative w-12 h-7 rounded-full transition-colors ${permissions.phone ? 'bg-indigo-500' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`}
                            >
                                <div className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${permissions.phone ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>

                        {/* Financial */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Dados Financeiros</p>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Ver preços e relatórios de ganho.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPermissions(p => ({ ...p, financial: !p.financial }))}
                                className={`relative w-12 h-7 rounded-full transition-colors ${permissions.financial ? 'bg-indigo-500' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`}
                            >
                                <div className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${permissions.financial ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Simulation Preview */}
                <div className="space-y-3">
                    <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Simulação de Visualização</label>
                    <div className={`relative overflow-hidden rounded-[32px] border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

                        {/* Phone Mockup Content */}
                        <div className="p-6 relative">
                            <div className={`rounded-2xl p-4 mb-4 ${isDark ? 'bg-slate-900' : 'bg-white shadow-sm'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-3">
                                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">EJ</div>
                                        <div>
                                            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Emily Johnson</p>
                                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Limpeza Padrão • 4h</p>
                                        </div>
                                    </div>
                                    <div className="bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">HOJE</div>
                                </div>

                                {/* Simulated Content based on permissions */}
                                <div className="mt-4 space-y-2">
                                    <div className={`h-2 rounded w-3/4 ${permissions.address ? (isDark ? 'bg-slate-700' : 'bg-slate-200') : (isDark ? 'bg-slate-800/50' : 'bg-slate-100')} transition-colors`} />
                                    <div className={`h-2 rounded w-1/2 ${permissions.phone ? (isDark ? 'bg-slate-700' : 'bg-slate-200') : (isDark ? 'bg-slate-800/50' : 'bg-slate-100')} transition-colors`} />
                                    <div className={`h-8 rounded-lg mt-3 w-full border ${isDark ? 'border-dashed border-slate-700' : 'border-dashed border-slate-200'} flex items-center justify-center`}>
                                        <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {permissions.financial ? '$120.00 visível' : 'Valor Oculto'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Nav Simulation */}
                            <div className={`flex justify-between items-center px-2 py-1 opacity-50 ${isDark ? 'grayscale' : 'grayscale opacity-40'}`}>
                                <Calendar size={20} />
                                <User size={20} />
                                <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white"><Star size={18} fill="white" /></div>
                                <DollarSign size={20} />
                                <User size={20} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                {error && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-600'}`}>
                        <AlertCircle size={20} />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {success && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-emerald-900/20 text-emerald-200' : 'bg-emerald-50 text-emerald-600'}`}>
                        <CheckCircle2 size={20} />
                        <p className="text-sm font-medium">{success}</p>
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={handleSave}
                    disabled={submitting}
                    className="w-full py-4 rounded-2xl bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
                >
                    {submitting ? (
                        <Loader2 size={22} className="animate-spin" />
                    ) : (
                        <CheckCircle2 size={22} className="text-emerald-500" />
                    )}
                    {submitting ? 'Salvando...' : 'Salvar e Enviar Convite'}
                </button>
            </div>
        </div>
    );
};

export default AddMember;
