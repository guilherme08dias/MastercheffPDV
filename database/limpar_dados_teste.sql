-- ============================================================================
-- SCRIPT DE LIMPEZA DE DADOS DE TESTE (CORRIGIDO)
-- ============================================================================
-- ATENÇÃO: Este script APAGA TODOS os registros de vendas, caixas e despesas.
-- Ele usa "RESTART IDENTITY" para reiniciar os contadores (IDs) automaticamente.
-- ============================================================================

-- Limpar todas as tabelas transacionais e reiniciar os IDs (Sequences)
-- O CASCADE garante que tabelas dependentes (como order_items) também sejam limpas.

TRUNCATE TABLE 
  public.order_items, 
  public.orders, 
  public.expenses, 
  public.shifts 
RESTART IDENTITY CASCADE;

-- Confirmação visual
SELECT 'Dados de teste limpos e contadores reiniciados com sucesso!' as status;
