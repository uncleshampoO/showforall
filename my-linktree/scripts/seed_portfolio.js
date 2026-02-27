import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const rawKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)?.trim();

if (!supabaseUrl || !rawKey) {
    console.error('❌ Missing Supabase credentials in .env');
    console.log('💡 TIP: Make sure SUPABASE_SERVICE_ROLE_KEY is uncommented in your .env file for seeding.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, rawKey);

async function seed() {
    console.log('🚀 Starting LinkTree seeding (HARDCODED MODE)...');
    console.log(`🔗 Target URL: ${supabaseUrl}`);
    console.log(`🔑 Key starts with: ${rawKey?.substring(0, 10)}...`);
    console.log(`🔑 Key ends with: ...${rawKey?.substring(rawKey.length - 10)}`);
    console.log(`🔑 Key length: ${rawKey?.length}`);

    try {
        // 1. Seed CV
        const cvPath = path.resolve(__dirname, '../src/data/cv.json');
        const cvData = JSON.parse(fs.readFileSync(cvPath, 'utf8'));

        console.log('📄 Seeding CV data...');
        const { error: cvError } = await supabase
            .from('portfolio_cv')
            .upsert({ id: 1, ...cvData }); // Assuming single CV entry with ID 1

        if (cvError) throw cvError;
        console.log('✅ CV seeded successfully');

        // 2. Seed Projects
        const projectsPath = path.resolve(__dirname, '../src/data/projects.json');
        const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

        console.log(`🚀 Seeding ${projectsData.length} projects...`);
        const { error: projectsError } = await supabase
            .from('portfolio_projects')
            .upsert(projectsData.map(p => ({
                id_str: p.id,
                name: p.name,
                tagline: p.tagline,
                description: p.description,
                stack: p.stack,
                features: p.features,
                status: p.status,
                demo_url: p.demoUrl,
                repo_url: p.repoUrl,
                image_url: p.image || null
            })));

        if (projectsError) throw projectsError;
        console.log('✅ Projects seeded successfully');

        console.log('🎉 Seeding complete!');
    } catch (err) {
        console.error('❌ Seeding failed:');
        console.error(err);
        if (err.message === 'Invalid API key') {
            console.log('🔍 Diagnosis: This is a strict Auth error. Check if your Supabase project is active or if the key was copied correctly.');
        }
    }
}

seed();
