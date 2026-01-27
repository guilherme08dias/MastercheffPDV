-- DIAGNOSTICO: TESTAR O BOTAO DE ZERAR FILA (RPC)
-- 1. Primeiro, simula fila suja
UPDATE orders SET printed = false WHERE id IN (SELECT id FROM orders ORDER BY created_at DESC LIMIT 5);

-- 2. Verifica estado ANTES (Deve ter 5 'false')
SELECT 'ANTES' as status, id, printed FROM orders ORDER BY created_at DESC LIMIT 5;

-- 3. Chama a função RPC (simulando o clique do botão)
SELECT clear_print_queue();

-- 4. Verifica estado DEPOIS (Deve ter 5 'true')
SELECT 'DEPOIS' as status, id, printed FROM orders ORDER BY created_at DESC LIMIT 5;
