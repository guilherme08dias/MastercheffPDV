-- LISTAR TODAS AS POLÍTICAS DE SEGURANÇA ATIVAS
-- Execute este script para ver EXATAMENTE quais regras estão permitindo acesso.

SELECT 
    tablename, 
    policyname, 
    roles, 
    cmd AS operation, 
    qual AS condition,
    with_check AS check_condition
FROM 
    pg_policies 
WHERE 
    tablename IN ('orders', 'shifts', 'order_items')
ORDER BY 
    tablename, policyname;
