-- ============================================================================
-- SCRIPT DE EMERGÊNCIA: CORREÇÃO DE PERMISSÕES (RLS) & ABERTURA DE TURNO
-- Execute isto para liberar o acesso ao Cardápio para clientes (público)
-- ============================================================================

-- A. HABILITAR ACESSO PÚBLICO (ANON)
-- Clientes não estão logados, então precisam de permissão 'anon' para ler o cardápio.

-- 1. Turnos (Para ver se a loja está aberta)
DROP POLICY IF EXISTS "Public Read Shifts" ON public.shifts;
CREATE POLICY "Public Read Shifts" ON public.shifts FOR SELECT TO anon USING (true);

-- 2. Produtos e Adicionais
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
CREATE POLICY "Public Read Products" ON public.products FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public Read Addons" ON public.addons; 
-- (Caso a tabela exista, libera leitura)
CREATE POLICY "Public Read Addons" ON public.addons FOR SELECT TO anon USING (true);

-- 3. Bairros / Taxas (Tentando ambos os nomes comuns para garantir)
DROP POLICY IF EXISTS "Public Read Neighborhoods" ON public.neighborhoods;
CREATE POLICY "Public Read Neighborhoods" ON public.neighborhoods FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public Read DeliveryAreas" ON public.delivery_areas;
CREATE POLICY "Public Read DeliveryAreas" ON public.delivery_areas FOR SELECT TO anon USING (true);

-- 4. Tags
DROP POLICY IF EXISTS "Public Read Tags" ON public.tags;
CREATE POLICY "Public Read Tags" ON public.tags FOR SELECT TO anon USING (true);

-- 5. PERMITIR CRIAR PEDIDOS (INSERT)
DROP POLICY IF EXISTS "Public Create Orders" ON public.orders;
CREATE POLICY "Public Create Orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Public Create OrderItems" ON public.order_items;
CREATE POLICY "Public Create OrderItems" ON public.order_items FOR INSERT TO anon WITH CHECK (true);


-- B. FORÇAR STATUS DA LOJA = ABERTO
-- Garante que existe um turno aberto agora.

UPDATE public.shifts SET status = 'closed', closed_at = NOW() WHERE status = 'open';

INSERT INTO public.shifts (opened_at, initial_float, status)
VALUES (NOW(), 100.00, 'open');

-- Confirmação
SELECT 'PERMISSOES CORRIGIDAS E TURNO ABERTO' as status;
