import { useState } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, ChevronRight, Sparkles } from 'lucide-react'

const GRADES = [
    { id: 'junior', label: 'Junior', desc: 'Новичок' },
    { id: 'middle', label: 'Middle', desc: 'Опытный' },
    { id: 'senior', label: 'Senior', desc: 'Эксперт' },
    { id: 'lead', label: 'Lead', desc: 'Лидер' },
]

export default function Onboarding({ onComplete }) {
    const [role, setRole] = useState('')
    const [grade, setGrade] = useState('middle')

    const handleSubmit = () => {
        if (role.trim()) onComplete({ role: role.trim(), grade })
    }

    return (
        <div className="fixed inset-0 bg-zinc-950 z-[100] overflow-y-auto flex flex-col">
            {/* Background Glow Orbs */}
            <div className="glow-orb w-[400px] h-[400px] bg-indigo-600 -top-32 -left-32" />
            <div className="glow-orb w-[300px] h-[300px] bg-purple-600 bottom-0 right-0" />

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-10"
                >
                    {/* Header */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                            <Sparkles size={16} />
                            <span>Персональный путь обучения</span>
                        </div>
                        <h1 className="text-4xl font-bold leading-tight">
                            Вставь свою<br />
                            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Кассету знаний</span>
                        </h1>
                        <p className="text-zinc-400 text-base">
                            Укажи должность и уровень — AI построит бесконечный путь обучения
                        </p>
                    </div>

                    {/* Form */}
                    <div className="space-y-6">
                        {/* Role Input */}
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
                            <input
                                type="text"
                                placeholder="Frontend Developer, Повар, Менеджер..."
                                className="input-field"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            />
                        </div>

                        {/* Grade Selection */}
                        <div className="space-y-3">
                            <label className="text-sm text-zinc-500 font-medium">Выбери уровень</label>
                            <div className="grid grid-cols-2 gap-3">
                                {GRADES.map((g) => (
                                    <motion.button
                                        key={g.id}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setGrade(g.id)}
                                        className={`p-4 rounded-2xl border text-left transition-all duration-200 ${grade === g.id
                                            ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                    >
                                        <div className={`text-base font-semibold ${grade === g.id ? 'text-white' : 'text-zinc-400'}`}>
                                            {g.label}
                                        </div>
                                        <div className="text-xs text-zinc-500">{g.desc}</div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={!role.trim()}
                        className="btn-primary w-full flex items-center justify-center gap-3"
                    >
                        <span>Запустить обучение</span>
                        <ChevronRight size={20} />
                    </motion.button>
                </motion.div>
            </div>

            {/* AI Disclaimer Footer */}
            <footer className="relative z-10 pb-6 text-center">
                <p className="text-[10px] text-zinc-600 font-medium">
                    Gemini может ошибаться, поэтому проверяйте его ответы.
                </p>
            </footer>
        </div>
    )
}
