import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://joiyjxuooxqujvoswicp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhc2UiLCJyZWYiOiJqb2l5anh1b294cXVqdm9zd2ljcCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY3MDI2NTU2LCJleHAiOjIwODI2MDI1NTZ9.HZES8rW49RFi-1E0KNEJ33xnZ4n8DO066MVL-IFprkQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('🔍 Checking active Vibo-shark project for portfolio tables...');
    const { error } = await supabase.from('portfolio_cv').select('count', { count: 'exact', head: true });

    if (error) {
        console.log(`❌ Table not found or access denied: ${error.message}`);
    } else {
        console.log('✅ Tables FOUND in Vibo-shark project!');
    }
}

check();
