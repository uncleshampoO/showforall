import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Supabase Service: Vibo Academy v5
 * Поддержка нескольких карьерных путей
 */
export const dbService = {

    // ================== HELPERS ==================

    generateAnonymousName() {
        const adjectives = ["Подозрительный", "Загадочный", "Мудрый", "Скрытный", "Веселый", "Серьезный", "Быстрый", "Сонный", "Хитрый", "Амбициозный"];
        const animals = ["Панда", "Сурикат", "Ежик", "Ленивец", "Кот", "Енот", "Лис", "Хомяк", "Барсук", "Волк"];

        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const animal = animals[Math.floor(Math.random() * animals.length)];

        return `${adj} ${animal}`;
    },

    // ================== PROFILES ==================

    async getOrCreateProfile(telegramId, username = null) {
        console.log('[Supabase DB] getOrCreateProfile called:', { telegramId, username });
        const { data: existing, error: getError } = await supabase
            .from('vibo_profiles')
            .select('*, is_plus, plus_until, monthly_xp')
            .eq('telegram_id', telegramId)
            .single()

        if (getError && getError.code !== 'PGRST116') {
            console.error('[Supabase DB] Error selecting profile:', getError);
            // If column is missing, it's a migration issue
            if (getError.message?.includes('is_plus') || getError.message?.includes('plus_until')) {
                throw new Error(`БАЗА ДАННЫХ: Отсутствуют колонки подписки. Пожалуйста, выполните скрипт из файла supabase_plus_migration.sql в SQL Editor.`);
            }
            throw new Error(`Ошибка Supabase (Single): ${getError.message}`);
        }

        if (existing) {
            console.log('[Supabase DB] Existing profile found:', existing.id);

            // Если имя стандартное или пустое - присваиваем анонимное животное
            if (!existing.username || existing.username === 'demo_user' || existing.username === username) {
                const anonName = this.generateAnonymousName();
                console.log('[Supabase DB] Auto-anonymizing user:', anonName);
                const { data: updated } = await supabase
                    .from('vibo_profiles')
                    .update({
                        username: anonName,
                        last_activity: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select()
                    .single()
                return updated || existing;
            }

            await supabase
                .from('vibo_profiles')
                .update({ last_activity: new Date().toISOString() })
                .eq('id', existing.id)
            return existing
        }

        console.log('[Supabase DB] Creating new profile...');
        const finalUsername = username && username !== 'demo_user' ? username : this.generateAnonymousName();

        const { data: newProfile, error } = await supabase
            .from('vibo_profiles')
            .insert({
                telegram_id: telegramId,
                username: finalUsername
            })
            .select()
            .single()

        if (error) {
            console.error('[Supabase DB] Create profile error:', error)
            return null
        }
        console.log('[Supabase DB] New profile created:', newProfile.id);
        return { ...newProfile, is_plus: false, plus_until: null }
    },

    async checkLimits(userId) {
        const { data: profile } = await supabase
            .from('vibo_profiles')
            .select('is_plus, plus_until')
            .eq('id', userId)
            .single();

        const isPlus = profile?.is_plus && (new Date(profile.plus_until) > new Date());

        const { count } = await supabase
            .from('vibo_career_paths')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        return {
            isPlus,
            pathsCount: count || 0,
            canCreatePath: isPlus || (count || 0) < 1,
            maxFreeModules: 3
        };
    },

    async activatePlus(userId, months = 1) {
        const until = new Date();
        until.setMonth(until.getMonth() + months);

        const { data, error } = await supabase
            .from('vibo_profiles')
            .update({
                is_plus: true,
                plus_until: until.toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        return { data, error };
    },

    async updateProfileStats(profileId, xpToAdd = 0) {
        const { data: profile } = await supabase
            .from('vibo_profiles')
            .select('total_xp, monthly_xp, last_xp_reset_at, current_streak, max_streak, last_activity')
            .eq('id', profileId)
            .single()

        const lastActivity = new Date(profile?.last_activity)
        const now = new Date()
        const hoursDiff = (now - lastActivity) / (1000 * 60 * 60)

        let newStreak = profile?.current_streak || 0
        if (hoursDiff >= 20 && hoursDiff < 48) {
            newStreak += 1
        } else if (hoursDiff >= 48) {
            newStreak = 1
        }

        const lastReset = new Date(profile?.last_xp_reset_at || profile?.created_at || now)

        // Логика сброса месячного XP (если наступил новый месяц относительно последнего обновления)
        const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()

        const { data } = await supabase
            .from('vibo_profiles')
            .update({
                total_xp: (profile?.total_xp || 0) + xpToAdd,
                monthly_xp: isNewMonth ? xpToAdd : (profile?.monthly_xp || 0) + xpToAdd,
                last_xp_reset_at: isNewMonth ? now.toISOString() : lastReset.toISOString(),
                current_streak: newStreak,
                max_streak: Math.max(newStreak, profile?.max_streak || 0),
                last_activity: now.toISOString()
            })
            .eq('id', profileId)
            .select()
            .single()

        return data
    },

    async updateProfileName(profileId, newName) {
        if (!profileId || !newName) return null;
        const { data, error } = await supabase
            .from('vibo_profiles')
            .update({ username: newName })
            .eq('id', profileId)
            .select()
            .single();

        return data;
    },

    async activatePromo(profileId, code) {
        if (!profileId || !code) return { success: false, message: 'Не указан код' };

        // 0. Проверка: не использовал ли этот пользователь промокод ранее?
        const { data: alreadyUsed, error: checkError } = await supabase
            .from('vibo_promo_codes')
            .select('code')
            .eq('used_by', profileId)
            .limit(1);

        if (alreadyUsed && alreadyUsed.length > 0) {
            return { success: false, message: 'Вы уже активировали промокод ранее. Один аккаунт - один код.' };
        }

        // 1. Поиск активного кода
        const { data: promo, error: fetchError } = await supabase
            .from('vibo_promo_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .single();

        if (fetchError || !promo) return { success: false, message: 'Неверный или уже использованный промокод' };

        // 2. Рассчитываем новую дату окончания подписки
        const now = new Date();
        const { data: profile } = await supabase
            .from('vibo_profiles')
            .select('plus_until')
            .eq('id', profileId)
            .single();

        const currentExpiry = profile?.plus_until ? new Date(profile.plus_until) : now;
        const baseDate = currentExpiry > now ? currentExpiry : now;
        const newExpiry = new Date(baseDate.getTime() + (promo.duration_days * 24 * 60 * 60 * 1000));

        // 3. Активируем код (атомарно в идеале, но для MVP последовательно)
        const { error: promoUpdateError } = await supabase
            .from('vibo_promo_codes')
            .update({
                is_active: false,
                used_at: now.toISOString(),
                used_by: profileId
            })
            .eq('code', promo.code);

        if (promoUpdateError) return { success: false, message: 'Ошибка активации кода' };

        // 4. Обновляем профиль
        const { error: profileUpdateError } = await supabase
            .from('vibo_profiles')
            .update({
                is_plus: true,
                plus_until: newExpiry.toISOString()
            })
            .eq('id', profileId);

        if (profileUpdateError) return { success: false, message: 'Ошибка обновления профиля' };

        return { success: true, newExpiry, days: promo.duration_days };
    },

    // ================== CAREER PATHS ==================

    async getCareerPaths(userId) {
        const { data, error } = await supabase
            .from('vibo_career_paths')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        return data || []
    },

    async getActiveCareerPath(userId) {
        const { data } = await supabase
            .from('vibo_career_paths')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single()

        return data
    },

    async createCareerPath(userId, jobTitle, grade, roadmapItems = []) {
        // Деактивируем все предыдущие пути
        await supabase
            .from('vibo_career_paths')
            .update({ is_active: false })
            .eq('user_id', userId)

        // Создаем новый путь
        const { data: path, error } = await supabase
            .from('vibo_career_paths')
            .insert({
                user_id: userId,
                job_title: jobTitle,
                grade,
                total_modules: roadmapItems.length,
                is_active: true
            })
            .select()
            .single()

        if (error) {
            console.error('[Supabase DB] Insert Career Path Error:', error);
            throw new Error(`Ошибка записи пути: ${error.message} (ID пользователя: ${userId})`);
        }

        // Создаем модули roadmap
        if (roadmapItems.length > 0) {
            const modules = roadmapItems.map((item, idx) => ({
                career_path_id: path.id,
                topic: item.title,
                description: item.description || '',
                xp_reward: item.xp || 150,
                status: idx === 0 ? 'unlocked' : 'locked',
                priority: idx
            }))

            const { error: modulesError } = await supabase.from('vibo_roadmaps').insert(modules)
            if (modulesError) {
                console.error('Create roadmap modules error:', modulesError)
                // Если модули не создались — удаляем "пустой" путь, чтобы не плодить мусор
                await supabase.from('vibo_career_paths').delete().eq('id', path.id)
                throw new Error(`Ошибка сохранения учебного плана: ${modulesError.message}`)
            }
        }

        return path
    },

    async switchCareerPath(userId, pathId) {
        await supabase
            .from('vibo_career_paths')
            .update({ is_active: false })
            .eq('user_id', userId)

        await supabase
            .from('vibo_career_paths')
            .update({ is_active: true })
            .eq('id', pathId)
    },

    async deleteCareerPath(pathId) {
        await supabase.from('vibo_career_paths').delete().eq('id', pathId)
    },

    async resetCareerPath(pathId) {
        // Сбрасываем XP и прогресс
        await supabase
            .from('vibo_career_paths')
            .update({ xp: 0, completed_modules: 0 })
            .eq('id', pathId)

        // Сбрасываем статусы модулей
        await supabase
            .from('vibo_roadmaps')
            .update({ status: 'locked' })
            .eq('career_path_id', pathId)

        // Разблокируем первый
        const { data: modules } = await supabase
            .from('vibo_roadmaps')
            .select('id')
            .eq('career_path_id', pathId)
            .order('priority', { ascending: true })
            .limit(1)

        if (modules?.[0]) {
            await supabase
                .from('vibo_roadmaps')
                .update({ status: 'unlocked' })
                .eq('id', modules[0].id)
        }
    },

    // ================== ROADMAP ==================

    async getRoadmap(careerPathId) {
        const { data } = await supabase
            .from('vibo_roadmaps')
            .select('*')
            .eq('career_path_id', careerPathId)
            .order('priority', { ascending: true })

        return data || []
    },

    async completeModule(careerPathId, moduleId, xpEarned, incorrectTasks = []) {
        // Помечаем модуль завершённым
        await supabase
            .from('vibo_roadmaps')
            .update({ status: 'completed' })
            .eq('id', moduleId)

        // Сохраняем ошибки, если они есть
        if (incorrectTasks.length > 0) {
            const { data: currentPath } = await supabase
                .from('vibo_career_paths')
                .select('retake_queue')
                .eq('id', careerPathId)
                .single()

            const existingQueue = currentPath?.retake_queue || []
            // Добавляем новые ошибки, избегая дубликатов по вопросу
            const newQueue = [...existingQueue]
            incorrectTasks.forEach(task => {
                const questionTitle = task.question || task.statement || task.front || task.sentence
                if (!newQueue.find(q => (q.question || q.statement || q.front || q.sentence) === questionTitle)) {
                    newQueue.push(task)
                }
            })

            await supabase
                .from('vibo_career_paths')
                .update({ retake_queue: newQueue })
                .eq('id', careerPathId)
        }

        // Разблокируем следующий
        const roadmap = await this.getRoadmap(careerPathId)
        const currentIdx = roadmap.findIndex(r => r.id === moduleId)

        if (currentIdx >= 0 && currentIdx < roadmap.length - 1) {
            await supabase
                .from('vibo_roadmaps')
                .update({ status: 'unlocked' })
                .eq('id', roadmap[currentIdx + 1].id)
        }

        // Обновляем статистику пути
        const { data: path } = await supabase
            .from('vibo_career_paths')
            .select('xp, completed_modules')
            .eq('id', careerPathId)
            .single()

        await supabase
            .from('vibo_career_paths')
            .update({
                xp: (path?.xp || 0) + xpEarned,
                completed_modules: (path?.completed_modules || 0) + 1
            })
            .eq('id', careerPathId)
    },

    async clearRetakeQueue(pathId) {
        await supabase
            .from('vibo_career_paths')
            .update({ retake_queue: [] })
            .eq('id', pathId)
    },

    // ================== STATS ==================

    async getCareerPathStats(careerPathId) {
        const { data } = await supabase
            .from('vibo_learning_history')
            .select('is_correct')
            .eq('career_path_id', careerPathId)

        const total = data?.length || 0
        const correct = data?.filter(d => d.is_correct).length || 0

        return {
            total,
            correct,
            accuracy: total > 0 ? Math.round((correct / total) * 100) : 0
        }
    },

    async getAllStats(userId) {
        const paths = await this.getCareerPaths(userId)
        const stats = await Promise.all(
            paths.map(async (path) => ({
                ...path,
                stats: await this.getCareerPathStats(path.id)
            }))
        )
        return stats
    },

    // ================== LEADERBOARDS ==================

    async recordSudokuScore(userId, timeSeconds) {
        const { error } = await supabase
            .from('vibo_sudoku_scores')
            .insert({ user_id: userId, time_seconds: timeSeconds })
        return { error }
    },

    async getLeaderboards(userId = null) {
        // 1. Топ по месячному XP (только топ-5)
        const { data: xpTop } = await supabase
            .from('vibo_profiles')
            .select('username, monthly_xp')
            .order('monthly_xp', { ascending: false })
            .limit(5)

        // 2. Топ по Судоку (только топ-5)
        const { data: sudokuData } = await supabase
            .from('vibo_sudoku_scores')
            .select(`
                time_seconds,
                vibo_profiles ( username )
            `)
            .order('time_seconds', { ascending: true })
            .limit(50) // Берем побольше, чтобы отфильтровать уникальных для топ-5

        const uniqueSudoku = []
        const seen = new Set()
        if (sudokuData) {
            sudokuData.forEach(row => {
                const uname = row.vibo_profiles?.username || 'Аноним'
                if (!seen.has(uname)) {
                    uniqueSudoku.push({ username: uname, time_seconds: row.time_seconds })
                    seen.add(uname)
                }
            })
        }

        // 3. Расчет ранга пользователя (если передан userId)
        let userStats = { xpRank: 0, sudokuRank: 0, bestSudoku: null, monthlyXp: 0 };

        if (userId) {
            // XP Rank
            const { data: profile } = await supabase
                .from('vibo_profiles')
                .select('monthly_xp')
                .eq('id', userId)
                .single();

            if (profile) {
                userStats.monthlyXp = profile.monthly_xp;
                const { count } = await supabase
                    .from('vibo_profiles')
                    .select('*', { count: 'exact', head: true })
                    .gt('monthly_xp', profile.monthly_xp);
                userStats.xpRank = (count || 0) + 1;
            }

            // Sudoku Rank (всего лишь примерная логика через лучший результат пользователя)
            const { data: myBest } = await supabase
                .from('vibo_sudoku_scores')
                .select('time_seconds')
                .eq('user_id', userId)
                .order('time_seconds', { ascending: true })
                .limit(1)
                .single();

            if (myBest) {
                userStats.bestSudoku = myBest.time_seconds;
                // Считаем сколько уникальных пользователей имеют время лучше нашего
                // В идеале это RPC, но через count по уникальным сложно. 
                // Оценим примерно по количеству результатов лучше нашего.
                const { count } = await supabase
                    .from('vibo_sudoku_scores')
                    .select('*', { count: 'exact', head: true })
                    .lt('time_seconds', myBest.time_seconds);
                userStats.sudokuRank = (count || 0) + 1;
            }
        }

        return {
            xp: xpTop || [],
            sudoku: uniqueSudoku.slice(0, 5),
            userStats
        }
    }
}
