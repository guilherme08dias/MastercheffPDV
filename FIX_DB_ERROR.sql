-- FIX PARA ERRO: record "new" has no field "updated_at"
-- Este erro ocorre porque algum "Trigger" (gatilho) do banco está tentando atualizar a data de modificação
-- em uma tabela que NÃO tem a coluna 'updated_at'.

-- 1. Adicionar updated_at na tabela order_items (Provável causador)
ALTER TABLE IF EXISTS public.order_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Adicionar updated_at na tabela stock_items (Possível causador secundário)
ALTER TABLE IF EXISTS public.stock_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. Adicionar updated_at na tabela products (Garantia)
ALTER TABLE IF EXISTS public.products 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 4. Revalidar permissões
GRANT ALL ON public.order_items TO postgres, service_role, authenticated, anon;
GRANT ALL ON public.stock_items TO postgres, service_role, authenticated, anon;
