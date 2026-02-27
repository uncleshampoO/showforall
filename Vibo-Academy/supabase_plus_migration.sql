-- МИГРАЦИЯ: Добавление подписки Vibo Plus и Лидербордов
-- Выполни этот запрос в Supabase SQL Editor

-- 1. Поля профиля для подписки и лидерборда
ALTER TABLE public.vibo_profiles 
ADD COLUMN IF NOT EXISTS is_plus BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS plus_until TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS monthly_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_xp_reset_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Таблица для результатов Судоку
CREATE TABLE IF NOT EXISTS public.vibo_sudoku_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.vibo_profiles(id) ON DELETE CASCADE,
    time_seconds INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для скорости лидербордов
CREATE INDEX IF NOT EXISTS idx_vibo_profiles_monthly_xp ON public.vibo_profiles(monthly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_vibo_sudoku_scores_time ON public.vibo_sudoku_scores(time_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_vibo_sudoku_scores_user_id ON public.vibo_sudoku_scores(user_id);

-- Даем права (RLS отключен в проекте, поэтому используем anon/authenticated)
GRANT ALL ON public.vibo_sudoku_scores TO anon;
GRANT ALL ON public.vibo_sudoku_scores TO authenticated;
GRANT SELECT, UPDATE(is_plus, plus_until, monthly_xp, last_xp_reset_at, username) ON public.vibo_profiles TO anon;
GRANT SELECT, UPDATE(is_plus, plus_until, monthly_xp, last_xp_reset_at, username) ON public.vibo_profiles TO authenticated;

-- 3. Промокоды
CREATE TABLE IF NOT EXISTS public.vibo_promo_codes (
    code TEXT PRIMARY KEY,
    duration_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES public.vibo_profiles(id)
);

-- 4. Транзакции (на будущее для платежей)
CREATE TABLE IF NOT EXISTS public.vibo_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.vibo_profiles(id),
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'STARS',
    provider_payment_charge_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_vibo_promo_codes_active ON public.vibo_promo_codes(code) WHERE is_active = true;

-- Права
GRANT SELECT, UPDATE ON public.vibo_promo_codes TO anon;
GRANT SELECT, UPDATE ON public.vibo_promo_codes TO authenticated;
GRANT INSERT ON public.vibo_transactions TO anon;
GRANT INSERT ON public.vibo_transactions TO authenticated;

COMMENT ON COLUMN public.vibo_profiles.is_plus IS 'Статус активной подписки Vibo Plus';
COMMENT ON COLUMN public.vibo_profiles.plus_until IS 'Дата истечения подписки';
