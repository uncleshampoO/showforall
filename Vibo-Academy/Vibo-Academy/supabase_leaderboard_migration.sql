-- ==========================================
-- Миграция: Лидерборды и Месячный XP (v0.9.5)
-- ==========================================

-- 1. Добавляем поля для ежемесячного опыта в профиль
ALTER TABLE public.vibo_profiles 
ADD COLUMN IF NOT EXISTS monthly_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_xp_reset_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Создаем таблицу для результатов Судоку
CREATE TABLE IF NOT EXISTS public.vibo_sudoku_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.vibo_profiles(id) ON DELETE CASCADE,
    time_seconds INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Отключаем RLS для новой таблицы
ALTER TABLE public.vibo_sudoku_scores DISABLE ROW LEVEL SECURITY;

-- 4. Даем права доступа
GRANT ALL ON public.vibo_sudoku_scores TO anon;
GRANT ALL ON public.vibo_sudoku_scores TO authenticated;

-- ==========================================
-- Инструкция:
-- 1. Скопируй этот код.
-- 2. Зайди в Supabase Dashbaord -> SQL Editor.
-- 3. Вставь и нажми Run.
-- ==========================================
