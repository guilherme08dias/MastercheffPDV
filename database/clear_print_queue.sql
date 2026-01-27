-- LIMPAR FILA DE IMPRESSAO
-- Marca todos os pedidos pendentes como "impresso" para parar de sair papel.

UPDATE orders 
SET printed = true, 
    printed_at = NOW() 
WHERE printed = false;
