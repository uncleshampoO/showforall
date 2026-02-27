import { motion } from 'framer-motion'
import { Zap, BookOpen, Infinity, ChevronRight } from 'lucide-react'

export default function WelcomeScreen({ onStart }) {
    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Background Glow */}
            <div className="glow-orb w-[400px] h-[400px] bg-indigo-600 top-1/4 left-1/2 -translate-x-1/2 opacity-30" />
            <div className="glow-orb w-[300px] h-[300px] bg-purple-600 bottom-20 -right-20 opacity-25" />

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-8"
                >
                    {/* Logo */}
                    <div className="flex justify-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30"
                        >
                            <Zap size={48} className="text-white" />
                        </motion.div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-3">
                        <h1 className="text-3xl font-bold">Vibo Academy</h1>
                        <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
                            Бесконечный источник знаний для твоей профессии
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-3 pt-4">
                        <Feature
                            icon={Infinity}
                            title="Бесконечное обучение"
                            desc="AI генерирует уникальный путь под тебя"
                        />
                        <Feature
                            icon={BookOpen}
                            title="Любая профессия"
                            desc="От разработчика до повара — учись чему угодно"
                        />
                        <Feature
                            icon={Zap}
                            title="XP и стрики"
                            desc="Геймификация для мотивации каждый день"
                        />
                    </div>

                    {/* Start Button */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onStart}
                        className="btn-primary w-full flex items-center justify-center gap-3 mt-8"
                    >
                        <span>Начать обучение</span>
                        <ChevronRight size={20} />
                    </motion.button>
                </motion.div>
            </div>

            {/* Footer */}
            <div className="relative z-10 text-center py-6">
                <p className="text-[10px] text-zinc-600 font-medium lowercase">
                    Gemini может ошибаться, поэтому проверяйте его ответы.
                </p>
            </div>
        </div>
    )
}

function Feature({ icon: Icon, title, desc }) {
    return (
        <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-xs text-zinc-500">{desc}</p>
            </div>
        </div>
    )
}
