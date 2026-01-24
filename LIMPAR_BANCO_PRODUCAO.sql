
-- ⚠️ PERIGO: ESTE SCRIPT APAGA TODOS OS DADOS DE VENDAS E CAIXA!
-- USE APENAS ANTES DE ENTRAR EM PRODUÇÃO PARA LIMPAR DADOS DE TESTE.

-- Desabilitar triggers temporariamente para evitar erros de integridade
SET session_replication_role = 'replica';

-- Limpar tabelas de movimento (transacionais)
TRUNCATE TABLE public.order_items CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.expenses CASCADE;
TRUNCATE TABLE public.shifts CASCADE;

-- Reiniciar sequências (opcional, para os IDs voltarem a 1 se forem serial)
-- Nota: Se usar UUIDs, isso não é necessário, mas mal não faz.

-- Reabilitar triggers
SET session_replication_role = 'origin';

-- Confirmação
SELECT 'Banco de dados limpo com sucesso! Pronto para produção.' as status;
