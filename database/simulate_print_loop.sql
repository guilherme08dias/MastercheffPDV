-- SIMULACAO DE LOOP DE IMPRESSAO
-- Marca os últimos 5 pedidos como "NÃO IMPRESSOS" para simular uma fila travada.
-- CUIDADO: Isso pode fazer a impressora imprimir de verdade se estiver ligada!

UPDATE orders
SET printed = false,
    print_attempts = 0
WHERE id IN (
    SELECT id FROM orders 
    ORDER BY created_at DESC 
    LIMIT 5
);

-- Verifica o resultado
SELECT id, customer_name, printed FROM orders ORDER BY created_at DESC LIMIT 5;
