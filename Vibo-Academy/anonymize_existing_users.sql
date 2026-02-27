-- ЭКСТРЕННАЯ АНОНИМИЗАЦИЯ: Скрытие всех реальных юзернеймов
-- Выполни этот запрос в Supabase SQL Editor

UPDATE public.vibo_profiles
SET username = (
  (ARRAY['Подозрительный', 'Загадочный', 'Мудрый', 'Скрытный', 'Веселый', 'Серьезный', 'Быстрый', 'Сонный', 'Хитрый', 'Амбициозный'])[floor(random() * 10 + 1)] || ' ' ||
  (ARRAY['Панда', 'Сурикат', 'Ежик', 'Ленивец', 'Кот', 'Енот', 'Лис', 'Хомяк', 'Барсук', 'Волк'])[floor(random() * 10 + 1)]
)
WHERE telegram_id IS NOT NULL; -- Обновляем всех, у кого есть привязка к ТГ

-- Проверка результата
SELECT id, username, telegram_id FROM public.vibo_profiles LIMIT 10;
