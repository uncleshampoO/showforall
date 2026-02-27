import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Layout, FileText, Download, X, CheckSquare, Trophy, Star, Navigation, User, ChevronRight, ChevronLeft, Zap } from 'lucide-react';

export default function NewsModal({ isOpen, onClose }) {
    const [page, setPage] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('vibo_news_hidden', 'true');
        }
        onClose();
    };

    const pages = [
        {
            title: "Vibo Academy v2.1: Прогресс",
            desc: "Мы добавили систему Plus-подписок, геймификацию и призы для лучших учеников!",
            features: [
                { icon: Star, text: "Vibo Plus: Поддержка Telegram Stars и активация через промокоды" },
                { icon: Zap, text: "Геймификация: Играй в Судоку, пока AI готовит план (рекорды в лидерах!)" },
                { icon: Trophy, text: "Лидеры Месяца: Топ-3 игрока получают месяц Vibo Plus БЕСПЛАТНО" },
                { icon: Layout, text: "Дизайн 2.0: Фиксированные меню и улучшенный UX для скорости работы" }
            ],
            tip: "Теперь на генерацию уходит всего ~30 секунд. Используй это время с пользой в Судоку!"
        },
        {
            title: "Vibo Academy: AI Обновление",
            desc: "Мы радикально улучшили алгоритм обучения. Погружение теперь глубже и профессиональнее.",
            features: [
                { icon: Sparkles, text: "Вопросы и роадмапы теперь на 100% точнее под ваш грейд и роль" },
                { icon: Layout, text: "Интерактивные презентации по итогам каждого урока" },
                { icon: FileText, text: "Детальные экспертные статьи для закрепления материала" },
                { icon: Download, text: "Профессиональный экспорт знаний в PDF (через печать)" }
            ],
            tip: "Чтобы новый AI работал на 100%, советуем пересоздать должность в профиле."
        }
    ];

    const current = pages[page];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header Image/Background */}
                    <div className="h-24 md:h-32 bg-gradient-to-br from-indigo-500 to-purple-600 relative shrink-0 overflow-hidden">
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white/20" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={page}
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                >
                                    {page === 0 ? <Zap className="text-white w-10 h-10 md:w-12 md:h-12" /> : <Sparkles className="text-white w-10 h-10 md:w-12 md:h-12" />}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors backdrop-blur-md z-10"
                        >
                            <X className="text-white" size={18} />
                        </button>

                        {/* Pagination Dots */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {pages.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${page === i ? 'bg-white w-4' : 'bg-white/30'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="p-6 md:p-8 space-y-6 overflow-y-auto scrollbar-hide">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={page}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2 text-center">
                                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{current.title}</h2>
                                    <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
                                        {current.desc}
                                    </p>
                                </div>

                                <div className="grid gap-3 md:gap-4">
                                    {current.features.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start gap-4 p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50"
                                        >
                                            <div className="mt-0.5 w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                                <item.icon className="text-indigo-400" size={16} />
                                            </div>
                                            <span className="text-zinc-300 text-[11px] md:text-xs font-medium leading-relaxed">{item.text}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-3 md:p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-center">
                                    <p className="text-[10px] md:text-[11px] text-amber-500/80 font-medium leading-relaxed">
                                        <span className="font-bold">💡 Рекомендация:</span> {current.tip}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="flex gap-3">
                            {page > 0 ? (
                                <button
                                    onClick={() => setPage(p => p - 1)}
                                    className="flex-1 py-3.5 bg-zinc-900 text-white rounded-2xl font-bold text-sm border border-zinc-800 flex items-center justify-center gap-2"
                                >
                                    <ChevronLeft size={18} /> Назад
                                </button>
                            ) : null}

                            {page < pages.length - 1 ? (
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                                >
                                    Далее <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3.5 bg-white text-black rounded-2xl font-bold text-sm tracking-wide hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5"
                                >
                                    Начать обучение
                                </button>
                            )}
                        </div>

                        {/* Don't show again checkbox */}
                        <div
                            className="flex items-center justify-center gap-2 cursor-pointer pb-2 group"
                            onClick={() => setDontShowAgain(!dontShowAgain)}
                        >
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-700 bg-zinc-900 group-hover:border-zinc-500'}`}>
                                {dontShowAgain && <CheckSquare className="text-white" size={12} />}
                            </div>
                            <span className="text-[11px] text-zinc-500 font-medium select-none">Больше не показывать</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
