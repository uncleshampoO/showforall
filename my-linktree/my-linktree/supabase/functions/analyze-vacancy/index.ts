// Supabase Edge Function: analyze-vacancy
// Reads CV and task history from database, uses Gemini to analyze job match
// Deploy: supabase functions deploy analyze-vacancy

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { vacancy } = await req.json()

        if (!vacancy || vacancy.trim().length < 10) {
            return new Response(
                JSON.stringify({ error: 'Vacancy text is required (min 10 chars)' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get CV data
        const { data: cvData, error: cvError } = await supabase
            .from('portfolio_cv')
            .select('*')
            .limit(1)
            .single()

        if (cvError || !cvData) {
            console.error('CV fetch error:', cvError)
            return new Response(
                JSON.stringify({ error: 'Failed to load CV data' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get recent task history for context
        const { data: taskHistory } = await supabase
            .from('task_history')
            .select('task_name, category, skills_used, outcome')
            .order('date', { ascending: false })
            .limit(30)

        // Initialize Gemini
        const geminiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiKey) {
            return new Response(
                JSON.stringify({ error: 'Gemini API key not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        // Build prompt with CV and task history
        const taskSummary = taskHistory?.length
            ? `\n\nНедавние рабочие задачи кандидата:\n${taskHistory.map(t =>
                `- ${t.task_name} (${t.category}): ${t.skills_used?.join(', ')}`
            ).join('\n')}`
            : ''

        const prompt = `Ты — AI HR-ассистент. Проанализируй соответствие кандидата вакансии.

ПРОФИЛЬ КАНДИДАТА:
Имя: ${cvData.name}
Должность: ${cvData.title}
Резюме: ${cvData.summary}

Технологии:
${Object.entries(cvData.stack || {}).map(([cat, skills]: [string, any]) =>
            `- ${cat}: ${Array.isArray(skills) ? skills.join(', ') : skills}`
        ).join('\n')}
${taskSummary}

ВАКАНСИЯ:
${vacancy}

Проанализируй и верни JSON:
{
  "matchScore": число от 0 до 100,
  "matchingSkills": ["навык1", "навык2", ...],
  "gaps": ["чего не хватает1", ...],
  "strengths": ["сильные стороны для этой роли"],
  "recommendation": "краткая рекомендация для HR",
  "salaryFit": "оценка соответствия зарплатных ожиданий если указаны"
}

Отвечай ТОЛЬКО валидным JSON без markdown.`

        const result = await model.generateContent(prompt)
        const text = result.response.text()

        // Parse JSON response
        let analysis
        try {
            // Clean potential markdown
            const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            analysis = JSON.parse(cleanJson)
        } catch {
            analysis = {
                matchScore: 0,
                matchingSkills: [],
                gaps: [],
                strengths: [],
                recommendation: text,
                salaryFit: 'Не определено'
            }
        }

        return new Response(
            JSON.stringify(analysis),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Edge function error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
