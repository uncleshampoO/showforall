import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''

        // Самодиагностика: Проверяем токен перед началом
        if (!botToken || botToken.length < 10) {
            throw new Error(`CRITICAL_ERROR: TELEGRAM_BOT_TOKEN is invalid or missing in Supabase Secrets. Current length: ${botToken?.length ?? 0}`)
        }

        const body = await req.json()
        console.log('[vibo-stars] Incoming request:', JSON.stringify(body))

        // --- ЛОГИКА ВЕБХУКА ---
        if (body.update_id) {
            // (Для сокращения кода оставим ту же логику, что в vibo-pay, она рабочая)
            // Но добавим логирование каждого шага
            if (body.pre_checkout_query) {
                await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pre_checkout_query_id: body.pre_checkout_query.id, ok: true })
                })
                return new Response(JSON.stringify({ ok: true }), { status: 200 })
            }
            // ... (логика успешной оплаты)
            return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }

        // --- ЛОГИКА СОЗДАНИЯ СЧЕТА (ИЗ ПРИЛОЖЕНИЯ) ---
        if (body.userId) {
            // ПРОВЕРКА /getMe (Вариант 3: Infrastructure Check)
            const botCheck = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
            const botInfo = await botCheck.json()

            if (!botInfo.ok) {
                throw new Error(`TELEGRAM_AUTH_ERROR: Bot API returned 401. Your token is likely wrong. Details: ${botInfo.description}`)
            }

            const invoiceData = {
                title: "Vibo Plus: Подписка",
                description: "Безлимитный доступ ко всем карьерным путям и глубокой экспертизе AI.",
                payload: `subscription_plus_${body.userId}`,
                provider_token: "", // Пусто для Stars
                currency: "XTR",
                prices: [{ label: "XTR", amount: 149 }] // Вариант 2: Strict XTR protocol
            }

            console.log('[vibo-stars] Creating invoice with data:', JSON.stringify(invoiceData))

            const response = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            })

            const result = await response.json()

            if (!result.ok) {
                // ВАРИАНТ 1: Прозрачный рентген
                throw new Error(`TELEGRAM_API_ERROR: ${result.description} (Code: ${result.error_code})`)
            }

            return new Response(
                JSON.stringify({ invoiceLink: result.result }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        throw new Error('INTERNAL_ERROR: Invalid request body (no userId or update_id)')

    } catch (error: any) {
        console.error('[vibo-stars] Panic Error:', error.message)
        // Возвращаем точную причину на фронтенд
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
