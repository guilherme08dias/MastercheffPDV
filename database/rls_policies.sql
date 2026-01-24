-- ============================================================
-- MASTERCHEFF PRO - ROW LEVEL SECURITY (RLS)
-- Execute este script no Supabase SQL Editor
-- Data: 24/01/2026
-- ============================================================

-- ============================================================
-- 1. ATIVAÇÃO DO RLS NAS TABELAS PRINCIPAIS
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. POLÍTICAS PARA TABELA 'ORDERS'
-- ============================================================

-- 2.1 Permitir que QUALQUER pessoa crie um pedido (Link do Cliente - anon)
-- Isso é necessário para o Cardápio Online funcionar sem login
CREATE POLICY "orders_insert_anyone" ON orders 
FOR INSERT 
WITH CHECK (true);

-- 2.2 Permitir que usuários autenticados vejam TODOS os pedidos
CREATE POLICY "orders_select_authenticated" ON orders 
FOR SELECT 
TO authenticated 
USING (true);

-- 2.3 Permitir que usuários autenticados atualizem pedidos
CREATE POLICY "orders_update_authenticated" ON orders 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2.4 Permitir DELETE apenas para usuários autenticados (operadores/admins)
-- Obs: Para restringir apenas admins, seria necessário JWT claims customizados
CREATE POLICY "orders_delete_authenticated" ON orders 
FOR DELETE 
TO authenticated 
USING (true);

-- ============================================================
-- 3. POLÍTICAS PARA TABELA 'ORDER_ITEMS'
-- ============================================================

-- 3.1 Permitir que QUALQUER pessoa insira itens (junto com o pedido do link)
CREATE POLICY "order_items_insert_anyone" ON order_items 
FOR INSERT 
WITH CHECK (true);

-- 3.2 Permitir que usuários autenticados vejam itens
CREATE POLICY "order_items_select_authenticated" ON order_items 
FOR SELECT 
TO authenticated 
USING (true);

-- 3.3 Permitir que usuários autenticados atualizem itens
CREATE POLICY "order_items_update_authenticated" ON order_items 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3.4 Permitir que usuários autenticados deletem itens
CREATE POLICY "order_items_delete_authenticated" ON order_items 
FOR DELETE 
TO authenticated 
USING (true);

-- ============================================================
-- 4. POLÍTICAS PARA TABELA 'SHIFTS' (CAIXA)
-- ============================================================

-- 4.1 Permitir que QUALQUER pessoa veja o status do caixa (para mostrar "Aberto/Fechado")
CREATE POLICY "shifts_select_anyone" ON shifts 
FOR SELECT 
USING (true);

-- 4.2 Apenas autenticados podem criar/abrir caixa
CREATE POLICY "shifts_insert_authenticated" ON shifts 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4.3 Apenas autenticados podem atualizar/fechar caixa
CREATE POLICY "shifts_update_authenticated" ON shifts 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4.4 Apenas autenticados podem deletar turnos (raro, mas necessário)
CREATE POLICY "shifts_delete_authenticated" ON shifts 
FOR DELETE 
TO authenticated 
USING (true);

-- ============================================================
-- 5. POLÍTICAS PARA TABELA 'PRODUCTS' (se existir)
-- ============================================================

-- Verificar se RLS já está ativo
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'products') THEN
        EXECUTE 'ALTER TABLE products ENABLE ROW LEVEL SECURITY';
        
        -- Qualquer pessoa pode ver produtos (cardápio público)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'products_select_anyone') THEN
            EXECUTE 'CREATE POLICY "products_select_anyone" ON products FOR SELECT USING (true)';
        END IF;
        
        -- Apenas autenticados podem gerenciar produtos
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'products_manage_authenticated') THEN
            EXECUTE 'CREATE POLICY "products_manage_authenticated" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true)';
        END IF;
    END IF;
END $$;

-- ============================================================
-- 6. POLÍTICAS PARA TABELA 'DELIVERY_AREAS' (se existir)
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'delivery_areas') THEN
        EXECUTE 'ALTER TABLE delivery_areas ENABLE ROW LEVEL SECURITY';
        
        -- Qualquer pessoa pode ver áreas de entrega (para o checkout)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_areas_select_anyone') THEN
            EXECUTE 'CREATE POLICY "delivery_areas_select_anyone" ON delivery_areas FOR SELECT USING (true)';
        END IF;
        
        -- Apenas autenticados podem gerenciar
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_areas_manage_authenticated') THEN
            EXECUTE 'CREATE POLICY "delivery_areas_manage_authenticated" ON delivery_areas FOR ALL TO authenticated USING (true) WITH CHECK (true)';
        END IF;
    END IF;
END $$;

-- ============================================================
-- 7. POLÍTICAS PARA TABELA 'ADDONS' (se existir)
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'addons') THEN
        EXECUTE 'ALTER TABLE addons ENABLE ROW LEVEL SECURITY';
        
        -- Qualquer pessoa pode ver adicionais
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'addons_select_anyone') THEN
            EXECUTE 'CREATE POLICY "addons_select_anyone" ON addons FOR SELECT USING (true)';
        END IF;
        
        -- Apenas autenticados podem gerenciar
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'addons_manage_authenticated') THEN
            EXECUTE 'CREATE POLICY "addons_manage_authenticated" ON addons FOR ALL TO authenticated USING (true) WITH CHECK (true)';
        END IF;
    END IF;
END $$;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
-- Execute esta query para verificar as políticas criadas:
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public';

-- ============================================================
-- NOTA IMPORTANTE
-- ============================================================
-- O Link do Cliente (Cardapio.tsx) usa a chave ANON do Supabase.
-- As políticas acima permitem INSERT de orders e order_items
-- para usuários não autenticados (anon), garantindo que o
-- checkout público continue funcionando.
--
-- O POS e Dashboard usam usuários autenticados, que têm
-- permissão total de leitura e escrita.
-- ============================================================
