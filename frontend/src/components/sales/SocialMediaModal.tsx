import { useState } from 'react';
import { X, Upload, Sparkles, Copy, Check, Instagram, Image as ImageIcon, Layout, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSocialPost } from '../../services/growth';

type SocialMediaModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

type PostFormat = 'before-after' | 'single' | 'gallery' | null;

export const SocialMediaModal = ({ isOpen, onClose }: SocialMediaModalProps) => {
    const [step, setStep] = useState<'format' | 'upload' | 'generating' | 'result'>('format');
    const [format, setFormat] = useState<PostFormat>(null);
    const [images, setImages] = useState<string[]>([]);
    const [generatedCaption, setGeneratedCaption] = useState('');
    const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
    const [isCopied, setIsCopied] = useState(false);

    const handleFormatSelect = (selectedFormat: PostFormat) => {
        setFormat(selectedFormat);
        setStep('upload');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImages(prev => [...prev, event.target?.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleGenerate = async () => {
        if (images.length === 0) return;

        setStep('generating');

        try {
            let result;

            if (format === 'before-after' && images.length >= 2) {
                // Use real Gemini API for before/after
                result = await generateSocialPost(images[0], images[1]);
                const typedResult = result as { caption: string; hashtags: string[] };
                setGeneratedCaption(typedResult.caption);
                setGeneratedHashtags(typedResult.hashtags);
            } else {
                // Fallback for single/gallery (could enhance later)
                await new Promise(resolve => setTimeout(resolve, 2500));

                if (format === 'single') {
                    setGeneratedCaption("✨ Detalhe que faz a diferença! Cada canto merece atenção e dedicação. Confira o resultado e me conta: está aprovado? 🧼💙");
                    setGeneratedHashtags(['#limpezaprofissional', '#detalhe', '#qualidade', '#cleanhome']);
                } else {
                    setGeneratedCaption("📸 Galeria de transformações! Deslize para ver todos os detalhes que fazem seu espaço brilhar. Qual é o seu favorito?");
                    setGeneratedHashtags(['#antesedepois', '#portfolio', '#limpeza', '#transformacao']);
                }
            }

            setStep('result');
        } catch (error) {
            console.error('Erro ao gerar post:', error);
            setStep('upload');
        }
    };

    const handleCopy = () => {
        const fullText = `${generatedCaption}\n\n${generatedHashtags.join(' ')}`;
        navigator.clipboard.writeText(fullText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleReset = () => {
        setStep('format');
        setFormat(null);
        setImages([]);
        setGeneratedCaption('');
        setGeneratedHashtags([]);
        setIsCopied(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Gerador de Posts IA
                            </h2>
                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-0.5">
                                {step === 'format' && 'Escolha o formato'}
                                {step === 'upload' && 'Carregue suas imagens'}
                                {step === 'generating' && 'Gerando mágica...'}
                                {step === 'result' && 'Post Pronto!'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Format Selection */}
                        {step === 'format' && (
                            <motion.div
                                key="format"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-3"
                            >
                                <button
                                    onClick={() => handleFormatSelect('before-after')}
                                    className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all text-left group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-500 transition-colors">
                                            <Layout size={20} className="text-purple-600 dark:text-purple-400 group-hover:text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white">Antes & Depois</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Destaque comparativo para mostrar resultados
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleFormatSelect('single')}
                                    className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-500 transition-colors">
                                            <ImageIcon size={20} className="text-blue-600 dark:text-blue-400 group-hover:text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white">Destaque Único</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Uma foto impactante no destaque principal
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleFormatSelect('gallery')}
                                    className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-pink-500 dark:hover:border-pink-500 transition-all text-left group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-900/30 group-hover:bg-pink-500 transition-colors">
                                            <Grid size={20} className="text-pink-600 dark:text-pink-400 group-hover:text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white">Galeria de Detalhes</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Carrossel mostrando múltiplos ângulos
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </motion.div>
                        )}

                        {/* Step 2: Upload */}
                        {step === 'upload' && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="space-y-4">
                                    {/* Image Pills */}
                                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <div className="flex items-center gap-1.5">
                                            <button className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white">
                                                Postar
                                            </button>
                                            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                Agendar
                                            </button>
                                            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                Lixo
                                            </button>
                                        </div>
                                    </div>

                                    {/* Gallery Grid Layout */}
                                    {format === 'gallery' ? (
                                        <div className="space-y-3">
                                            {/* Top row: 2 images */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {[0, 1].map(idx => (
                                                    <label key={idx} className="block cursor-pointer">
                                                        <div className={`aspect-square rounded-2xl overflow-hidden ${images[idx] ? 'border-2 border-slate-200 dark:border-slate-700' : 'border-2 border-dashed border-slate-300 dark:border-slate-600'}`}>
                                                            {images[idx] ? (
                                                                <img src={images[idx]} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                                    <Upload size={24} className="text-slate-400 mb-2" />
                                                                    <span className="text-xs font-semibold text-slate-500">Foto {idx + 1}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = (event) => {
                                                                        setImages(prev => {
                                                                            const newImages = [...prev];
                                                                            newImages[idx] = event.target?.result as string;
                                                                            return newImages;
                                                                        });
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                ))}
                                            </div>

                                            {/* Bottom row: 1 large image */}
                                            <label className="block cursor-pointer">
                                                <div className={`aspect-[16/10] rounded-2xl overflow-hidden ${images[2] ? 'border-2 border-slate-200 dark:border-slate-700' : 'border-2 border-dashed border-slate-300 dark:border-slate-600'}`}>
                                                    {images[2] ? (
                                                        <img src={images[2]} alt="Foto 3" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                            <Upload size={32} className="text-slate-400 mb-2" />
                                                            <span className="text-sm font-semibold text-slate-500">Foto 3</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (event) => {
                                                                setImages(prev => {
                                                                    const newImages = [...prev];
                                                                    newImages[2] = event.target?.result as string;
                                                                    return newImages;
                                                                });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        /* Before/After or Single layout */
                                        images.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                {images.map((img, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700"
                                                    >
                                                        <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                                                        {idx === 0 && format === 'before-after' && (
                                                            <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900/80 rounded-lg text-xs font-bold text-white">
                                                                ANTES
                                                            </div>
                                                        )}
                                                        {idx === 1 && format === 'before-after' && (
                                                            <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500 rounded-lg text-xs font-bold text-white">
                                                                DEPOIS
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <label className="block cursor-pointer">
                                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center hover:border-purple-500 transition-colors">
                                                    <Upload size={40} className="mx-auto text-slate-400 mb-3" />
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                                                        {format === 'before-after' && 'Carregue 2 imagens'}
                                                        {format === 'single' && 'Carregue 1 imagem'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">Arraste ou clique para selecionar</p>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple={format === 'before-after'}
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                />
                                            </label>
                                        )
                                    )}

                                    {images.length > 0 && (
                                        <button
                                            onClick={handleGenerate}
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Sparkles size={20} />
                                            Criando Mágica...
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Generating */}
                        {step === 'generating' && (
                            <motion.div
                                key="generating"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-12 text-center"
                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    className="inline-block mb-4"
                                >
                                    <Sparkles size={48} className="text-purple-600" />
                                </motion.div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">Gerando sua legenda...</p>
                                <p className="text-sm text-slate-500 mt-2">A IA está criando o post perfeito</p>
                            </motion.div>
                        )}

                        {/* Step 4: Result */}
                        {step === 'result' && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                {/* Instagram Preview */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
                                    {/* Header */}
                                    <div className="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-700">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">cleanpro_servicos</span>
                                    </div>

                                    {/* Image */}
                                    <div className="aspect-square bg-slate-100 dark:bg-slate-900">
                                        <img src={images[images.length - 1]} alt="Post" className="w-full h-full object-cover" />
                                    </div>

                                    {/* Actions */}
                                    <div className="p-3 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <button className="hover:opacity-70">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            </button>
                                            <button className="hover:opacity-70">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                            </button>
                                            <button className="hover:opacity-70 ml-auto">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Caption */}
                                        <div className="text-sm">
                                            <span className="font-semibold text-slate-900 dark:text-white">cleanpro_servicos</span>
                                            <span className="text-slate-700 dark:text-slate-300 ml-1">{generatedCaption}</span>
                                            <div className="mt-1 text-blue-600 dark:text-blue-400">
                                                {generatedHashtags.join(' ')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleCopy}
                                        className="py-3 px-4 rounded-xl border-2 border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isCopied ? <Check size={20} /> : <Copy size={20} />}
                                        {isCopied ? 'Copiado!' : 'Copiar'}
                                    </button>
                                    <button
                                        onClick={() => window.open('https://instagram.com', '_blank')}
                                        className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Instagram size={20} />
                                        Postar
                                    </button>
                                </div>

                                <button
                                    onClick={handleReset}
                                    className="w- full mt-3 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                                >
                                    ← Criar outro post
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
