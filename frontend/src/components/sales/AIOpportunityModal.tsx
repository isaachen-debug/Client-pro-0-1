import React, { useState, useEffect } from 'react';
import { Sparkles, X, Camera, Image as ImageIcon, Send, Rocket, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeOpportunity } from '../../services/growth';

type AIOpportunityModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export const AIOpportunityModal = ({ isOpen, onClose }: AIOpportunityModalProps) => {
    const [step, setStep] = useState<'upload' | 'analyzing' | 'result'>('upload');
    const [image, setImage] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            setStep('upload');
            setImage(null);
            setResult(null);
        }
    }, [isOpen]);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setImage(url);
            setStep('analyzing');

            try {
                // Convert to Base64
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async () => {
                    const base64Image = reader.result as string;
                    try {
                        // Use Centralized Service
                        const analysis = await analyzeOpportunity(base64Image);
                        setResult(analysis);
                    } catch (err) {
                        console.error(err);
                        // Fallback purely for safety if service fails completely
                        setResult({
                            serviceName: "Erro na Análise",
                            price: 0,
                            message: "Não consegui analisar a imagem. Tente novamente.",
                            confidence: 0
                        });
                    }
                };
            } catch (e) {
                console.error(e);
            }
        }
    };

    useEffect(() => {
        if (result && step === 'analyzing') {
            // Only move to result when we have data
            setStep('result');
        }
    }, [result, step]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative w-full max-w-md overflow-hidden transition-all duration-500 ${step === 'analyzing' ? 'bg-[#0f172a] rounded-[40px] h-[500px]' : 'bg-white dark:bg-slate-900 rounded-3xl'}`}>

                {/* CLOSE BUTTON */}
                {step !== 'analyzing' && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 z-10"
                    >
                        <X size={20} />
                    </button>
                )}

                {/* STEP 1: UPLOAD */}
                {step === 'upload' && (
                    <div className="p-8 flex flex-col items-center text-center space-y-8 animate-fadeIn">
                        <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                            <Camera size={40} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Vendedor Silencioso</h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                Tire uma foto do ambiente e deixe a IA encontrar oportunidades de venda.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 w-full gap-4">
                            <label className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                <Camera className="text-indigo-600 dark:text-indigo-400" />
                                <span className="font-semibold text-indigo-900 dark:text-indigo-200">Tirar Foto</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
                            </label>

                            <label className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                <ImageIcon className="text-slate-500" />
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Galeria</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                            </label>
                        </div>
                    </div>
                )}

                {/* STEP 2: ANALYZING */}
                {step === 'analyzing' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-8 animate-fadeIn">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                            <Sparkles size={64} className="text-emerald-400 relative z-10 animate-bounce" />
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Gemini Analisando...</h3>
                            <p className="text-slate-400 animate-pulse">
                                Identificando sujeira e calculando preço
                            </p>
                        </div>

                        {image && (
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-emerald-500/30 opacity-50 relative">
                                <img src={image} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-emerald-500/10 animate-scan" />
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: RESULT */}
                {step === 'result' && (
                    <div className="flex flex-col h-full max-h-[90vh] animate-slideUp">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Proposta Gerada</h3>
                                <button onClick={() => setStep('upload')} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
                                    <Rocket size={12} /> Nova Análise
                                </button>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400">
                                        <Sparkles size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">Potencial de Ganho</span>
                                </div>
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                    + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result?.price || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">PREVIEW DO CARD</p>
                                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-xl">
                                    {/* Card Image Header */}
                                    <div className="h-40 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                                        {image ? (
                                            <div className="w-full h-full relative">
                                                <img src={image} className="w-full h-full object-cover opacity-80" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                                            </div>
                                        ) : (
                                            <ImageIcon size={48} className="text-slate-700" />
                                        )}
                                        <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider flex items-center gap-1">
                                            <Sparkles size={10} /> Gemini AI Vision
                                        </div>
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <h4 className="text-white font-bold text-lg">{result?.serviceName || 'Oportunidade Detectada'}</h4>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-5 space-y-4">
                                        <div className="flex gap-3">
                                            <div className="shrink-0 mt-1">
                                                <Sparkles size={18} className="text-emerald-500" />
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                                                "{result?.message}"
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                                            <div>
                                                <span className="text-xs text-slate-500 block">Preço Sugerido</span>
                                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result?.price || 0)}
                                                </span>
                                            </div>
                                            <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:scale-105 transition-transform">
                                                Adicionar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 pt-2">
                            {result?.isError || result?.confidence === 0 ? (
                                <button
                                    className="w-full py-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-lg shadow-sm border border-red-100 dark:border-red-800 flex items-center justify-center gap-2 mb-2"
                                    onClick={() => setStep('upload')}
                                >
                                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                                        <Camera size={14} className="ml-0.5 text-red-600" />
                                    </div>
                                    Tentar Novamente
                                </button>
                            ) : (
                                <button
                                    className="w-full py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                                    onClick={() => {
                                        const text = `Olá! ${result?.message} Apenas ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result?.price || 0)}.`;
                                        window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
                                    }}
                                >
                                    <div className="w-6 h-6 rounded-full bg-white/20 dark:bg-slate-900/10 flex items-center justify-center">
                                        <MessageSquare size={14} className="ml-0.5" />
                                    </div>
                                    Enviar via SMS
                                </button>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};
