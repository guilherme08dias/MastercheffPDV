-- Migration: Add financial columns to shifts table for Cash Closure Sub-report
-- Run this in Supabase SQL Editor

-- 1. Opening Balance (pode ser redundante com initial_float, mas solicitado especificamente)
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(10,2) DEFAULT 0;

-- 2. Cash Sales Total (Total de vendas em dinheiro no turno)
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cash_sales_total DECIMAL(10,2) DEFAULT 0;

-- 3. Final Balance (Saldo final em gaveta: opening + cash_sales)
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS final_balance DECIMAL(10,2) DEFAULT 0;

-- Comments
COMMENT ON COLUMN shifts.opening_balance IS 'Saldo inicial da gaveta (mesmo que initial_float, mas explícito para relatórios)';
COMMENT ON COLUMN shifts.cash_sales_total IS 'Total de vendas realizadas em dinheiro neste turno';
COMMENT ON COLUMN shifts.final_balance IS 'Saldo final esperado na gaveta (opening_balance + cash_sales_total)';
