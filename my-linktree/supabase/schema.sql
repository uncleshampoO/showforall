-- ============================================
-- My LinkTree Portfolio - Supabase Schema
-- ============================================

-- 1. Portfolio CV Table
CREATE TABLE IF NOT EXISTS portfolio_cv (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    stack JSONB DEFAULT '{}'::jsonb,
    contacts JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE portfolio_cv ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access for portfolio_cv" 
ON portfolio_cv FOR SELECT 
USING (true);

-- 2. Portfolio Projects Table
CREATE TABLE IF NOT EXISTS portfolio_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    stack JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    demo_url TEXT,
    repo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access for portfolio_projects" 
ON portfolio_projects FOR SELECT 
USING (true);

-- 3. Portfolio Experience Table
CREATE TABLE IF NOT EXISTS portfolio_experience (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    period TEXT,
    description TEXT,
    achievements JSONB DEFAULT '[]'::jsonb,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE portfolio_experience ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access for portfolio_experience" 
ON portfolio_experience FOR SELECT 
USING (true);

-- 4. Task History Table (for AI HR context)
CREATE TABLE IF NOT EXISTS task_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    task_name TEXT NOT NULL,
    category TEXT,
    skills_used JSONB DEFAULT '[]'::jsonb,
    outcome TEXT,
    complexity INTEGER DEFAULT 3,
    time_spent_hours DECIMAL(4,1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicates
    UNIQUE(date, task_name)
);

-- Enable RLS
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for AI HR to use)
CREATE POLICY "Public read access for task_history" 
ON task_history FOR SELECT 
USING (true);

-- Index for faster queries
CREATE INDEX idx_task_history_date ON task_history(date DESC);
CREATE INDEX idx_task_history_category ON task_history(category);

-- ============================================
-- Initial Data
-- ============================================

-- Insert initial CV data
INSERT INTO portfolio_cv (name, title, summary, stack, contacts)
VALUES (
    'Виталий Бондарев',
    'AI Sales Automation Architect / Head of Sales Development',
    'Более 7 лет развиваю B2B-продажи и команды, теперь перешел в направление AI-автоматизации бизнес-процессов. Объединяю опыт построения отделов продаж и работы с клиентами с техническими навыками в области LLM, prompt engineering и разработки MVP-продуктов.',
    '{
        "ai_llm": ["Google Gemini API", "Prompt Engineering", "System Prompt Design", "RAG Concepts", "LLM Architecture"],
        "frontend": ["React", "TypeScript", "Vite", "Tailwind CSS", "Lucide Icons"],
        "backend": ["Supabase (PostgreSQL)", "REST API", "Vercel CI/CD"],
        "platforms": ["Telegram Mini Apps", "Telegram Payments (Stars)"],
        "tools": ["Google Antigravity", "Project IDX", "Git / GitHub", "Postman"],
        "business": ["B2B Sales", "Sales Management", "Customer Development", "Process Automation", "Team Leadership"]
    }'::jsonb,
    '{
        "email": "v9253696275@gmail.com",
        "telegram": "@bondarev_vi",
        "github": "github.com/uncleshampo"
    }'::jsonb
)
ON CONFLICT DO NOTHING;
