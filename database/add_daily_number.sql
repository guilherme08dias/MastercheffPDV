-- Adicionar coluna para número do pedido no turno (que reseta)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS daily_number INTEGER;

-- Atualizar pedidos existentes (opcional, apenas para não ficar null)
UPDATE public.orders SET daily_number = id WHERE daily_number IS NULL;
