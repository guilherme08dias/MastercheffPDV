-- Adicionar colunas de controle de impressão na tabela orders
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar colunas
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS printed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS print_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP;

-- 2. Criar índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_orders_printed ON orders(printed, created_at DESC);

-- 3. Atualizar pedidos existentes como já impressos (para não reimprimir tudo)
UPDATE orders SET printed = TRUE WHERE created_at < NOW();

-- 4. Comentários nas colunas
COMMENT ON COLUMN orders.printed IS 'Indica se o pedido já foi impresso no servidor de impressão';
COMMENT ON COLUMN orders.print_attempts IS 'Número de tentativas de impressão (para debug)';
COMMENT ON COLUMN orders.printed_at IS 'Data e hora da última impressão';
