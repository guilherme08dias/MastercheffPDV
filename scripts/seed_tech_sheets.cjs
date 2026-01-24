const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual .env parser
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envConfig = envContent.split('\n').reduce((acc, line) => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        acc[key.trim()] = values.join('=').trim().replace(/"/g, '').replace(/\r/g, ''); // Remove quotes and CR
    }
    return acc;
}, {});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- STARTING SEED (CommonJS) ---');

    // 1. Fetch Stock Items
    const { data: stockItems, error: stockError } = await supabase.from('stock_items').select('*');
    if (stockError) throw stockError;
    console.log(`Found ${stockItems.length} stock items.`);

    const findStock = (partialName) => stockItems.find(i => i.name.toLowerCase().includes(partialName.toLowerCase()));

    // 2. Fetch Products
    const { data: products, error: productError } = await supabase.from('products').select('*');
    if (productError) throw productError;
    console.log(`Found ${products.length} products.`);

    // 3. Define Logic
    const recipes = [];

    products.forEach(p => {
        const ingredients = [];
        const name = p.name.toLowerCase();
        const cat = p.category;

        // --- XIS LOGIC ---
        if (cat === 'xis') {
            const pao = findStock('Pão');
            if (pao) ingredients.push({ id: pao.id, qty: 1 });

            const maionese = findStock('Maionese');
            if (maionese) ingredients.push({ id: maionese.id, qty: 1 });

            if (!name.includes('simples') && !name.includes('burguer')) {
                const alface = findStock('Alface');
                if (alface) ingredients.push({ id: alface.id, qty: alface.unit === 'kg' ? 0.03 : 2 });

                const tomate = findStock('Tomate');
                if (tomate) ingredients.push({ id: tomate.id, qty: 0.05 });

                const milho = findStock('Milho');
                if (milho) ingredients.push({ id: milho.id, qty: 0.03 });

                const ervilha = findStock('Ervilha');
                if (ervilha) ingredients.push({ id: ervilha.id, qty: 0.03 });
            }

            if (name.includes('bacon')) {
                const bacon = findStock('Bacon');
                if (bacon) ingredients.push({ id: bacon.id, qty: 0.05 });
            }

            if (name.includes('frango')) {
                const frango = findStock('Frango');
                if (frango) ingredients.push({ id: frango.id, qty: 0.15 });
            } else if (name.includes('coração') || name.includes('coracao')) {
                const coracao = findStock('Coração');
                if (coracao) ingredients.push({ id: coracao.id, qty: 0.15 });
            } else if (name.includes('filé') || name.includes('file')) {
                const file = findStock('Filé');
                if (file) ingredients.push({ id: file.id, qty: 0.15 });
            } else {
                if (!name.includes('vegetariano')) {
                    const burger = findStock('Hambúrguer') || findStock('Carne');
                    if (burger) ingredients.push({ id: burger.id, qty: 1 });
                }
            }

            if (name.includes('calabresa')) {
                const calabresa = findStock('Calabresa');
                if (calabresa) ingredients.push({ id: calabresa.id, qty: 0.1 });
            }

            const ovo = findStock('Ovo');
            if (ovo && !name.includes('simples')) ingredients.push({ id: ovo.id, qty: 1 });

            const presunto = findStock('Presunto');
            if (presunto) ingredients.push({ id: presunto.id, qty: 0.04 });

            const queijo = findStock('Mussarela') || findStock('Queijo');
            if (queijo) ingredients.push({ id: queijo.id, qty: 0.04 });
        }

        // --- DOG LOGIC ---
        if (cat === 'dog') {
            const paoDog = findStock('Pão de Dog') || findStock('Pão');
            if (paoDog) ingredients.push({ id: paoDog.id, qty: 1 });

            const salsicha = findStock('Salsicha');
            if (salsicha) {
                if (salsicha.unit === 'kg') ingredients.push({ id: salsicha.id, qty: 0.1 }); // 100g = 2 salsichas aprox
                else ingredients.push({ id: salsicha.id, qty: 2 });
            }

            const milho = findStock('Milho');
            if (milho) ingredients.push({ id: milho.id, qty: 0.03 });
            const ervilha = findStock('Ervilha');
            if (ervilha) ingredients.push({ id: ervilha.id, qty: 0.03 });
        }

        if (ingredients.length > 0) {
            recipes.push({
                product_id: p.id,
                product_name: p.name,
                ingredients
            });
        }
    });

    console.log(`Prepared recipes for ${recipes.length} products.`);

    for (const r of recipes) {
        console.log(`Processing ${r.product_name}...`);
        await supabase.from('product_ingredients').delete().eq('product_id', r.product_id);

        const payload = r.ingredients.map(i => ({
            product_id: r.product_id,
            stock_item_id: i.id,
            quantity: i.qty
        }));

        const { error } = await supabase.from('product_ingredients').insert(payload);
        if (error) console.error(`Error inserting for ${r.product_name}:`, error);
    }

    console.log('--- SEED COMPLETED ---');
}

main().catch(console.error);
