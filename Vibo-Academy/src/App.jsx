import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Zap, User, Plus, Trophy, ChevronRight, Loader2, Play, Sparkles, Star } from 'lucide-react'
import { aiService } from './services/ai.service'
import { dbService, supabase } from './services/supabase.service'
import { useProfile } from './hooks/useProfile'
import { useRoadmap } from './hooks/useRoadmap'
import Onboarding from './components/Onboarding'
import LessonScreen from './components/LessonScreen'
import LessonComplete from './components/LessonComplete'
import ProfileScreen from './components/ProfileScreen'
import WelcomeScreen from './components/WelcomeScreen'
import PresentationViewer from './components/PresentationViewer'
import ArticleViewer from './components/ArticleViewer'
import Toast from './components/Toast'
import NewsModal from './components/NewsModal'
import SubscriptionModal from './components/SubscriptionModal'
import SudokuGame from './components/SudokuGame'
import LeaderboardScreen from './components/LeaderboardScreen'
import { tmaService } from './services/tma.service'

export default function App() {
    const { profile, isLoading: isProfileLoading, refreshProfile, ensureProfile, updateXP, updateDisplayName } = useProfile()
    const {
        careerPaths, activePath, roadmap, isPathLoading,
        loadPaths, switchPath, deletePath, setCareerPaths, setActivePath, setRoadmap
    } = useRoadmap(profile)

    const [activeTab, setActiveTab] = useState('roadmap')
    const [isLoading, setIsLoading] = useState(false)
    const [loadingText, setLoadingText] = useState('Загрузка...')

    // Screens
    const [showWelcome, setShowWelcome] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [activeLesson, setActiveLesson] = useState(null)
    const [lessonResult, setLessonResult] = useState(null)
    const [showProfile, setShowProfile] = useState(false)

    // Material Viewers State
    const [viewingPresentation, setViewingPresentation] = useState(null)
    const [viewingArticle, setViewingArticle] = useState(null)
    const [lessonMaterials, setLessonMaterials] = useState(null)
    const [showNews, setShowNews] = useState(false)
    const [showPaywall, setShowPaywall] = useState(false)
    const [showLeaderboard, setShowLeaderboard] = useState(false)
    const [toasts, setToasts] = useState([])

    const isPlus = profile?.is_plus && (new Date(profile.plus_until) > new Date());

    const addToast = (message, type = 'info') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
    }

    useEffect(() => {
        window.addToast = addToast
    }, [])

    useEffect(() => {
        const isHidden = localStorage.getItem('vibo_news_hidden') === 'true';
        if (!isHidden) {
            setShowNews(true)
        }
    }, [])

    useEffect(() => {
        if (profile) {
            loadPaths(profile.id).then(paths => {
                if (paths.length === 0) setShowWelcome(true)
            })
        }
    }, [profile])

    /**
     * Обработка данных из онбординга.
     * Создает или берет существующий профиль и генерирует первый карьерный путь через AI.
     */
    const handleOnboarding = async (data) => {
        // Лимит на бесплатные пути
        if (!isPlus && careerPaths.length >= 1) {
            setShowPaywall(true);
            return;
        }

        setIsLoading(true)
        setShowOnboarding(false)
        setLoadingText('AI проектирует будущее...')

        try {
            let currentUser = profile;
            if (!currentUser) {
                currentUser = await ensureProfile();
            }

            if (!currentUser?.id) {
                throw new Error("Не удалось подключиться к профилю. Проверьте интернет.");
            }

            const result = await aiService.generateRoadmap(data.role, data.grade)

            if (!result?.roadmap) {
                throw new Error("AI не смог сгенерировать план. Попробуйте другую формулировку должности.");
            }

            console.log('Creating career path for UUID:', currentUser.id);
            const newPath = await dbService.createCareerPath(currentUser.id, data.role, data.grade, result.roadmap)
            if (!newPath) {
                throw new Error("Ошибка базы данных: не удалось сохранить путь.");
            }

            console.log('Reloading paths...');
            await loadPaths(currentUser.id)
            if (typeof window?.addToast === 'function') {
                window.addToast('Путь обучения успешно создан!', 'success');
            }
        } catch (err) {
            console.error('CRITICAL Onboarding Error:', err);
            const errorMsg = err.message || 'Сбой генерации';
            alert('Ошибка: ' + errorMsg); // Fallback if toast fails
            if (typeof window?.addToast === 'function') {
                window.addToast(`Ошибка: ${errorMsg}`, 'error');
            }
            setShowOnboarding(true)
        } finally {
            setIsLoading(false)
        }
    }

    const handleTasksLoaded = async (tasks) => {
        if (!activeLesson || !activePath) return;

        // Reset materials for new lesson
        setLessonMaterials(null);

        // Start background generation
        try {
            const mats = await aiService.generateAllMaterials(
                activePath.job_title,
                activePath.grade,
                activeLesson.title,
                activeLesson.description || "",
                tasks.map(t => t.question || t.context || t.statement).slice(0, 3)
            );
            setLessonMaterials(mats);
        } catch (err) {
            // Background failure is silent to not interrupt the quiz, 
            // but we ensure lessonMaterials remains null so UI handles it.
        }
    }

    /**
     * Вызывается при завершении модуля/урока.
     * Сохраняет прогресс в БД, обновляет XP и показывает экран результатов.
     */
    const handleLessonComplete = async (result) => {
        const completedModule = activeLesson
        setActiveLesson(null)
        setLessonResult({ ...result, module: completedModule })

        if (profile && activePath) {
            if (completedModule.id !== 'retake-challenge') {
                await dbService.completeModule(activePath.id, completedModule.id, result.xp, result.incorrectTasks)
                await updateXP(result.xp)
            } else if (result.correct === result.total) {
                // В режиме ретейка XP дается только за идеальное прохождение
                await dbService.clearRetakeQueue(activePath.id)
                await updateXP(300)
            } else {
                // Если были ошибки в ретейке — обнуляем XP в результате для UI
                result.xp = 0
            }
            await loadPaths(profile.id)
        }
    }

    /**
     * Переход к оплате подписки.
     * Открывает внешние реквизиты или запускает флоу Telegram/Stripe.
     */
    const handleSubscribe = async () => {
        if (!profile) return;

        try {
            setIsLoading(true);
            setLoadingText("Создаем счет...");

            const { data, error: invokeError } = await supabase.functions.invoke('vibo-stars', {
                body: { userId: profile.id }
            });

            if (invokeError) throw invokeError;
            if (data?.error) throw new Error(data.error);

            if (data?.invoiceLink) {
                tmaService.openInvoice(data.invoiceLink, async (status) => {
                    if (status === 'paid') {
                        addToast("Оплата успешно завершена! Активируем Plus...", "success");
                        await refreshProfile();
                    } else if (status === 'cancelled') {
                        addToast("Оплата отменена", "info");
                    } else if (status === 'failed') {
                        addToast("Ошибка при оплате. Попробуйте снова.", "error");
                    }
                });
            }
        } catch (e) {
            console.error('Payment Error:', e);
            addToast(e.message || "Ошибка создания счета. Попробуйте позже.", "error");
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Активация доступа через промокод.
     */
    const handlePromoActivation = async (code) => {
        if (!profile) return false;
        try {
            const result = await dbService.activatePromo(profile.id, code);
            if (result.success) {
                addToast(`Vibo Plus активирован на ${result.days} дней!`, "success");
                await refreshProfile();
                return true;
            } else {
                addToast(result.message || "Неверный код", "error");
                return false;
            }
        } catch (e) {
            addToast("Ошибка активации", "error");
            return false;
        }
    }

    const handleSudokuComplete = async (time) => {
        if (!profile) return
        try {
            await dbService.recordSudokuScore(profile.id, time)
            if (typeof window?.addToast === 'function') {
                window.addToast('Рекорд Судоку сохранен!', 'success')
            }
        } catch (e) {
            console.error('Sudoku score error:', e)
        }
    }

    if (isProfileLoading || isPathLoading || isLoading) {
        // Only show Sudoku if it's NOT onboarding (user explicitly asked to hide it after entering role/grade)
        const showSudoku = false;
        return <LoadingScreen text={loadingText} showSudoku={showSudoku} onSudokuComplete={handleSudokuComplete} />
    }

    // Подсчет завершенных модулей для отображения в статистике
    const completedCount = roadmap?.filter(r => r.status === 'completed')?.length || 0

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-zinc-950">
            <div className="glow-orb w-[300px] h-[300px] bg-indigo-600 -top-20 -right-20 opacity-20" />
            <div className="glow-orb w-[200px] h-[200px] bg-purple-600 bottom-40 -left-20 opacity-20" />

            {/* Base Layer: Roadmap or Welcome/Empty State */}
            {!activePath || !roadmap ? (
                <div className="min-h-screen flex items-center justify-center p-6">
                    <div className="text-center space-y-4">
                        <BookOpen className="mx-auto text-zinc-600" size={48} />
                        <h2 className="text-xl font-semibold">Путь обучения не выбран</h2>
                        <button onClick={() => setShowOnboarding(true)} className="btn-primary">Начать обучение</button>
                    </div>
                </div>
            ) : (
                <>
                    <header className="fixed top-0 left-0 right-0 z-40 p-5 flex justify-between items-center border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                    <Zap className="text-white" size={22} />
                                </div>
                                <button
                                    onClick={() => setShowNews(true)}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-900 border border-zinc-700 text-indigo-400 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
                                    aria-label="Что нового в Vibo Academy?"
                                >
                                    <Sparkles size={10} />
                                </button>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-semibold">Vibo Academy</h1>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-indigo-400 font-bold uppercase tracking-tighter bg-indigo-500/10 px-1 rounded">{activePath?.grade}</span>
                                    <span className="text-zinc-500">{activePath?.job_title}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full text-sm font-semibold">
                                <Zap size={14} fill="currentColor" />
                                <span>{profile?.current_streak || 0}</span>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto pt-24 pb-28 p-5 space-y-6">
                        <StatsGrid profile={profile} activePath={activePath} completedCount={completedCount} />

                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">🤖 Твой путь</h2>
                                <span className="text-xs text-emerald-400">{completedCount}/{roadmap?.length || 0}</span>
                            </div>

                            <div className="space-y-3">
                                {roadmap?.filter(s => s.title)?.map((step, idx) => {
                                    const isLockedByLimit = !isPlus && idx >= 3;
                                    return (
                                        <RoadmapStep
                                            key={step.id || idx}
                                            step={step}
                                            idx={idx}
                                            isLockedByLimit={isLockedByLimit}
                                            onClick={() => {
                                                if (isLockedByLimit) {
                                                    setShowPaywall(true);
                                                } else if (step.status !== 'locked') {
                                                    setActiveLesson(step);
                                                }
                                            }}
                                        />
                                    );
                                })}

                                {activePath?.retake_queue?.length > 0 && completedCount === roadmap?.length && (
                                    <RetakeChallenge queue={activePath.retake_queue} onClick={() => setActiveLesson({
                                        id: 'retake-challenge',
                                        title: 'Работа над ошибками',
                                        description: `Закрой ${activePath.retake_queue.length} слабых мест`,
                                        xp: 300,
                                        status: 'unlocked',
                                        isChallenge: true,
                                        tasks: activePath.retake_queue
                                    })} />
                                )}
                            </div>
                        </section>
                    </main>

                    <Navigation
                        showProfile={showProfile}
                        showLeaderboard={showLeaderboard}
                        onProfile={() => { setShowProfile(true); setShowLeaderboard(false); }}
                        onRoadmap={() => { setShowProfile(false); setShowLeaderboard(false); }}
                        onLeaderboard={() => { setShowLeaderboard(true); setShowProfile(false); }}
                    />
                </>
            )}

            {/* Screens Overlay Layer */}
            <AnimatePresence>
                {showWelcome && (
                    <WelcomeScreen onStart={() => { setShowWelcome(false); setShowOnboarding(true); }} />
                )}
                {showOnboarding && (
                    <Onboarding onComplete={handleOnboarding} />
                )}
                {showProfile && (
                    <ProfileScreen
                        profile={profile}
                        careerPaths={careerPaths}
                        activePath={activePath}
                        isPlus={isPlus}
                        onUpgrade={() => setShowPaywall(true)}
                        onUpdateName={updateDisplayName}
                        onSwitchPath={switchPath}
                        onResetPath={async (id) => { await dbService.resetCareerPath(id); await loadPaths(profile.id); }}
                        onDeletePath={deletePath}
                        onAddPath={() => { setShowProfile(false); setShowOnboarding(true); }}
                        onClose={() => setShowProfile(false)}
                    />
                )}
                {activeLesson && (
                    <LessonScreen
                        profile={profile}
                        module={activeLesson}
                        session={{ role: activePath?.job_title, grade: activePath?.grade }}
                        onTasksLoaded={handleTasksLoaded}
                        onComplete={handleLessonComplete}
                        onClose={() => setActiveLesson(null)}
                    />
                )}
                {lessonResult && (
                    <LessonComplete
                        result={{
                            ...lessonResult,
                            materials: lessonMaterials,
                            onViewPresentation: setViewingPresentation,
                            onViewArticle: setViewingArticle
                        }}
                        module={lessonResult.module}
                        onClose={() => setLessonResult(null)}
                    />
                )}
            </AnimatePresence>

            {/* Navigation and other static parts moved inside conditional block */}

            {/* Global Viewers - Moved outside conditional blocks to ensure they work */}
            <AnimatePresence>
                {viewingPresentation && (
                    <PresentationViewer
                        data={viewingPresentation}
                        onClose={() => setViewingPresentation(null)}
                    />
                )}
                {viewingArticle && (
                    <ArticleViewer
                        content={viewingArticle}
                        onClose={() => setViewingArticle(null)}
                    />
                )}
            </AnimatePresence>

            <NewsModal
                isOpen={showNews}
                onClose={() => setShowNews(false)}
            />

            <SubscriptionModal
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                onSubscribe={handleSubscribe}
                onActivatePromo={handlePromoActivation}
            />

            <AnimatePresence>
                {showLeaderboard && (
                    <LeaderboardScreen
                        profile={profile}
                        onClose={() => setShowLeaderboard(false)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    />
                ))}
            </AnimatePresence>

            {/* AI Disclaimer Footer */}
            <footer className="relative pointer-events-none pb-24 pt-4 text-center">
                <p className="text-[10px] text-zinc-600 font-medium">
                    Gemini может ошибаться, поэтому проверяйте его ответы.
                </p>
            </footer>
        </div>
    )
}

// Sub-components for cleaner App.jsx
function LoadingScreen({ text, showSudoku = true, onSudokuComplete }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-zinc-950 p-6">
            <div className="glow-orb w-[400px] h-[400px] bg-indigo-600 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-8 relative z-10 w-full max-w-sm"
            >
                <div className="space-y-3">
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">
                        {text || 'ИИ изучает специфику профессии и проектирует план обучения... 🧠'}
                    </h2>
                    <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] font-bold">
                        Vibo Academy Engine
                    </p>
                </div>

                {showSudoku && (
                    <div className="py-4">
                        <div className="text-center mb-6">
                            <p className="text-sm text-indigo-400 font-medium animate-pulse">
                                А пока — разомни мозг в быстром Судоку!
                            </p>
                        </div>
                        <SudokuGame onComplete={onSudokuComplete} />
                    </div>
                )}
                {!showSudoku && (
                    <div className="flex justify-center pt-8">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    </div>
                )}
            </motion.div>
        </div>
    )
}

function StatsGrid({ profile, activePath, completedCount }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
            {[
                { label: 'Стрик', value: profile?.current_streak || 0, icon: Zap, color: 'text-amber-400' },
                { label: 'XP', value: activePath?.xp || 0, icon: Trophy, color: 'text-emerald-400' },
                { label: 'Пройдено', value: completedCount, icon: BookOpen, color: 'text-indigo-400' },
            ].map((stat, i) => (
                <div key={i} className="glass-card p-4 text-center">
                    <stat.icon size={20} className={`mx-auto ${stat.color} mb-2`} />
                    <div className="text-xl font-bold">{stat.value}</div>
                    <div className="text-xs text-zinc-500">{stat.label}</div>
                </div>
            ))}
        </motion.div>
    )
}

function RoadmapStep({ step, idx, onClick, isLockedByLimit }) {
    const isCompleted = step.status === 'completed';
    const isUnlocked = step.status === 'unlocked' && !isLockedByLimit;
    const isActuallyLocked = step.status === 'locked' || isLockedByLimit;

    return (
        <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08 }}
            onClick={onClick}
            className={`glass-card p-5 flex items-center justify-between group cursor-pointer text-left w-full transition-all duration-300 
                ${isUnlocked ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10 hover:scale-[1.02]' : isActuallyLocked ? 'opacity-50' : 'hover:scale-[1.01]'}`}
            aria-label={`Модуль: ${step.title}. Статус: ${step.status}. Награда: ${step.xp} XP`}
        >
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center 
                    ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : isUnlocked ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-600'}`}>
                    {isLockedByLimit ? <Star size={18} fill="currentColor" className="text-amber-400" /> : isCompleted ? <Trophy size={22} /> : isUnlocked ? <Play size={20} fill="currentColor" /> : <BookOpen size={20} />}
                </div>
                <div className="flex-1">
                    <h3 className="font-medium flex items-center gap-2">
                        {step.title}
                        {isLockedByLimit && <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">Plus</span>}
                    </h3>
                    {step.description && <p className="text-xs text-zinc-500">{step.description}</p>}
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold ${isLockedByLimit ? 'text-zinc-600' : 'text-emerald-400'}`}>+{step.xp} XP</span>
                {isUnlocked && <ChevronRight className="text-indigo-400" size={20} />}
                {isLockedByLimit && <Zap className="text-amber-500" size={14} fill="currentColor" />}
            </div>
        </motion.button>
    )
}

function RetakeChallenge({ queue, onClick }) {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={onClick} className="glass-card p-5 mt-8 border-amber-500/30 bg-amber-500/5 flex items-center justify-between group cursor-pointer hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Zap size={22} fill="currentColor" />
                </div>
                <div>
                    <h3 className="font-bold text-amber-400">ВЫЗОВ: ОШИБКИ</h3>
                    <p className="text-xs text-zinc-400">Пройди без ошибок и получи 300 XP</p>
                </div>
            </div>
            <div className="text-right">
                <span className="text-xs text-amber-400 font-bold block">+300 XP</span>
                <ChevronRight className="text-amber-400 inline-block" size={20} />
            </div>
        </motion.div>
    )
}

function Navigation({ showProfile, showLeaderboard, onProfile, onRoadmap, onLeaderboard }) {
    const isRoadmap = !showProfile && !showLeaderboard;

    return (
        <nav className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/50 flex justify-around items-center z-50">
            <NavButton
                icon={Trophy}
                label="Лидеры"
                active={showLeaderboard}
                onClick={onLeaderboard}
            />

            <div className="relative">
                <button
                    onClick={onRoadmap}
                    className={`flex flex-col items-center gap-1 transition-all duration-300 ${isRoadmap ? 'text-white scale-110' : 'text-zinc-600'}`}
                >
                    <div className={`p-3.5 rounded-2xl transition-all ${isRoadmap
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/20'
                        : 'bg-zinc-900 border border-zinc-800'}`}>
                        <BookOpen size={24} />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${isRoadmap ? 'text-indigo-400' : 'text-zinc-600'}`}>Путь</span>
                </button>
            </div>

            <NavButton
                icon={User}
                label="Профиль"
                active={showProfile}
                onClick={onProfile}
            />
        </nav>
    )
}

function NavButton({ icon: Icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-indigo-400' : 'text-zinc-600'}`}
            aria-label={`Перейти в раздел ${label}`}
        >
            <Icon size={22} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        </button>
    )
}
