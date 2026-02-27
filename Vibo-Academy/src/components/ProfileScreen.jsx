import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Trophy, BookOpen, ChevronRight, Plus, RefreshCw, Trash2, ArrowLeft, Star, Edit2, Check } from 'lucide-react'

export default function ProfileScreen({ profile, careerPaths, activePath, isPlus, onUpgrade, onUpdateName, onSwitchPath, onResetPath, onDeletePath, onAddPath, onClose }) {
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [isEditingName, setIsEditingName] = useState(false)
    const [newName, setNewName] = useState(profile?.username || '')

    const totalXP = careerPaths.reduce((sum, p) => sum + (p.xp || 0), 0)
    const totalModules = careerPaths.reduce((sum, p) => sum + (p.completed_modules || 0), 0)

    const handleDelete = (pathId) => {
        if (confirmDelete === pathId) {
            onDeletePath(pathId)
            setConfirmDelete(null)
        } else {
            setConfirmDelete(pathId)
            setTimeout(() => setConfirmDelete(null), 3000)
        }
    }

    const handleSaveName = async () => {
        if (!newName.trim()) return
        await onUpdateName(newName.trim())
        setIsEditingName(false)
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950 z-50 flex flex-col overflow-hidden"
        >
            {/* Header */}
            <header className="p-4 flex items-center justify-between border-b border-zinc-800/50">
                <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                    <ArrowLeft size={24} className="text-zinc-400" />
                </button>
                <h1 className="text-lg font-semibold">Профиль</h1>
                <div className="w-10" />
            </header>

            <main className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Stats Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 text-center space-y-4"
                >
                    <div className={`w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl relative ${isPlus ? 'ring-4 ring-amber-500/50 shadow-amber-500/20' : 'shadow-indigo-500/30'}`}>
                        {isPlus ? <Star size={36} className="text-white" fill="white" /> : <Trophy size={36} className="text-white" />}
                        {isPlus && (
                            <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg uppercase tracking-tighter">Plus</div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center justify-center gap-2">
                            {isEditingName ? (
                                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1 px-3">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="bg-transparent text-white text-lg font-bold outline-none w-32"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                    />
                                    <button onClick={handleSaveName} className="p-1.5 bg-emerald-500 text-white rounded-lg">
                                        <Check size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-bold">{profile?.username || 'Ученик'}</h2>
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {isPlus ? (
                        <div className="space-y-3">
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-500">
                                    <Star size={16} fill="currentColor" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Vibo Plus Активен</span>
                                </div>
                                <span className="text-[10px] text-zinc-500">До {new Date(profile.plus_until).toLocaleDateString()}</span>
                            </div>
                            <button
                                onClick={onUpgrade}
                                className="w-full py-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest hover:text-amber-500 transition-colors"
                            >
                                Продлить или ввести код
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onUpgrade}
                            className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                        >
                            <Star size={16} fill="black" />
                            Улучшить до Vibo Plus
                        </button>
                    )}

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                        <div>
                            <div className="text-2xl font-bold text-amber-400">{profile?.current_streak || 0}</div>
                            <div className="text-xs text-zinc-500">Стрик</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-emerald-400">{totalXP}</div>
                            <div className="text-xs text-zinc-500">Всего XP</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-indigo-400">{totalModules}</div>
                            <div className="text-xs text-zinc-500">Модулей</div>
                        </div>
                    </div>
                </motion.div>

                {/* Career Paths Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                            Твои карьерные пути
                        </h2>
                    </div>

                    {/* Add New Path Highlighted Button */}
                    <button
                        onClick={onAddPath}
                        className="w-full p-4 glass-card border-dashed border-zinc-700 flex items-center justify-center gap-3 text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus size={20} />
                        </div>
                        <span className="font-bold text-sm">Сгенерировать новую профессию</span>
                    </button>

                    <AnimatePresence>
                        {careerPaths.map((path, idx) => (
                            <motion.div
                                key={path.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`glass-card p-4 space-y-3 ${path.is_active ? 'border-indigo-500/50' : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${path.is_active
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                            : 'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            <BookOpen size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{path.job_title}</h3>
                                            <p className="text-xs text-zinc-500">
                                                {path.grade?.toUpperCase()} • {path.completed_modules || 0}/{path.total_modules || 0} модулей
                                            </p>
                                        </div>
                                    </div>
                                    {path.is_active && (
                                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full font-bold uppercase">
                                            Активен
                                        </span>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-zinc-500">
                                        <span>Прогресс</span>
                                        <span>{path.xp || 0} XP</span>
                                    </div>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                            style={{ width: `${path.total_modules ? (path.completed_modules / path.total_modules) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    {!path.is_active && (
                                        <button
                                            onClick={() => onSwitchPath(path.id)}
                                            className="flex-1 py-2 px-3 bg-indigo-500/10 text-indigo-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 hover:bg-indigo-500/20 transition-colors"
                                        >
                                            <ChevronRight size={14} />
                                            <span>Перейти</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onResetPath(path.id)}
                                        className="py-2 px-3 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 hover:bg-amber-500/20 transition-colors"
                                    >
                                        <RefreshCw size={14} />
                                        <span>Сброс</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(path.id)}
                                        className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${confirmDelete === path.id
                                            ? 'bg-red-500 text-white'
                                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                            }`}
                                    >
                                        <Trash2 size={14} />
                                        <span>{confirmDelete === path.id ? 'Точно?' : 'Удалить'}</span>
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {careerPaths.length === 0 && (
                        <div className="glass-card p-8 text-center space-y-3">
                            <BookOpen className="mx-auto text-zinc-600" size={32} />
                            <p className="text-zinc-500">У тебя пока нет карьерных путей</p>
                            <button onClick={onAddPath} className="btn-primary text-sm">
                                Создать первый путь
                            </button>
                        </div>
                    )}
                </section>
            </main>

            {/* AI Disclaimer Footer */}
            <footer className="shrink-0 pb-8 pt-2 text-center bg-zinc-950 border-t border-zinc-800/10">
                <p className="text-[10px] text-zinc-600 font-medium">
                    Gemini может ошибаться, поэтому проверяйте его ответы.
                </p>
            </footer>
        </motion.div>
    )
}
