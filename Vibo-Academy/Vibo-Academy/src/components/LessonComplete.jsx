import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Zap, ChevronRight, Star, PartyPopper, Layout, FileText, Loader2, X } from 'lucide-react'

export default function LessonComplete({ result, module, onClose }) {
    const isPerfect = result.correct === result.total
    const percentage = Math.round((result.correct / result.total) * 100)

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-start md:justify-center p-6 overflow-y-auto scrollbar-none"
        >
            {/* Background Glow */}
            <div className="glow-orb w-[400px] h-[400px] bg-indigo-600 top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="relative z-10 text-center space-y-6 md:space-y-8 max-w-sm w-full py-10 md:py-0"
            >
                {/* Icon */}
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                        className={`w-20 h-20 md:w-24 md:h-24 mx-auto rounded-3xl flex items-center justify-center shadow-2xl ${isPerfect
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30'
                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30'
                            }`}
                    >
                        {isPerfect ? <PartyPopper size={36} className="text-white" /> : <Trophy size={36} className="text-white" />}
                    </motion.div>

                    {/* Stars for perfect score */}
                    {isPerfect && (
                        <>
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                className="absolute -top-2 -right-2"
                            >
                                <Star size={20} className="text-amber-400" fill="currentColor" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6 }}
                                className="absolute -bottom-1 -left-3"
                            >
                                <Star size={16} className="text-amber-400" fill="currentColor" />
                            </motion.div>
                        </>
                    )}
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold">
                        {isPerfect ? 'Идеально!' : percentage >= 60 ? 'Отлично!' : 'Хорошая попытка!'}
                    </h1>
                    <p className="text-zinc-400 text-sm md:text-base">
                        {module.title} — урок завершён
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-3 md:p-4 text-center">
                        <div className="text-2xl md:text-3xl font-bold text-emerald-400">{result.correct}/{result.total}</div>
                        <div className="text-[10px] md:text-xs text-zinc-500 mt-1">Правильных</div>
                    </div>
                    <div className="glass-card p-3 md:p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-2xl md:text-3xl font-bold text-amber-400">
                            <Zap size={20} fill="currentColor" />
                            <span>+{result.xp}</span>
                        </div>
                        <div className="text-[10px] md:text-xs text-zinc-500 mt-1">XP получено</div>
                    </div>
                </div>

                {/* Progress Ring */}
                <div className="flex justify-center">
                    <div className="relative w-28 h-28 md:w-32 md:h-32">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-zinc-800"
                            />
                            <motion.circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="url(#gradient)"
                                strokeWidth="8"
                                fill="none"
                                strokeLinecap="round"
                                initial={{ strokeDasharray: '0 352' }}
                                animate={{ strokeDasharray: `${(percentage / 100) * 352} 352` }}
                                transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl md:text-2xl font-bold">{percentage}%</span>
                        </div>
                    </div>
                </div>

                {/* Continue Button Area */}
                <div className="space-y-3 w-full">
                    {module.isChallenge && !isPerfect && (
                        <p className="text-xs text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                            ⚠️ Очки не начислены, так как были ошибки. Вызов требует идеального прохождения!
                        </p>
                    )}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        onClick={onClose}
                        className="btn-primary w-full flex items-center justify-center gap-3"
                    >
                        <span>Завершить урок</span>
                        <ChevronRight size={20} />
                    </motion.button>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <button
                                    onClick={() => result.materials?.presentation && result.onViewPresentation?.(result.materials.presentation)}
                                    disabled={!result.materials?.presentation}
                                    className={`w-full flex flex-col items-center justify-center gap-1 p-3 border rounded-xl transition-all ${result.materials?.presentation
                                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 shadow-lg shadow-indigo-500/10'
                                        : (result.materials ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400 font-bold animate-pulse')
                                        }`}
                                >
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                        {result.materials?.presentation ? <Layout size={14} /> : (result.materials ? <X size={14} /> : <Loader2 size={14} className="animate-spin" />)}
                                        {result.materials?.presentation ? 'Презентация' : (result.materials ? 'Прочерк' : 'Готовим...')}
                                    </div>
                                </button>
                                <p className="text-[9px] text-zinc-500 leading-tight px-1">
                                    <span className="text-zinc-300 font-bold uppercase block mb-0.5">Тезисно</span>
                                    Обзор ключевых компетенций для твоей должности и грейда.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={() => result.materials?.article && result.onViewArticle?.(result.materials.article)}
                                    disabled={!result.materials?.article}
                                    className={`w-full flex flex-col items-center justify-center gap-1 p-3 border rounded-xl transition-all ${result.materials?.article
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 shadow-lg shadow-emerald-500/10'
                                        : (result.materials ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400 font-bold animate-pulse')
                                        }`}
                                >
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                        {result.materials?.article ? <FileText size={14} /> : (result.materials ? <X size={14} /> : <Loader2 size={14} className="animate-spin" />)}
                                        {result.materials?.article ? 'Статья' : (result.materials ? 'Прочерк' : 'Пишем...')}
                                    </div>
                                </button>
                                <p className="text-[9px] text-zinc-500 leading-tight px-1">
                                    <span className="text-zinc-300 font-bold uppercase block mb-0.5">Разбор</span>
                                    Глубокое погружение: детальный отчет по концепциям блока.
                                </p>
                            </div>
                        </div>

                        {/* Direct Download Button */}
                        {(result.materials?.article || result.materials?.presentation) && (
                            <button
                                onClick={() => {
                                    const content = result.materials.article || result.materials.presentation;
                                    const blob = new Blob([content], { type: 'text/markdown' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Vibo-Academy-${module.title.replace(/\s+/g, '-')}.md`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                    if (typeof window?.addToast === 'function') {
                                        window.addToast('Файл сохранен! 📥', 'success');
                                    }
                                }}
                                className="w-full py-2 border border-zinc-800 rounded-xl text-[10px] text-zinc-500 hover:text-white transition-colors uppercase tracking-widest font-bold"
                            >
                                Скачать материалы (.md)
                            </button>
                        )}
                    </motion.div>
                </div>

                {/* AI Disclaimer Footer */}
                <footer className="relative z-10 pb-8 pt-4 text-center">
                    <p className="text-[10px] text-zinc-600 font-medium">
                        Gemini может ошибаться, поэтому проверяйте его ответы.
                    </p>
                </footer>
            </motion.div>
        </motion.div>
    )
}
