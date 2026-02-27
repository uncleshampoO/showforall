import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Initialize with safety - if keys missing, client will be null or dummy
let supabaseClient;
try {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase credentials missing. App will run in offline mode.');
        supabaseClient = {
            from: () => ({
                select: () => ({
                    order: () => ({ limit: () => ({ single: () => ({ data: null, error: { message: 'Offline' } }) }) }),
                    limit: () => ({ single: () => ({ data: null, error: { message: 'Offline' } }) }),
                    single: () => ({ data: null, error: { message: 'Offline' } })
                }),
                invoke: () => Promise.resolve({ data: null, error: { message: 'Offline' } })
            }),
            functions: {
                invoke: () => Promise.resolve({ data: null, error: { message: 'Offline' } })
            }
        };
    } else {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    }
} catch (e) {
    console.error('Failed to initialize Supabase client:', e);
    supabaseClient = null;
}

export const supabase = supabaseClient

// Helper functions for portfolio data
export async function getPortfolioCV() {
    const { data, error } = await supabase
        .from('portfolio_cv')
        .select('*')
        .limit(1)
        .single()

    if (error) {
        console.error('Error fetching CV:', error)
        return null
    }
    return data
}

export async function getPortfolioProjects() {
    const { data, error } = await supabase
        .from('portfolio_projects')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects:', error)
        return []
    }
    return data
}

export async function getTaskHistory(limit = 30) {
    const { data, error } = await supabase
        .from('task_history')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching task history:', error)
        return []
    }
    return data
}
