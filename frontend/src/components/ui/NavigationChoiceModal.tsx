import { MapPin, Navigation, X } from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext';

type NavigationChoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  address: string | null;
};

export const NavigationChoiceModal = ({ isOpen, onClose, address }: NavigationChoiceModalProps) => {
  const { theme } = usePreferences();
  const isDark = theme === 'dark';

  if (!isOpen || !address) return null;

  const handleNavigate = (app: 'google' | 'waze' | 'apple') => {
    const query = encodeURIComponent(address);
    let url = '';
    switch (app) {
      case 'google':
        url = `https://www.google.com/maps/search/?api=1&query=${query}`;
        break;
      case 'waze':
        url = `https://waze.com/ul?q=${query}&navigate=yes`;
        break;
      case 'apple':
        url = `http://maps.apple.com/?q=${query}`;
        break;
    }
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className={`relative w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-sheet-up sm:animate-scale-in space-y-6 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Navegar com...</h3>
            <p className={`text-sm mt-1 line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{address}</p>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleNavigate('waze')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#33CCFF]/10 hover:bg-[#33CCFF]/20 border border-[#33CCFF]/20 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#33CCFF] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Navigation size={20} className="text-white fill-white" />
            </div>
            <div className="text-left">
              <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Waze</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Melhor para trânsito</p>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('google')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <MapPin size={20} className="text-white fill-white" />
            </div>
            <div className="text-left">
              <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Google Maps</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Padrão e confiável</p>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('apple')}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition group ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}>
              <MapPin size={20} />
            </div>
            <div className="text-left">
              <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Apple Maps</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Nativo do iOS</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
