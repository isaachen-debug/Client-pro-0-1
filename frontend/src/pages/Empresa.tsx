import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import {
  Building2,
  Globe,
  Save,
  CheckCircle2,
  Smartphone,
  Share2
} from 'lucide-react';
import { pageGutters } from '../styles/uiTokens';
import { Link } from 'react-router-dom';

const Empresa = () => {
  const { user, updateProfile } = useAuth();
  const { theme } = usePreferences();
  const isDark = theme === 'dark';

  const [form, setForm] = useState({
    companyName: '',
    companyWebsite: '',
    description: '',
    // Review links
    google: '',
    instagram: '',
    facebook: '',
    website: ''
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        companyName: user.companyName || user.name || '',
        companyWebsite: user.companyWebsite || '',
        description: user.companyShowcase?.description || '',
        google: user.reviewLinks?.google || '',
        instagram: user.reviewLinks?.instagram || '',
        facebook: user.reviewLinks?.facebook || '',
        website: user.reviewLinks?.website || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      await updateProfile({
        companyName: form.companyName,
        companyWebsite: form.companyWebsite,
        companyShowcase: {
          headline: user?.companyShowcase?.headline || form.companyName,
          description: form.description,
          sections: user?.companyShowcase?.sections || [],
        },
        reviewLinks: {
          google: form.google,
          instagram: form.instagram,
          facebook: form.facebook,
          website: form.website
        }
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating company profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className={`min-h-full pb-20 ${isDark ? 'bg-slate-950' : 'bg-[#f6f7fb]'}`}>

      {/* Header Moderno (Igual ao Profile) */}
      <div className={`pt-8 pb-10 px-6 rounded-b-[2.5rem] shadow-sm border-b relative overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b -z-10 ${isDark ? 'from-slate-800/50 to-transparent' : 'from-slate-50/50 to-transparent'}`} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 max-w-4xl mx-auto">
          <div>
            <h1 className={`text-3xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Minha Empresa
            </h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Gerencie como sua marca aparece para os clientes no portal e nas faturas.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              to="/app/clientes"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Smartphone size={16} />
              Ver Portal
            </Link>
          </div>
        </div>
      </div>

      <div className={`${pageGutters} max-w-3xl mx-auto -mt-6 relative z-20 space-y-6`}>

        {/* Brand Identity Card */}
        <form onSubmit={handleSubmit} className={`rounded-3xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Building2 size={24} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Identidade Visual</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Nome e descrição da sua marca</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Nome da Empresa
              </label>
              <input
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                placeholder="Ex: Clean Up Pro"
                className={`w-full p-4 rounded-xl border font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${isDark
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Sobre a Empresa
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Uma breve descrição que aparecerá no perfil da sua empresa..."
                className={`w-full p-4 rounded-xl border font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none ${isDark
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
              />
              <p className={`text-xs mt-2 text-right ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {form.description.length}/150
              </p>
            </div>
          </div>
        </form>

        {/* Online Presence */}
        <div className={`rounded-3xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <Globe size={24} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Presença Online</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Links sociais e website</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Website
              </label>
              <div className="relative">
                <Globe size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  value={form.companyWebsite}
                  onChange={e => setForm({ ...form, companyWebsite: e.target.value })}
                  placeholder="seusite.com"
                  className={`w-full pl-10 p-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${isDark
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Instagram
              </label>
              <div className="relative">
                <Share2 size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  value={form.instagram}
                  onChange={e => setForm({ ...form, instagram: e.target.value })}
                  placeholder="@seuinstagram"
                  className={`w-full pl-10 p-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${isDark
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Google Reviews
              </label>
              <input
                value={form.google}
                onChange={e => setForm({ ...form, google: e.target.value })}
                placeholder="Link do Google Meu Negócio"
                className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${isDark
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
              />
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex items-center justify-end gap-4 sticky bottom-6 bg-transparent pointer-events-none">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`pointer-events-auto flex items-center gap-2 px-8 py-4 rounded-2xl shadow-xl font-bold text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:scale-100 ${success ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-indigo-600'
              }`}
          >
            {success ? (
              <>
                <CheckCircle2 size={20} />
                Salvo!
              </>
            ) : (
              <>
                <Save size={20} />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Empresa;
