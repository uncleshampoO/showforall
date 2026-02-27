import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Zap, Lightbulb, Star } from 'lucide-react'
import { aiService } from '../services/ai.service'
import { dbService } from '../services/supabase.service'
import SudokuGame from './SudokuGame'

export default function LessonScreen({ profile, module, session, onTasksLoaded, onComplete, onClose }) {
    const [tasks, setTasks] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const [hasAnswered, setHasAnswered] = useState(false)
    const [taskIndex, setTaskIndex] = useState(0)
    const [correctCount, setCorrectCount] = useState(0)
    const [incorrectTasks, setIncorrectTasks] = useState([])
    const [attempts, setAttempts] = useState(3)
    const [isLoadError, setIsLoadError] = useState(false)

    // Ref для предотвращения двойной загрузки
    const loadingRef = useRef(false)

    // Текущее задание вычисляется на лету
    const currentTask = tasks[taskIndex] || null
    const totalTasks = tasks.length || (module.isChallenge ? module.tasks.length : 10)

    const loadLessonTasks = async () => {
        if (loadingRef.current) return
        loadingRef.current = true

        setIsLoading(true)
        try {
            let lessonTasks = []
            if (module.isChallenge) {
                lessonTasks = module.tasks
            } else {
                lessonTasks = await aiService.generateLesson(
                    session.role,
                    session.grade,
                    module.title,
                    module.description,
                    10
                )
            }

            if (!lessonTasks || lessonTasks.length === 0) {
                throw new Error("No tasks generated")
            }

            setTasks(lessonTasks)

            // Notify App that tasks are ready (triggers background generation at higher level)
            if (onTasksLoaded) {
                onTasksLoaded(lessonTasks);
            }

        } catch (e) {
            console.error('Lesson load error:', e)
            setIsLoadError(true)
            if (typeof window?.addToast === 'function') {
                window.addToast('Не удалось загрузить урок. Попробуйте обновить страницу.', 'error');
            }
        } finally {
            setIsLoading(false)
            loadingRef.current = false
        }
    }


    useEffect(() => {
        loadLessonTasks()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleSelectAnswer = (index, isCorrect) => {
        if (hasAnswered || !currentTask) return

        setSelectedAnswer(index)
        setHasAnswered(true)

        if (isCorrect) {
            setCorrectCount(prev => prev + 1)
        } else {
            setIncorrectTasks(prev => [...prev, currentTask])
            if (module.isChallenge) {
                setAttempts(prev => {
                    const newAttempts = prev - 1
                    if (newAttempts <= 0) {
                        setTimeout(() => onClose(), 2000)
                    }
                    return newAttempts
                })
            }
        }
    }

    const handleContinue = () => {
        const nextIndex = taskIndex + 1
        if (nextIndex >= tasks.length) {
            const xpPerTask = module.xp / tasks.length
            const earnedXp = Math.round(correctCount * xpPerTask)

            onComplete({
                correct: correctCount,
                total: tasks.length,
                xp: earnedXp,
                incorrectTasks: incorrectTasks
            })
        } else {
            setTaskIndex(nextIndex)
            setSelectedAnswer(null)
            setHasAnswered(false)
        }
    }

    const getTaskTypeName = () => {
        if (!currentTask) return ''
        const names = {
            pulse_test: 'Тест',
            true_false: 'Правда/Ложь',
            flash_card: 'Карточка',
            bug_hunter: 'Баг',
            fill_blank: 'Пробел'
        }
        return names[currentTask.type] || ''
    }

    const regenerateSingleTask = async () => {
        setIsLoading(true)
        try {
            if (typeof window?.addToast === 'function') {
                window.addToast('Пересобираю задание...', 'info');
            }

            const newTask = await aiService.generateTask(
                session.role,
                session.grade,
                module.title,
                module.description,
                currentTask?.type,
                tasks.map(t => t.question)
            )

            const newTasks = [...tasks]
            newTasks[taskIndex] = newTask
            setTasks(newTasks)

            setSelectedAnswer(null)
            setHasAnswered(false)

        } catch (err) {
            console.error('Task regeneration failed:', err)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoadError) {
        return (
            <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
                    <X size={32} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Сбой нейросети</h2>
                <p className="text-zinc-400 mb-8 max-w-sm">
                    Не удалось сгенерировать глубокий контент для этой темы. Попробуйте еще раз.
                </p>
                <div className="flex flex-col w-full max-w-xs gap-3">
                    <button
                        onClick={() => { setIsLoadError(false); loadLessonTasks(); }}
                        className="btn-primary w-full"
                    >
                        Попробовать снова
                    </button>
                    <button
                        onClick={onClose}
                        className="p-4 rounded-2xl border border-zinc-800 text-zinc-400 font-semibold hover:bg-zinc-900 transition-all"
                    >
                        Вернуться к роадмапу
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col overflow-hidden">
            <header className="shrink-0 p-4 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-950">
                <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 rounded-xl transition-colors"
                >
                    <X size={20} className="text-zinc-400" />
                </button>
                <div className="flex-1 mx-3">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${((taskIndex + (hasAnswered ? 1 : 0)) / totalTasks) * 100}%` }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {module.isChallenge && (
                        <div className="flex gap-1">
                            {[...Array(3)].map((_, i) => (
                                <Zap
                                    key={i}
                                    size={14}
                                    className={i < attempts ? 'text-amber-400' : 'text-zinc-700'}
                                    fill={i < attempts ? 'currentColor' : 'none'}
                                />
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-amber-400">
                        <Zap size={16} fill="currentColor" />
                        <span className="font-bold text-sm">{correctCount}</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto">
                <div className="min-h-full p-4 flex flex-col">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loader"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex-1 flex flex-col items-center justify-center -mt-10"
                            >
                                <div className="text-center mb-6 space-y-2 px-4">
                                    <h3 className="text-lg font-bold text-white tracking-tight leading-tight">
                                        ИИ изучает специфику роли {session?.role || 'специалиста'}... 🧠
                                    </h3>
                                    <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                                        Формируем твой персональный план обучения. <br />
                                        А пока — разомни мозг в быстром Судоку!
                                    </p>
                                </div>
                                <SudokuGame onComplete={(time) => {
                                    if (profile?.id) {
                                        dbService.recordSudokuScore(profile.id, time);
                                        if (typeof window?.addToast === 'function') {
                                            window.addToast(`Ваш рекорд: ${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')} сохранен!`, 'success');
                                        }
                                    }
                                }} />
                            </motion.div>
                        ) : currentTask ? (
                            <motion.div
                                key={`task-${taskIndex}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] text-indigo-400 font-medium uppercase tracking-wide truncate max-w-[70%]">
                                        {module.title}
                                    </span>
                                    {getTaskTypeName() && (
                                        <div className="flex items-center gap-2">
                                            {currentTask.isFallback && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); regenerateSingleTask(); }}
                                                    className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[9px] font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-colors animate-pulse-subtle"
                                                    title="Попробовать сгенерировать заново"
                                                >
                                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                                                        < Zap size={10} fill="currentColor" />
                                                    </motion.div>
                                                    REGENERATE
                                                </button>
                                            )}
                                            <span className="text-[10px] bg-zinc-800/80 text-zinc-500 px-2 py-0.5 rounded-full shrink-0">
                                                {getTaskTypeName()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <TaskRenderer
                                        task={currentTask}
                                        selectedAnswer={selectedAnswer}
                                        hasAnswered={hasAnswered}
                                        onSelect={handleSelectAnswer}
                                    />
                                </div>

                                {hasAnswered && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 pt-4 border-t border-zinc-800/50"
                                    >
                                        <button
                                            onClick={handleContinue}
                                            className="btn-primary w-full flex items-center justify-center gap-2"
                                        >
                                            <span>{taskIndex + 1 >= totalTasks ? 'Завершить' : 'Дальше'}</span>
                                            <ChevronRight size={18} />
                                        </button>
                                    </motion.div>
                                )}
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </main>

            {/* AI Disclaimer Footer - Small and subtle in Lesson mode */}
            <footer className="shrink-0 pb-4 text-center bg-zinc-950">
                <p className="text-[9px] text-zinc-700 font-medium">
                    Gemini может ошибаться, поэтому проверяйте его ответы.
                </p>
            </footer>
        </div>
    )
}

function TaskRenderer({ task, selectedAnswer, hasAnswered, onSelect }) {
    if (!task) return null

    // Common Wrapper for Neon Question Effect
    const QuestionNeonBox = ({ children }) => (
        <motion.div
            initial={{ boxShadow: "0 0 0px rgba(168, 85, 247, 0)" }}
            animate={{
                boxShadow: [
                    "0 0 10px rgba(168, 85, 247, 0.1)",
                    "0 0 20px rgba(245, 158, 11, 0.2)",
                    "0 0 10px rgba(168, 85, 247, 0.1)"
                ],
                borderColor: [
                    "rgba(99, 102, 241, 0.2)",
                    "rgba(245, 158, 11, 0.4)",
                    "rgba(99, 102, 241, 0.2)"
                ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="p-4 md:p-5 rounded-2xl bg-zinc-900/40 border-2 border-indigo-500/20 backdrop-blur-sm mb-4 relative overflow-hidden"
        >
            {children}
        </motion.div>
    );

    switch (task.type) {
        case 'true_false': return <TrueFalseTask task={task} selectedAnswer={selectedAnswer} hasAnswered={hasAnswered} onSelect={onSelect} Wrapper={QuestionNeonBox} />
        case 'flash_card': return <FlashCardTask task={task} hasAnswered={hasAnswered} onSelect={onSelect} Wrapper={QuestionNeonBox} />
        case 'bug_hunter': return <BugHunterTask task={task} selectedAnswer={selectedAnswer} hasAnswered={hasAnswered} onSelect={onSelect} Wrapper={QuestionNeonBox} />
        case 'fill_blank': return <FillBlankTask task={task} selectedAnswer={selectedAnswer} hasAnswered={hasAnswered} onSelect={onSelect} Wrapper={QuestionNeonBox} />
        default: return <PulseTestTask task={task} selectedAnswer={selectedAnswer} hasAnswered={hasAnswered} onSelect={onSelect} Wrapper={QuestionNeonBox} />
    }
}

function PulseTestTask({ task, selectedAnswer, hasAnswered, onSelect, Wrapper }) {
    const questionText = task.question || task.context || task.statement || task.sentence || task.front || ''
    return (
        <div className="space-y-4">
            <Wrapper>
                <p className="text-lg md:text-xl font-bold leading-relaxed text-white">{questionText}</p>
            </Wrapper>
            <div className="space-y-2">
                {task.options?.map((option, idx) => {
                    const isSelected = selectedAnswer === idx
                    const isCorrect = task.correct === idx
                    let style = 'bg-zinc-900/80 border-zinc-800'
                    if (hasAnswered) {
                        if (isCorrect) style = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                        else if (isSelected) style = 'bg-red-500/15 border-red-500/50 text-red-400'
                        else style = 'bg-zinc-900/40 border-zinc-800/50 opacity-50'
                    }
                    return (
                        <button key={idx} onClick={() => onSelect(idx, idx === task.correct)} disabled={hasAnswered} className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${style}`}>
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${hasAnswered && isCorrect ? 'bg-emerald-500 text-white' : hasAnswered && isSelected ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{String.fromCharCode(65 + idx)}</span>
                            <span className="text-sm leading-relaxed">{option}</span>
                        </button>
                    )
                })}
            </div>
            {hasAnswered && <Explanation text={task.explanation} isCorrect={selectedAnswer === task.correct} />}
        </div>
    )
}

function TrueFalseTask({ task, selectedAnswer, hasAnswered, onSelect, Wrapper }) {
    const statementText = task.statement || task.question || task.context || task.sentence || task.front || ''
    return (
        <div className="space-y-4">
            <Wrapper>
                <p className="text-lg md:text-xl font-bold leading-relaxed text-white">{statementText}</p>
            </Wrapper>
            <div className="grid grid-cols-2 gap-2">
                {[false, true].map((value, idx) => {
                    const isSelected = selectedAnswer === idx
                    const isCorrect = task.isTrue === value
                    let style = 'bg-zinc-900/80 border-zinc-800'
                    if (hasAnswered) {
                        if (isCorrect) style = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                        else if (isSelected) style = 'bg-red-500/15 border-red-500/50 text-red-400'
                        else style = 'bg-zinc-900/40 border-zinc-800/50 opacity-50'
                    }
                    return (
                        <button key={idx} onClick={() => onSelect(idx, value === task.isTrue)} disabled={hasAnswered} className={`p-4 rounded-xl border text-center font-medium transition-all ${style}`}>{value ? '✓ Правда' : '✗ Ложь'}</button>
                    )
                })}
            </div>
            {hasAnswered && <Explanation text={task.explanation} isCorrect={(selectedAnswer === 1) === task.isTrue} />}
        </div>
    )
}

function FlashCardTask({ task, hasAnswered, onSelect, Wrapper }) {
    const [flipped, setFlipped] = useState(false)
    return (
        <div className="space-y-4 h-full flex flex-col justify-center">
            <Wrapper>
                <div className="min-h-[220px] flex flex-col items-center justify-center text-center cursor-pointer" onClick={() => !flipped && setFlipped(true)}>
                    {!flipped ? (
                        <>
                            <p className="text-xl md:text-2xl font-bold leading-tight text-white mb-4">{task.front}</p>
                            {task.hint && <p className="text-sm text-zinc-500">💡 {task.hint}</p>}
                            <p className="text-xs text-indigo-400 mt-6 animate-pulse">Нажми для ответа →</p>
                        </>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <p className="text-lg md:text-xl font-medium leading-relaxed text-zinc-200">{task.back}</p>
                        </motion.div>
                    )}
                </div>
            </Wrapper>
            {flipped && !hasAnswered && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-2">
                    <button onClick={() => onSelect(0, false)} className="p-3 bg-amber-500/10 text-amber-400 rounded-xl font-medium text-sm">Не знал 😅</button>
                    <button onClick={() => onSelect(1, true)} className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl font-medium text-sm">Знал! ✓</button>
                </motion.div>
            )}
        </div>
    )
}

function BugHunterTask({ task, selectedAnswer, hasAnswered, onSelect, Wrapper }) {
    const bugText = task.context || task.question || task.statement || task.code || task.sentence || task.front || ''
    return (
        <div className="space-y-4">
            <Wrapper>
                <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                    <pre><code>{bugText}</code></pre>
                </div>
            </Wrapper>
            <div className="space-y-2">
                {task.options?.map((option, idx) => {
                    const isSelected = selectedAnswer === idx
                    const isCorrect = task.correct === idx
                    let style = 'bg-zinc-900/80 border-zinc-800'
                    if (hasAnswered) {
                        if (isCorrect) style = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                        else if (isSelected) style = 'bg-red-500/15 border-red-500/50 text-red-400'
                        else style = 'bg-zinc-900/40 border-zinc-800/50 opacity-50'
                    }
                    return (
                        <button key={idx} onClick={() => onSelect(idx, idx === task.correct)} disabled={hasAnswered} className={`w-full p-3 rounded-xl border text-left text-sm transition-all ${style}`}>{option}</button>
                    )
                })}
            </div>
            {hasAnswered && <Explanation text={task.explanation} isCorrect={selectedAnswer === task.correct} />}
        </div>
    )
}

function FillBlankTask({ task, selectedAnswer, hasAnswered, onSelect, Wrapper }) {
    const text = task.sentence || task.question || task.statement || task.context || ''
    const parts = text.split(/_{2,}/)
    if (parts.length < 2) return <PulseTestTask task={{ ...task, question: text }} selectedAnswer={selectedAnswer} hasAnswered={hasAnswered} onSelect={onSelect} Wrapper={Wrapper} />
    const cleanPart0 = parts[0]?.replace(/_/g, '')
    const cleanPart1 = parts[1]?.replace(/_/g, '')
    return (
        <div className="space-y-4">
            <Wrapper>
                <p className="text-lg md:text-xl font-bold leading-relaxed text-white">
                    {cleanPart0}
                    <span className={`px-2 py-0.5 rounded mx-1 font-bold shadow-lg ${hasAnswered ? (selectedAnswer === task.correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400') : 'bg-amber-500/30 text-amber-400 border border-amber-500/30'}`}>
                        {hasAnswered ? task.options[task.correct] : (selectedAnswer !== null ? task.options[selectedAnswer] : '.....')}
                    </span>
                    {cleanPart1}
                </p>
            </Wrapper>
            <div className="grid grid-cols-2 gap-2">
                {task.options?.map((option, idx) => {
                    const isSelected = selectedAnswer === idx
                    const isCorrect = task.correct === idx
                    let style = 'bg-zinc-900/80 border-zinc-800'
                    if (hasAnswered) {
                        if (isCorrect) style = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                        else if (isSelected) style = 'bg-red-500/15 border-red-500/50 text-red-400'
                        else style = 'bg-zinc-900/40 border-zinc-800/50 opacity-50'
                    }
                    return (
                        <button key={idx} onClick={() => onSelect(idx, idx === task.correct)} disabled={hasAnswered} className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${style}`}>{option}</button>
                    )
                })}
            </div>
            {hasAnswered && <Explanation text={task.explanation} isCorrect={selectedAnswer === task.correct} />}
        </div>
    )
}

function Explanation({ text, isCorrect }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-3 rounded-xl text-sm ${isCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
            <div className="flex items-start gap-2">
                <Lightbulb className={`shrink-0 mt-0.5 ${isCorrect ? 'text-emerald-400' : 'text-amber-400'}`} size={14} />
                <div>
                    <p className="font-medium text-xs mb-1">{isCorrect ? '✓ Верно!' : '✗ Не совсем'}</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{text}</p>
                </div>
            </div>
        </motion.div>
    )
}
