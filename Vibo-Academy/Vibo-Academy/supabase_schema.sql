-- ==========================================
-- Схема Vibo Academy v5 (Multi-Career Support)
-- ВАЖНО: Выполни этот SQL в Supabase SQL Editor
-- ==========================================

-- Удаляем старые таблицы
DROP TABLE IF EXISTS public.vibo_learning_history CASCADE;
DROP TABLE IF EXISTS public.vibo_roadmaps CASCADE;
DROP TABLE IF EXISTS public.vibo_career_paths CASCADE;
DROP TABLE IF EXISTS public.vibo_profiles CASCADE;

-- 1. Профиль пользователя (один на Telegram ID)
CREATE TABLE public.vibo_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    total_xp INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Карьерные пути (много на одного пользователя)
CREATE TABLE public.vibo_career_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.vibo_profiles(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    grade TEXT CHECK (grade IN ('junior', 'middle', 'senior', 'lead')),
    xp INTEGER DEFAULT 0,
    completed_modules INTEGER DEFAULT 0,
    total_modules INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Roadmap модули (привязаны к карьерному пути)
CREATE TABLE public.vibo_roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_path_id UUID REFERENCES public.vibo_career_paths(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    description TEXT,
    xp_reward INTEGER DEFAULT 100,
    status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'completed')),
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. История обучения
CREATE TABLE public.vibo_learning_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_path_id UUID REFERENCES public.vibo_career_paths(id) ON DELETE CASCADE,
    task_hash TEXT NOT NULL,
    task_type TEXT,
    is_correct BOOLEAN,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Отключаем RLS для MVP
ALTER TABLE public.vibo_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibo_career_paths DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibo_roadmaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibo_learning_history DISABLE ROW LEVEL SECURITY;

-- Даем доступ
GRANT ALL ON public.vibo_profiles TO anon;
GRANT ALL ON public.vibo_career_paths TO anon;
GRANT ALL ON public.vibo_roadmaps TO anon;
GRANT ALL ON public.vibo_learning_history TO anon;

-- ==========================================
-- Готово! Теперь поддерживается множество должностей
-- ==========================================
