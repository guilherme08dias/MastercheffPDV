-- VERIFICAÇÃO DE STATUS DO RLS
-- Execute este script para ver se a segurança está ATIVADA ou DESATIVADA.

SELECT 
    tablename, 
    rowsecurity AS rls_enabled 
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND tablename IN ('orders', 'shifts', 'order_items');
