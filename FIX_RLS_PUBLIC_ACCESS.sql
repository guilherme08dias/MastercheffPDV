-- FIX RLS: Permitir leitura pública (ANON) para o Cardápio funcionar
-- O erro "Banco retornou ZERO turnos" acontece porque o usuário não logado não tem permissão de ver a tabela 'shifts'.

-- 1. Shifts (Turnos) - Essencial para "Loja Aberta/Fechada"
DROP POLICY IF EXISTS "Public read access for shifts" ON public.shifts;
CREATE POLICY "Public read access for shifts" 
ON public.shifts FOR SELECT 
TO anon, authenticated 
USING (true);

-- 2. Products (Produtos) - Essencial para listar o cardápio
DROP POLICY IF EXISTS "Public read access for products" ON public.products;
CREATE POLICY "Public read access for products" 
ON public.products FOR SELECT 
TO anon, authenticated 
USING (true);

-- 3. Addons (Adicionais)
DROP POLICY IF EXISTS "Public read access for addons" ON public.addons;
CREATE POLICY "Public read access for addons" 
ON public.addons FOR SELECT 
TO anon, authenticated 
USING (true);

-- 4. Tags (Categorias/Etiquetas)
DROP POLICY IF EXISTS "Public read access for tags" ON public.tags;
CREATE POLICY "Public read access for tags" 
ON public.tags FOR SELECT 
TO anon, authenticated 
USING (true);

-- 5. Delivery Areas (Taxas de Entrega)
DROP POLICY IF EXISTS "Public read access for delivery_areas" ON public.delivery_areas;
CREATE POLICY "Public read access for delivery_areas" 
ON public.delivery_areas FOR SELECT 
TO anon, authenticated 
USING (true);

-- 6. Neighborhoods (Bairros - Legado, mas bom garantir)
DROP POLICY IF EXISTS "Public read access for neighborhoods" ON public.neighborhoods;
CREATE POLICY "Public read access for neighborhoods" 
ON public.neighborhoods FOR SELECT 
TO anon, authenticated 
USING (true);

-- NOTA: Tabelian 'orders' continua privada (apenas autenticado ou via RPC seguro)
