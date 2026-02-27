import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trophy, Medal, Timer, Star, Zap, User, Loader2 } from 'lucide-react'
import { dbService } from '../services/supabase.service'

export default function LeaderboardScreen({ profile, onClose }) {
    const [activeTab, setActiveTab] = useState('xp') // 'xp' or 'sudoku'
    const [data, setData] = useState({ xp: [], sudoku: [], userStats: null })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchScores = async () => {
            try {
                const scores = await dbService.getLeaderboards(profile?.id)
                setData(scores)
            } catch (e) {
                console.error('Failed to fetch leaderboards:', e)
            } finally {
                setIsLoading(false)
            }
        }
        fetchScores()
    }, [profile])

    const formatTime = (s) => (s !== null && s !== undefined) ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` : '--:--';

    const myRank = activeTab === 'xp' ? data.userStats?.xpRank : data.userStats?.sudokuRank;
    const myValue = activeTab === 'xp' ? data.userStats?.monthlyXp : data.userStats?.bestSudoku;

    return (
        <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-0 bg-zinc-950 z-[60] flex flex-col overflow-hidden"
        >
            {/* Header */}
            <header className="shrink-0 p-4 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl">
                <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                    <ArrowLeft size={24} className="text-zinc-400" />
                </button>
                <div className="text-center">
                    <h1 className="text-lg font-bold text-white uppercase tracking-wider">Зал Славы</h1>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Vibo Academy</p>
                </div>
                <div className="w-10" />
            </header>

            {/* Tabs */}
            <div className="shrink-0 p-4 bg-zinc-950">
                <div className="bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800 flex gap-2">
                    <button
                        onClick={() => setActiveTab('xp')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'xp' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <Zap size={14} fill={activeTab === 'xp' ? 'white' : 'none'} />
                        <span>Месячный XP</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('sudoku')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'sudoku' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <Timer size={14} />
                        <span>Мастера Судоку</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 overflow-y-auto px-4 pb-32">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-sm text-zinc-500 font-medium">Подсчитываем рекорды...</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Weekly Prize Notice */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                                <Medal size={22} fill="white" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-tight">ТОП-3 = Vibo Plus!</h3>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    {activeTab === 'xp'
                                        ? 'ТОП-3 игрока по опыту за месяц получают Vibo Plus в подарок.'
                                        : 'Три самых быстрых мастера Судоку получают статус Vibo Plus.'}
                                </p>
                            </div>
                        </div>

                        {/* List - TOP 5 */}
                        <div className="space-y-2 mt-4">
                            <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-3 ml-2">На этой неделе</div>

                            {(activeTab === 'xp' ? data.xp : data.sudoku).slice(0, 5).map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`glass-card p-4 flex items-center justify-between ${idx === 0 ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-zinc-300 text-zinc-900' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold flex items-center gap-2">
                                                {item.username || 'Аноним'}
                                                {idx === 0 && <Star size={12} fill="currentColor" className="text-amber-500" />}
                                                {item.username === profile?.username && <span className="bg-indigo-500/20 text-indigo-400 text-[8px] px-1.5 py-0.5 rounded uppercase">Вы</span>}
                                            </div>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase">Ранг {(activeTab === 'xp' ? 'Ученик' : 'Мыслитель')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {activeTab === 'xp' ? (
                                            <div className="text-emerald-400 font-bold">+{item.monthly_xp} XP</div>
                                        ) : (
                                            <div className="text-indigo-400 font-bold flex items-center gap-1">
                                                <Timer size={14} />
                                                {formatTime(item.time_seconds)}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {(activeTab === 'xp' ? data.xp : data.sudoku).length === 0 && (
                                <div className="py-12 text-center space-y-3">
                                    <Trophy size={40} className="mx-auto text-zinc-800" />
                                    <p className="text-zinc-500 text-sm">Тут пока пусто. Стань первым!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* My Rank Footer */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className="shrink-0 p-4 border-t border-zinc-800/50 bg-zinc-950 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10"
            >
                <div className="glass-card p-4 border-indigo-500/30 bg-indigo-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-500/20">
                            #{myRank || '?'}
                        </div>
                        <div>
                            <div className="font-bold text-white flex items-center gap-2 text-sm">
                                {profile?.username}
                                <span className="bg-indigo-500 text-[8px] px-1.5 py-0.5 rounded text-white font-black uppercase tracking-tighter shadow-lg">Вы</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Твое место в рейтинге</p>
                        </div>
                    </div>
                    <div className="text-right">
                        {activeTab === 'xp' ? (
                            <div className="text-emerald-400 font-bold text-lg">+{myValue || 0} <span className="text-[10px] text-zinc-500">XP</span></div>
                        ) : (
                            <div className="text-indigo-400 font-bold text-lg flex items-center gap-2 justify-end">
                                <Timer size={16} />
                                {formatTime(myValue)}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
