import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('🔍 Checking Supabase connection...');

    // Test simple query
    const { data, error } = await supabase.from('portfolio_cv').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('❌ Connection/Query failed:', error.message);
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
            console.log('💡 Table "portfolio_cv" does not exist. Need to run SQL migrate.');
        }
    } else {
        console.log('✅ Connection successful. Tables exist.');
    }
}

check();
