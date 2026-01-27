-- ==============================================================================
-- 🛡️ DATABASE SECURITY: ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Este arquivo contém as instruções SQL para ativar a segurança no nível do banco de dados.
-- Execute este script no SQL Editor do seu Supabase Dashboard.

-- 1. ATIVAÇÃO DE RLS (Segurança a Nível de Linha)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. POLÍTICAS PARA 'ORDERS' (PEDIDOS)
-- ==============================================================================

-- A. Public Insert: Permite que qualquer pessoa (cliente) envie um pedido (Insert)
-- Nota: O cliente não precisa estar logado para comprar.
DROP POLICY IF EXISTS "Public insert" ON orders;
CREATE POLICY "Public insert" ON orders 
FOR INSERT 
WITH CHECK (true);

-- B. Staff Manage (Visualizar/Editar): Permite que staff autenticado gerencie pedidos
-- IMPORTANTE: Usamos SELECT, UPDATE, INSERT para garantir que eles não possam deletar (apenas Admin)
DROP POLICY IF EXISTS "Staff manage" ON orders;
CREATE POLICY "Staff manage" ON orders 
FOR SELECT
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Staff update" ON orders;
CREATE POLICY "Staff update" ON orders 
FOR UPDATE
TO authenticated 
USING (true)
WITH CHECK (true);

-- C. Admin Delete: Apenas Admin pode apagar pedidos
-- Verificação via tabela de profiles para segurança robusta
DROP POLICY IF EXISTS "Admin delete" ON orders;
CREATE POLICY "Admin delete" ON orders 
FOR DELETE 
TO authenticated 
USING (
  -- Verifica se o ID do usuário atual tem role 'admin' na tabela profiles
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- ==============================================================================
-- 3. POLÍTICAS PARA 'ORDER_ITEMS' (ITENS DO PEDIDO)
-- ==============================================================================
-- Necessário pois RLS foi ativado para esta tabela também.

-- A. Public Insert Items
DROP POLICY IF EXISTS "Public insert items" ON order_items;
CREATE POLICY "Public insert items" ON order_items 
FOR INSERT 
WITH CHECK (true);

-- B. Staff Manage Items (Ver/Editar)
DROP POLICY IF EXISTS "Staff items" ON order_items;
CREATE POLICY "Staff items" ON order_items 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 4. POLÍTICAS PARA 'SHIFTS' (TURNOS/CAIXA)
-- ==============================================================================

-- A. Staff Shifts: Apenas staff autenticado pode ver e gerenciar turnos
DROP POLICY IF EXISTS "Staff shifts" ON shifts;
CREATE POLICY "Staff shifts" ON shifts 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- ==============================================================================
-- 5. CORREÇÃO DE PERMISSÕES (ADMIN SETUP)
-- ==============================================================================
-- Garante que o usuário admin principal tenha a role correta no banco para poder deletar
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@xismaster.com';
