import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Sparkles, Share2, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
    { id: '1', label: 'Chegada Confirmada', time: '09:00', tip: 'Dica: Cumprimente o cliente com um sorriso e confirme as prioridades do dia.' },
    { id: '2', label: 'Início: Cozinha', time: '09:15', tip: '💡 Dica da IA: Comece aplicando o produto no forno para agir enquanto você limpa as bancadas.' },
    { id: '3', label: 'Cozinha Finalizada', time: '10:30', tip: 'Verifique se não ficaram marcas de água na torneira. O brilho impressiona!' },
    { id: '4', label: 'Início: Banheiros', time: '10:45', tip: 'Deixe o desinfetante agindo no vaso sanitário por pelo menos 10 minutos.' },
    { id: '5', label: 'Sala de Estar', time: '--:--', tip: 'Aspire o sofá antes de limpar o chão para evitar poeira.' },
    { id: '6', label: 'Finalização', time: '--:--', tip: 'Pergunte ao cliente se ele gostaria de uma revisão final antes de você sair.' },
];

export const CleaningTracker = ({ appointmentId }: { appointmentId: string }) => {
    const [activeStep, setActiveStep] = useState(1);
    const [showTip, setShowTip] = useState(true);

    // Auto-advance simulation for demo
    const handleMarkDone = () => {
        if (activeStep < STEPS.length) {
            setActiveStep(prev => prev + 1);
            setShowTip(true);
        }
    };

    const currentStepData = STEPS[activeStep - 1];

    return (
        <div className="space-y-6 pt-2">
            {/* Live Link Header */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 flex items-center justify-between border border-emerald-100 dark:border-emerald-800/30">
                <div>
                    <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-1">LINK DO CLIENTE</p>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500 truncate max-w-[200px]">
                        cleanpro.app/track/{appointmentId.slice(0, 8)}...
                    </p>
                </div>
                <button
                    className="p-2 bg-white dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors shadow-sm"
                    onClick={() => {
                        const text = encodeURIComponent(`Acompanhe sua limpeza em tempo real: https://cleanpro.app/track/${appointmentId}`);
                        window.location.href = `https://wa.me/?text=${text}`;
                    }}
                >
                    <Share2 size={18} />
                </button>
            </div>

            {/* Timeline */}
            <div className="relative pl-4 space-y-8">
                {/* Vertical Line */}
                <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800" />

                {STEPS.map((step, index) => {
                    const isActive = index + 1 === activeStep;
                    const isDone = index + 1 < activeStep;
                    const isPending = index + 1 > activeStep;

                    return (
                        <div key={step.id} className="relative flex gap-4">
                            {/* Timeline Node */}
                            <div className={`
                          relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-500
                          ${isDone ? 'bg-emerald-500 border-emerald-500' : ''}
                          ${isActive ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-4 ring-emerald-500/20 animate-pulse' : ''}
                          ${isPending ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600' : ''}
                      `}>
                                {isDone && <CheckCircle2 size={12} className="text-white" />}
                                {isActive && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 -mt-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`text-sm font-bold transition-colors ${isActive || isDone ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'
                                        }`}>
                                        {step.label}
                                    </h4>
                                    <span className={`text-xs font-medium font-mono ${isActive || isDone ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-700'
                                        }`}>
                                        {isDone ? step.time : (isActive ? 'Agora' : '--:--')}
                                    </span>
                                </div>

                                {/* Active Step Actions */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-3 mt-3"
                                        >
                                            {/* Action Button */}
                                            <button
                                                onClick={handleMarkDone}
                                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                                            >
                                                Marcar como Feito
                                            </button>

                                            {/* AI Tip Card */}
                                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/30 flex gap-3">
                                                <div className="shrink-0 pt-0.5 text-indigo-500">
                                                    <Sparkles size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed font-medium">
                                                        {step.tip}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Completed Step Photo (Mock) */}
                                {isDone && index === 2 && (
                                    <div className="mt-2 w-24 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden relative group cursor-pointer">
                                        <img src="https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera size={16} className="text-white drop-shadow-md" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
