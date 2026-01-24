const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
// require('dotenv').config(); // Not installed, using manual parsing

// Try to read .env manually if dotenv fails or path is weird
const envPath = path.resolve('C:/Users/Guilherme Dias/Desktop/xismaster-pos/.env');
let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
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
        // ignore
    }
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Could not find Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateMenu() {
    console.log('Connecting to Supabase...');
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('category')
        .order('name');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    if (!products || products.length === 0) {
        console.log('No products found.');
        return;
    }

    let markdown = '# Lista de Produtos para Ficha Técnica\n\n';
    markdown += 'Use esta lista para conferir os produtos cadastrados e anotar os ingredientes de cada um.\n\n';
    markdown += '| Categoria | Nome | Preço | Ingredientes (Preencher) |\n';
    markdown += '|---|---|---|---|\n';

    products.forEach(p => {
        markdown += `| ${p.category ? p.category.toUpperCase() : 'OUTROS'} | ${p.name} | R$ ${p.price} | |\n`;
    });

    const outputPath = 'C:/Users/Guilherme Dias/Desktop/xismaster-pos/MENU_FICHA_TECNICA.md';
    fs.writeFileSync(outputPath, markdown);
    console.log(`Lista gerada com sucesso em: ${outputPath} (${products.length} produtos)`);
}

generateMenu();
