-- 🧹 LIMPEZA TOTAL E APLICAÇÃO DA "GAIOLA DE OURO"
-- Este script APAGA TODAS as políticas antigas/duplicadas (boas e ruins)
-- e recria APENAS as regras estritas de segurança.

-- ==============================================================================
-- 1. DROP ALL EXISTING POLICIES (LIMPEZA RADICAL)
-- ==============================================================================

-- Tabela: SHIFTS
DROP POLICY IF EXISTS "Acesso total para usuários logados" ON shifts;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON shifts;
DROP POLICY IF EXISTS "Public Read Shifts" ON shifts;
DROP POLICY IF EXISTS "Staff shifts" ON shifts;
DROP POLICY IF EXISTS "shifts_delete_authenticated" ON shifts;
DROP POLICY IF EXISTS "shifts_insert_authenticated" ON shifts;
DROP POLICY IF EXISTS "shifts_select_anyone" ON shifts; -- 🚩 O CULPADO DO VAZAMENTO
DROP POLICY IF EXISTS "shifts_update_authenticated" ON shifts;

-- Tabela: ORDERS
DROP POLICY IF EXISTS "Acesso total para usuários logados" ON orders;
DROP POLICY IF EXISTS "Admin delete" ON orders;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON orders;
DROP POLICY IF EXISTS "Print Server Read Orders" ON orders; -- 🚩 VAZAMENTO
DROP POLICY IF EXISTS "Print Server Update Orders" ON orders;
DROP POLICY IF EXISTS "Public Create Orders" ON orders;
DROP POLICY IF EXISTS "Public insert" ON orders;
DROP POLICY IF EXISTS "Staff manage" ON orders;
DROP POLICY IF EXISTS "Staff update" ON orders;
DROP POLICY IF EXISTS "orders_delete_authenticated" ON orders; -- 🚩 PERMITE QUE QUALQUER UM DELETE
DROP POLICY IF EXISTS "orders_insert_anyone" ON orders;
DROP POLICY IF EXISTS "orders_select_authenticated" ON orders;
DROP POLICY IF EXISTS "orders_update_authenticated" ON orders;

-- Tabela: ORDER_ITEMS
DROP POLICY IF EXISTS "Acesso total para usuários logados" ON order_items;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON order_items;
DROP POLICY IF EXISTS "Print Server Read Items" ON order_items;
DROP POLICY IF EXISTS "Public Create OrderItems" ON order_items;
DROP POLICY IF EXISTS "Public insert items" ON order_items;
DROP POLICY IF EXISTS "Staff items" ON order_items;
DROP POLICY IF EXISTS "order_items_delete_authenticated" ON order_items;
DROP POLICY IF EXISTS "order_items_insert_anyone" ON order_items;
DROP POLICY IF EXISTS "order_items_select_authenticated" ON order_items;
DROP POLICY IF EXISTS "order_items_update_authenticated" ON order_items;

-- ==============================================================================
-- 2. RECRIAÇÃO ("GAIOLA DE OURO")
-- ==============================================================================

-- SHIFTS: Blindado (Apenas Staff)
CREATE POLICY "Staff shifts" ON shifts 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ORDERS: Insert Público (Clientes), Gestão Staff, Delete Admin
CREATE POLICY "Public insert" ON orders 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff manage" ON orders 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff update" ON orders 
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin delete" ON orders 
FOR DELETE TO authenticated 
USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- ORDER ITEMS: Igual Orders
CREATE POLICY "Public insert items" ON order_items 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff items" ON order_items 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 3. CONFIRMAÇÃO DE ADMIN
-- ==============================================================================
UPDATE profiles SET role = 'admin' WHERE email = 'admin@xismaster.com';
