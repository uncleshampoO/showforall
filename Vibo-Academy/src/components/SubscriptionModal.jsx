import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, Star, ChevronRight, X, Layout, BookOpen, GraduationCap, Ticket, Loader2 } from 'lucide-react';

export default function SubscriptionModal({ isOpen, onClose, onSubscribe, onActivatePromo }) {
    const [promo, setPromo] = React.useState('');
    const [isActivating, setIsActivating] = React.useState(false);

    if (!isOpen) return null;

    const benefits = [
        { icon: Layout, title: "Безлимит профессий", desc: "Создавай сколько угодно путей обучения" },
        { icon: BookOpen, title: "Полные курсы", desc: "Доступ ко всем модулям и практикам" },
        { icon: Sparkles, title: "Развитие платформы", desc: "Твой вклад в создание новых умных тренажеров" },
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.95 }}
                    className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden"
                >
                    {/* Header with Glow */}
                    <div className="p-8 pb-4 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="absolute inset-0 blur-2xl bg-indigo-500/50 animate-pulse" />
                                <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                                    <Star className="text-white w-10 h-10" fill="white" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold text-white tracking-tight">Vibo Plus</h2>
                            <p className="text-indigo-400 font-semibold uppercase tracking-widest text-[10px]">Твой безлимитный доступ</p>
                        </div>
                    </div>

                    {/* Benefits List */}
                    <div className="px-8 py-4 space-y-4">
                        {benefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-indigo-500/50 transition-colors">
                                    <b.icon className="text-indigo-400" size={18} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-white leading-none mb-1">{b.title}</h3>
                                    <p className="text-xs text-zinc-500">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Promo Code Input */}
                    <div className="px-8 py-2">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-1 flex gap-2">
                            <input
                                type="text"
                                value={promo}
                                onChange={(e) => setPromo(e.target.value.toUpperCase())}
                                placeholder="Есть промокод?"
                                className="bg-transparent flex-1 px-4 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                            />
                            <button
                                onClick={async () => {
                                    if (!promo) return;
                                    setIsActivating(true);
                                    const success = await onActivatePromo(promo);
                                    setIsActivating(false);
                                    if (success) onClose();
                                }}
                                disabled={isActivating || !promo}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                            >
                                {isActivating ? <Loader2 size={16} className="animate-spin" /> : 'Ввод'}
                            </button>
                        </div>
                    </div>

                    {/* Footer / Action */}
                    <div className="p-8 pt-4 space-y-4">
                        <button
                            onClick={onSubscribe}
                            className="w-full py-5 bg-white text-black rounded-2xl font-bold text-base tracking-tight hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-white/5"
                        >
                            <span>Подключить за 149</span>
                            <Star size={18} fill="currentColor" />
                            <ChevronRight size={18} />
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-2 text-zinc-600 text-[11px] font-medium hover:text-zinc-400 transition-colors"
                        >
                            Оставить бесплатную версию
                        </button>
                    </div>

                    {/* Close Button Mobile */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
