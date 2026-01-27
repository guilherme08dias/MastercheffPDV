-- DIAGNOSTICO DE FALHA DE INSERT (CORRIGIDO)
-- Cast explícito para evitar erro de tipos (Array vs Text)

SELECT 
    '1. POLICIES ESTRUTURAIS'::text as check_type,
    tablename::text, 
    policyname::text, 
    roles::text,     -- Cast array to text
    cmd::text, 
    qual::text, 
    with_check::text
FROM pg_policies 
WHERE tablename = 'orders'

UNION ALL

SELECT 
    '2. PERMISSOES DE GRANT'::text as check_type,
    table_name::text, 
    grantee::text, 
    privilege_type::text, 
    'GRANT'::text as cmd,
    'N/A'::text as qual,
    'N/A'::text as with_check
FROM information_schema.role_table_grants 
WHERE table_name = 'orders' AND grantee IN ('anon', 'authenticated', 'service_role')

UNION ALL

SELECT 
    '3. ATIVACAO RLS'::text as check_type,
    tablename::text, 
    rowsecurity::text, 
    'N/A'::text, 
    'N/A'::text, 
    'N/A'::text, 
    'N/A'::text
FROM pg_tables 
WHERE tablename = 'orders';
