import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Load env vars from .env file manually if needed, or rely on process.env
// Assuming .env is in root C:/Users/Guilherme Dias/Desktop/xismaster-pos/.env
// But I don't have direct access to read .env and parse it easily in this environment without a library typically.
// However, the project uses Vite, so it likely has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
// I will try to read the .env file to get credentials.

const envPath = path.resolve('C:/Users/Guilherme Dias/Desktop/xismaster-pos/.env');
let supabaseUrl = '';
let supabaseKey = '';

try {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    const lines = envConfig.split('\n');
    for (const line of lines) {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].replace(/"/g, '').replace(/'/g, '').trim();
        }
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].replace(/"/g, '').replace(/'/g, '').trim();
        }
    }
} catch (e) {
    console.error('Error reading .env file', e);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Could not find Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateMenu() {
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('category')
        .order('name');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    let markdown = '# Lista de Produtos para Ficha Técnica\n\n';
    markdown += 'Use esta lista para conferir os produtos cadastrados e anotar os ingredientes de cada um.\n\n';
    markdown += '| Categoria | Nome | Ingredientes (Preencher) |\n';
    markdown += '|---|---|---|\n';

    products.forEach(p => {
        markdown += `| ${p.category.toUpperCase()} | ${p.name} | |\n`;
    });

    const outputPath = 'C:/Users/Guilherme Dias/Desktop/xismaster-pos/MENU_FICHA_TECNICA.md';
    fs.writeFileSync(outputPath, markdown);
    console.log(`Lista gerada em: ${outputPath}`);
}

generateMenu();
