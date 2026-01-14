import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Sparkles, Zap, Camera, Layout, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { AIOpportunityModal } from '../components/sales/AIOpportunityModal';
import { CleaningTrackerModal } from '../components/sales/CleaningTrackerModal';
import { SocialMediaModal } from '../components/sales/SocialMediaModal';
import { FlashOfferModal } from '../components/sales/FlashOfferModal';

const Vendas = () => {
    const { isTrackerActive, setIsTrackerActive } = useOutletContext<any>();
    const [showAIModal, setShowAIModal] = useState(false);
    const [showTrackerPreview, setShowTrackerPreview] = useState(false);
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [showFlashModal, setShowFlashModal] = useState(false);

    const handleCardClick = (type: string) => {
        if (type === 'ai') {
            setShowAIModal(true);
        } else if (type === 'social') {
            setShowSocialModal(true);
        } else if (type === 'flash') {
            setShowFlashModal(true);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <AIOpportunityModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} />
            <CleaningTrackerModal isOpen={showTrackerPreview} onClose={() => setShowTrackerPreview(false)} />
            <SocialMediaModal isOpen={showSocialModal} onClose={() => setShowSocialModal(false)} />
            <FlashOfferModal isOpen={showFlashModal} onClose={() => setShowFlashModal(false)} />

            <div className="p-6 pb-24 space-y-6 animate-fade-in font-sans">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ferramentas de Venda</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Transforme serviços em experiências e lucre mais.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Flash Offer Card - Featured */}
                    <div className="relative overflow-hidden rounded-[32px] bg-slate-900 dark:bg-slate-800 p-6 text-white shadow-xl shadow-slate-900/10">
                        <div className="absolute top-0 right-0 p-4">
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Novo</span>
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="w-12 h-12 bg-yellow-400/20 rounded-2xl flex items-center justify-center text-yellow-400 mb-2">
                                <Zap size={24} fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Oferta Relâmpago</h3>
                                <p className="text-sm text-slate-300 leading-relaxed max-w-[85%]">
                                    Preencha horários vagos enviando ofertas automáticas para vizinhos próximos.
                                </p>
                            </div>
                            <button
                                onClick={() => handleCardClick('flash')}
                                className="flex items-center gap-2 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors uppercase tracking-wider mt-2 group"
                            >
                                Encher agenda
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                        {/* Abstract Background Decoration */}
                        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
                        <div className="absolute top-1/2 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-xl"></div>
                    </div>

                    {/* Silent Seller Card */}
                    <button
                        onClick={() => handleCardClick('ai')}
                        className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all text-left w-full"
                    >
                        <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-6xl font-serif italic text-emerald-500">$</span>
                        </div>
                        <div className="space-y-4 relative z-10">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                                <Camera size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Vendedor Silencioso</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Tire foto de uma área suja e gere uma proposta irresistível em segundos.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors uppercase tracking-wider group-hover:gap-3">
                                Testar agora
                                <ArrowRight size={14} />
                            </div>
                        </div>
                    </button>

                    {/* Cleaner Tracker Card */}
                    <div
                        onClick={() => setShowTrackerPreview(true)}
                        className="cursor-pointer bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all"
                    >
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-50 dark:bg-blue-900/10 rounded-full group-hover:scale-110 transition-transform"></div>
                        <div className="space-y-4 relative z-10">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                                <Layout size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Rastreador de Limpeza</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Envie um link ao vivo para o cliente acompanhar o progresso. Elimine a ansiedade.
                                </p>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <button className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors uppercase tracking-wider group-hover:gap-3">
                                    Ver exemplo
                                    <ArrowRight size={14} />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsTrackerActive(!isTrackerActive);
                                    }}
                                    className={`
                                        px-4 py-2 rounded-full text-xs font-bold transition-all transform active:scale-95
                                        ${isTrackerActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }
                                    `}
                                >
                                    {isTrackerActive ? 'Ativado' : 'Ativar'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Before & After Studio - Active */}
                    <button
                        onClick={() => handleCardClick('social')}
                        className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all text-left w-full"
                    >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
                                <Sparkles size={10} /> IA
                            </span>
                        </div>
                        <div className="space-y-4 relative z-10">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                                <ImageIcon size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Estúdio Antes & Depois</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Crie Reels automáticos com transições perfeitas para o Instagram.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors uppercase tracking-wider group-hover:gap-3">
                                Criar Post
                                <ArrowRight size={14} />
                            </div>
                        </div>
                    </button>

                </div>
            </div>
        </div>
    );
};

export default Vendas;
