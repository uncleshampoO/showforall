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

        const supabase = createClient(supabaseUrl, supabaseKey)
        const body = await req.json()

        console.log('[vibo-pay] Received request:', JSON.stringify(body))

        // 1. Обработка входящего Вебхука от Telegram
        if (body.update_id) {
            // Подтверждение наличия товара (pre_checkout_query)
            if (body.pre_checkout_query) {
                await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pre_checkout_query_id: body.pre_checkout_query.id,
                        ok: true
                    })
                })
                return new Response(JSON.stringify({ ok: true }), { status: 200 })
            }

            // Успешная оплата (successful_payment)
            if (body.message?.successful_payment) {
                const payload = body.message.successful_payment.invoice_payload
                const userId = payload.replace('subscription_plus_', '')

                console.log(`[vibo-pay] Payment success for user: ${userId}`)

                // Продлеваем подписку на 30 дней
                const expirationDate = new Date()
                expirationDate.setDate(expirationDate.getDate() + 30)

                const { error } = await supabase
                    .from('vibo_profiles')
                    .update({
                        is_plus: true,
                        plus_until: expirationDate.toISOString()
                    })
                    .eq('id', userId)

                if (error) console.error('[vibo-pay] DB Update Error:', error)

                // Логируем транзакцию
                await supabase.from('vibo_transactions').insert({
                    user_id: userId,
                    amount: 149,
                    currency: 'STARS',
                    provider_payment_charge_id: body.message.successful_payment.telegram_payment_charge_id
                })

                return new Response(JSON.stringify({ ok: true }), { status: 200 })
            }

            return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }

        // 2. Обработка запроса из Приложения (создание счета)
        if (body.userId) {
            const invoiceData = {
                title: "Vibo Plus: Подписка",
                description: "Безлимитный доступ ко всем карьерным путям и глубокой экспертизе AI.",
                payload: `subscription_plus_${body.userId}`,
                provider_token: "", // Stars
                currency: "XTR",
                prices: [{ label: "Vibo Plus", amount: 149 }]
            }

            const response = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            })

            const result = await response.json()
            if (!result.ok) throw new Error(result.description)

            return new Response(
                JSON.stringify({ invoiceLink: result.result }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        throw new Error('Invalid request format')

    } catch (error: any) {
        console.error('[vibo-pay] Error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
