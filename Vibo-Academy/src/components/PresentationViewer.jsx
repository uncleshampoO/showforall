import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Layout } from 'lucide-react'

export default function PresentationViewer({ data, onClose }) {
    const [index, setIndex] = useState(0)
    const slides = data?.slides || []

    const next = () => setIndex(prev => Math.min(prev + 1, slides.length - 1))
    const prev = () => setIndex(prev => Math.max(prev - 1, 0))

    if (!slides.length) return null

    return (
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-2xl z-[60] flex flex-col">
            <header className="p-4 flex items-center justify-between border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center">
                        <Layout size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold">Презентация курса</h2>
                        <p className="text-[10px] text-zinc-500">Слайд {index + 1} из {slides.length}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <X size={20} className="text-zinc-400" />
                </button>
            </header>

            <main className="flex-1 flex flex-col items-center justify-between p-4 md:p-8 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.02, y: -10 }}
                        className="w-full max-w-5xl min-h-[350px] md:h-[60vh] max-h-[65vh] md:max-h-[75vh] bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-[32px] p-6 md:p-12 flex flex-col relative group overflow-hidden"
                    >
                        {/* Slide Number Background - Smaller on mobile */}
                        <div className="absolute top-4 right-6 text-zinc-800 font-display font-black text-6xl md:text-9xl opacity-5 select-none transition-opacity">
                            {index + 1}
                        </div>

                        <div className="relative z-10 flex flex-col h-full">
                            <motion.h3
                                layoutId={`title-${index}`}
                                className="text-base md:text-2xl font-display font-bold mb-4 md:mb-6 text-white tracking-tight leading-tight shrink-0 border-b border-zinc-800/20 pb-4 pr-12"
                            >
                                {slides[index]?.title}
                            </motion.h3>

                            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                                <ul className="space-y-4 md:space-y-4 pb-12">
                                    {slides[index]?.content?.map((point, i) => (
                                        <motion.li
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * i + 0.2 }}
                                            className="flex items-start gap-3 md:gap-4 text-zinc-400 group/item"
                                        >
                                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 mt-2 md:mt-2.5 shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.5)] group-hover/item:scale-125 transition-transform" />
                                            <span className="text-sm md:text-xl leading-relaxed font-medium text-zinc-300 group-hover/item:text-white transition-colors">
                                                {point}
                                            </span>
                                        </motion.li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Progress & Controls */}
                <div className="shrink-0 flex flex-col items-center gap-6 md:gap-8 pb-10 md:pb-0">
                    <div className="flex gap-1.5 md:gap-2.5">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIndex(i)}
                                className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-8 md:w-10 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]' : 'w-1.5 md:w-2.5 bg-zinc-800 hover:bg-zinc-700'}`}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={prev}
                            disabled={index === 0}
                            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center transition-all ${index === 0 ? 'opacity-10 cursor-not-allowed' : 'hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 text-zinc-400 hover:text-white shadow-xl'}`}
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <button
                            onClick={next}
                            disabled={index === slides.length - 1}
                            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center transition-all ${index === slides.length - 1 ? 'opacity-10 cursor-not-allowed' : 'hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 text-zinc-400 hover:text-white shadow-xl'}`}
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>

                {/* AI Disclaimer Footer */}
                <footer className="shrink-0 pb-4 pt-2 text-center">
                    <p className="text-[9px] text-zinc-700 font-medium">
                        Gemini может ошибаться, поэтому проверяйте его ответы.
                    </p>
                </footer>
            </main>
        </div>
    )
}
