import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, RotateCcw, Lightbulb } from 'lucide-react'

// =============================================
// PULSE TEST (Multiple Choice)
// =============================================
export function PulseTestTask({ task, onAnswer }) {
    const [selected, setSelected] = useState(null)
    const [answered, setAnswered] = useState(false)

    const handleSelect = (idx) => {
        if (answered) return
        setSelected(idx)
        setAnswered(true)
        onAnswer(idx === task.correct)
    }

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-medium leading-relaxed">{task.question}</h2>

            <div className="space-y-3">
                {task.options?.map((option, idx) => {
                    const isSelected = selected === idx
                    const isCorrect = task.correct === idx

                    let style = 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    if (answered) {
                        if (isCorrect) style = 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        else if (isSelected) style = 'bg-red-500/10 border-red-500 text-red-400'
                        else style = 'bg-zinc-900/50 border-zinc-800 opacity-50'
                    }

                    return (
                        <motion.button
                            key={idx}
                            whileTap={{ scale: answered ? 1 : 0.98 }}
                            onClick={() => handleSelect(idx)}
                            disabled={answered}
                            className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${style}`}
                        >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${answered && isCorrect ? 'bg-emerald-500 text-white' :
                                    answered && isSelected ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                {answered && isCorrect ? <Check size={14} /> : answered && isSelected ? <X size={14} /> : String.fromCharCode(65 + idx)}
                            </div>
                            <span className="flex-1 text-sm">{option}</span>
                        </motion.button>
                    )
                })}
            </div>

            {answered && <Explanation text={task.explanation} isCorrect={selected === task.correct} />}
        </div>
    )
}

// =============================================
// TRUE/FALSE
// =============================================
export function TrueFalseTask({ task, onAnswer }) {
    const [selected, setSelected] = useState(null)
    const [answered, setAnswered] = useState(false)

    const handleSelect = (value) => {
        if (answered) return
        setSelected(value)
        setAnswered(true)
        onAnswer(value === task.isTrue)
    }

    return (
        <div className="space-y-6">
            <div className="glass-card p-5">
                <p className="text-lg font-medium leading-relaxed">{task.statement}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {[true, false].map((value) => {
                    const isSelected = selected === value
                    const isCorrect = task.isTrue === value

                    let style = 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    if (answered) {
                        if (isCorrect) style = 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        else if (isSelected) style = 'bg-red-500/10 border-red-500 text-red-400'
                        else style = 'bg-zinc-900/50 border-zinc-800 opacity-50'
                    }

                    return (
                        <motion.button
                            key={value.toString()}
                            whileTap={{ scale: answered ? 1 : 0.98 }}
                            onClick={() => handleSelect(value)}
                            disabled={answered}
                            className={`p-5 rounded-xl border text-center font-semibold transition-all ${style}`}
                        >
                            {value ? '✓ Правда' : '✗ Ложь'}
                        </motion.button>
                    )
                })}
            </div>

            {answered && <Explanation text={task.explanation} isCorrect={selected === task.isTrue} />}
        </div>
    )
}

// =============================================
// FLASH CARD
// =============================================
export function FlashCardTask({ task, onAnswer }) {
    const [flipped, setFlipped] = useState(false)
    const [rated, setRated] = useState(false)

    const handleRate = (knew) => {
        setRated(true)
        onAnswer(knew)
    }

    return (
        <div className="space-y-6">
            <motion.div
                className="relative h-64 cursor-pointer perspective-1000"
                onClick={() => !flipped && setFlipped(true)}
            >
                <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full relative preserve-3d"
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Front */}
                    <div
                        className="absolute inset-0 glass-card p-6 flex flex-col items-center justify-center text-center backface-hidden"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <p className="text-lg font-medium">{task.front}</p>
                        {task.hint && <p className="text-xs text-zinc-500 mt-4">💡 {task.hint}</p>}
                        <p className="text-xs text-indigo-400 mt-4">Нажми чтобы перевернуть</p>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute inset-0 glass-card p-6 flex items-center justify-center text-center backface-hidden"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        <p className="text-base">{task.back}</p>
                    </div>
                </motion.div>
            </motion.div>

            {flipped && !rated && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                >
                    <button
                        onClick={() => handleRate(false)}
                        className="flex-1 py-3 bg-amber-500/10 text-amber-400 rounded-xl font-semibold"
                    >
                        Не знал 😅
                    </button>
                    <button
                        onClick={() => handleRate(true)}
                        className="flex-1 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl font-semibold"
                    >
                        Знал! ✓
                    </button>
                </motion.div>
            )}
        </div>
    )
}

// =============================================
// BUG HUNTER
// =============================================
export function BugHunterTask({ task, onAnswer }) {
    const [selected, setSelected] = useState(null)
    const [answered, setAnswered] = useState(false)

    const handleSelect = (idx) => {
        if (answered) return
        setSelected(idx)
        setAnswered(true)
        onAnswer(idx === task.correct)
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <span className="text-xs text-red-400 font-semibold uppercase">🐛 Найди баг</span>
                <p className="text-sm text-zinc-400">Где ошибка в этом коде?</p>
            </div>

            {/* Code Block */}
            <div className="bg-zinc-900 rounded-xl p-4 font-mono text-sm overflow-x-auto border border-zinc-800">
                <pre className="text-emerald-400">{task.code}</pre>
            </div>

            {/* Options */}
            <div className="space-y-2">
                {task.options?.map((option, idx) => {
                    const isSelected = selected === idx
                    const isCorrect = task.correct === idx

                    let style = 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    if (answered) {
                        if (isCorrect) style = 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        else if (isSelected) style = 'bg-red-500/10 border-red-500 text-red-400'
                        else style = 'bg-zinc-900/50 border-zinc-800 opacity-50'
                    }

                    return (
                        <motion.button
                            key={idx}
                            whileTap={{ scale: answered ? 1 : 0.98 }}
                            onClick={() => handleSelect(idx)}
                            disabled={answered}
                            className={`w-full p-3 rounded-xl border text-left text-sm transition-all ${style}`}
                        >
                            {option}
                        </motion.button>
                    )
                })}
            </div>

            {answered && <Explanation text={task.explanation} isCorrect={selected === task.correct} />}
        </div>
    )
}

// =============================================
// FILL THE BLANK
// =============================================
export function FillBlankTask({ task, onAnswer }) {
    const [selected, setSelected] = useState(null)
    const [answered, setAnswered] = useState(false)

    const handleSelect = (idx) => {
        if (answered) return
        setSelected(idx)
        setAnswered(true)
        onAnswer(idx === task.correct)
    }

    // Подсветить пробел
    const parts = task.sentence.split('____')

    return (
        <div className="space-y-6">
            <div className="glass-card p-5">
                <p className="text-lg leading-relaxed">
                    {parts[0]}
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg mx-1 font-semibold">
                        {answered ? task.options[task.correct] : '____'}
                    </span>
                    {parts[1]}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {task.options?.map((option, idx) => {
                    const isSelected = selected === idx
                    const isCorrect = task.correct === idx

                    let style = 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    if (answered) {
                        if (isCorrect) style = 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        else if (isSelected) style = 'bg-red-500/10 border-red-500 text-red-400'
                        else style = 'bg-zinc-900/50 border-zinc-800 opacity-50'
                    }

                    return (
                        <motion.button
                            key={idx}
                            whileTap={{ scale: answered ? 1 : 0.98 }}
                            onClick={() => handleSelect(idx)}
                            disabled={answered}
                            className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${style}`}
                        >
                            {option}
                        </motion.button>
                    )
                })}
            </div>

            {answered && <Explanation text={task.explanation} isCorrect={selected === task.correct} />}
        </div>
    )
}

// =============================================
// EXPLANATION COMPONENT
// =============================================
function Explanation({ text, isCorrect }) {
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`p-4 rounded-xl ${isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}
        >
            <div className="flex items-start gap-3">
                <Lightbulb className={isCorrect ? 'text-emerald-400' : 'text-amber-400'} size={18} />
                <div>
                    <p className="font-semibold text-sm mb-1">{isCorrect ? 'Верно!' : 'Не совсем'}</p>
                    <p className="text-xs text-zinc-400">{text}</p>
                </div>
            </div>
        </motion.div>
    )
}
