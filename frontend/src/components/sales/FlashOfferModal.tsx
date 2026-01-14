import React, { useState, useEffect } from 'react';
import { X, Zap, MapPin, Users, Send, Clock, Navigation, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { findNearbyOpportunities } from '../../services/growth';

type FlashOfferModalProps = {
    isOpen: boolean;
    onClose: () => void;
};



export const FlashOfferModal = ({ isOpen, onClose }: FlashOfferModalProps) => {
    const [step, setStep] = useState<'scanning' | 'results'>('scanning');
    const [neighbors, setNeighbors] = useState<any[]>([]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('scanning');
            // Use Centralized Service
            findNearbyOpportunities(-23.5505, -46.6333) // Mock coordinates for now
                .then((data: any) => {
                    setNeighbors(data);
                    setStep('results');
                })
                .catch(err => console.error(err));

            return () => { }; // Cleanup not strictly needed for this mock implementation
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const discountValue = 15;
    const sendOffer = (neighborName: string) => {
        const message = `Olá ${neighborName}! Estarei no seu bairro hoje à tarde e tive um cancelamento. Gostaria de aproveitar esse horário vago com ${discountValue}% de desconto?`;

        // Use 'sms:' protocol (Works on mobile to open default SMS app)
        // Note: On desktop this might do nothing or ask to open an app.
        window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-[32px] overflow-hidden shadow-2xl flex flex-col min-h-[500px]">

                {/* Header */}
                <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20">
                    <span className="bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border border-yellow-500/30">
                        Radar Ativo
                    </span>
                    <button onClick={onClose} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col relative">

                    {/* Background Map Effect */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950" />
                        {/* Grid lines simulating map */}
                        <div className="w-full h-full" style={{
                            backgroundImage: 'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }} />
                    </div>

                    {step === 'scanning' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">

                            {/* Radar Pulse Animation */}
                            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                                <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
                                <div className="absolute inset-8 bg-yellow-500/10 rounded-full animate-ping opacity-50" style={{ animationDuration: '2s' }} />
                                <div className="absolute inset-16 bg-yellow-500/30 rounded-full animate-pulse" />

                                <div className="absolute inset-0 border border-yellow-500/30 rounded-full" />
                                <div className="absolute inset-12 border border-yellow-500/20 rounded-full" />

                                <div className="relative z-10 bg-slate-800 p-4 rounded-full border border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                                    <Navigation size={32} className="text-yellow-400" />
                                </div>

                                {/* Rotating Scanner Line */}
                                <div className="absolute inset-0 rounded-full overflow-hidden">
                                    <div className="w-1/2 h-1/2 bg-gradient-to-tl from-yellow-500/40 to-transparent absolute top-0 right-0 origin-bottom-left animate-spin-slow" style={{ animationDuration: '4s' }} />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">Escaneando região...</h3>
                            <p className="text-slate-400 text-sm">
                                Buscando vizinhos e leads próximos a você.
                            </p>
                        </div>
                    )}

                    {step === 'results' && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-8 duration-700 bg-slate-900/50 backdrop-blur-sm pt-16 rounded-t-[32px]">

                            <div className="px-6 pb-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-green-400 text-xs font-bold uppercase tracking-wider">
                                        {neighbors.length} Oportunidades encontradas
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-white">Preencha sua agenda</h2>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-6">
                                {neighbors.map((neighbor) => (
                                    <div key={neighbor.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center justify-between group hover:border-yellow-500/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-semibold border border-slate-600">
                                                {neighbor.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{neighbor.name}</h4>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={10} /> {neighbor.distance}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10} /> {neighbor.time}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => sendOffer(neighbor.name)}
                                            className="w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-yellow-400/20"
                                        >
                                            <Send size={18} className="translate-x-0.5 translate-y-0.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-slate-800 border-t border-slate-700">
                                <button className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-colors">
                                    Expandir Raio de Busca (+2km)
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
