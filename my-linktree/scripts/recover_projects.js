import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !rawKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, rawKey);

async function recover() {
    console.log('🔄 Fetching projects from Supabase...');
    const { data: projects, error } = await supabase
        .from('portfolio_projects')
        .select('*')
        .order('created_at', { ascending: true }); // Order by creation to match old order or use a specific logic

    if (error) {
        console.error('❌ Failed to fetch:', error);
        return;
    }

    if (!projects || projects.length === 0) {
        console.log('⚠️ No projects found in DB.');
        return;
    }

    const mappedProjects = projects.map(p => ({
        id: p.id_str || p.id,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        stack: p.stack,
        features: p.features,
        status: p.status,
        demoUrl: p.demo_url,
        repoUrl: p.repo_url,
        image: p.image_url
    }));

    const outputPath = path.resolve(__dirname, '../src/data/projects.json');
    fs.writeFileSync(outputPath, JSON.stringify(mappedProjects, null, 4), 'utf8');
    console.log(`✅ Successfully recovered ${mappedProjects.length} projects to src/data/projects.json`);
}

recover();
