import { createClient } from '@supabase/supabase-js'

const sharkUrl = import.meta.env.VITE_SHARK_SUPABASE_URL
const sharkAnonKey = import.meta.env.VITE_SHARK_SUPABASE_ANON_KEY

const sharkClient = (sharkUrl && sharkAnonKey)
    ? createClient(sharkUrl, sharkAnonKey)
    : null;

export const sharkService = {
    async getStatsSummary() {
        if (!sharkClient) return null;

        try {
            // Demo User ID (the one with seeded data)
            const demoUserId = '4849646c-7e6d-4952-b918-693bd8f02901';

            // Fetch deals for forecasting
            const { data: deals, error: dealsError } = await sharkClient
                .from('deals')
                .select('*')
                .eq('user_id', demoUserId)
                .not('stage', 'in', '(archived,deleted)');

            if (dealsError) throw dealsError;

            // Calculate metrics (same logic as in Vibo Shark App)
            const weights = {
                analysis: 0.1,
                requisites: 0.3,
                closing: 0.6,
                payment: 0.9,
            };

            const forecast = deals?.reduce((acc, deal) => {
                const weight = weights[deal.stage] || 0;
                return acc + (deal.revenue || 0) * weight;
            }, 0) || 0;

            const totalRevenue = deals?.reduce((acc, deal) => acc + (deal.revenue || 0), 0) || 0;

            // Funnel stats
            const funnel = {
                analysis: deals?.filter(d => d.stage === 'analysis').length || 0,
                requisites: deals?.filter(d => d.stage === 'requisites').length || 0,
                closing: deals?.filter(d => d.stage === 'closing').length || 0,
                payment: deals?.filter(d => d.stage === 'payment').length || 0,
            };

            return {
                forecast: Math.round(forecast),
                totalRevenue,
                dealCount: deals?.length || 0,
                funnel,
                health: 85 // Mock health for now or calculate from engagement scores if available
            };
        } catch (e) {
            console.error('Shark Service Error:', e);
            return null;
        }
    }
}
