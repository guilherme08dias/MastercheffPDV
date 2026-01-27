-- CORREÇÃO PARA IMPRESSORA E INSERÇÃO DE PEDIDOS
-- 1. Cria função RPC para inserir pedidos (Cardapio.tsx)
CREATE OR REPLACE FUNCTION create_web_order(
    p_customer_name text,
    p_customer_phone text,
    p_order_type text,
    p_neighborhood_id uuid,
    p_delivery_fee numeric,
    p_payment_method text,
    p_items jsonb,
    p_address_street text DEFAULT NULL,
    p_address_number text DEFAULT NULL,
    p_address_complement text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com permissoes de admin (bypassa RLS)
AS $$
DECLARE
    v_shift_id uuid;
    v_daily_number integer;
    v_order_id bigint;
    v_total numeric := 0;
    v_item jsonb;
BEGIN
    -- 1. Obter o turno aberto atual
    SELECT id INTO v_shift_id FROM shifts WHERE status = 'open' LIMIT 1;

    -- 2. Calcular o próximo daily_number (baseado na data atual)
    SELECT COALESCE(MAX(daily_number), 0) + 1 INTO v_daily_number
    FROM orders
    WHERE created_at >= CURRENT_DATE;
    
    -- Calcular total básico (se vier zerado do frontend, recálculo aqui seria ideal, mas confiamos no client por enquanto)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_total := v_total + (COALESCE((v_item->>'unit_price')::numeric, 0) * COALESCE((v_item->>'quantity')::numeric, 0));
    END LOOP;
    v_total := v_total + COALESCE(p_delivery_fee, 0);

    -- 3. Inserir Pedido
    INSERT INTO orders (
        shift_id,
        customer_name,
        customer_phone,
        type,
        neighborhood_id,
        delivery_fee_snapshot,
        payment_method,
        total,
        status,
        daily_number,
        address_street,
        address_number,
        address_complement,
        origin
    ) VALUES (
        v_shift_id,
        p_customer_name,
        p_customer_phone,
        p_order_type,
        p_neighborhood_id,
        p_delivery_fee,
        p_payment_method,
        v_total,
        'pending',
        v_daily_number,
        p_address_street,
        p_address_number,
        p_address_complement,
        'web'
    ) RETURNING id INTO v_order_id;

    -- 4. Inserir Itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            notes
        ) VALUES (
            v_order_id,
            (v_item->>'product_id')::uuid,
            (v_item->>'quantity')::integer,
            (v_item->>'unit_price')::numeric,
            v_item->>'notes'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'id', v_order_id,
        'daily_number', v_daily_number,
        'message', 'Pedido criado com sucesso'
    );
END;
$$;

-- Permissoes para create_web_order
GRANT EXECUTE ON FUNCTION create_web_order TO anon;
GRANT EXECUTE ON FUNCTION create_web_order TO authenticated;
GRANT EXECUTE ON FUNCTION create_web_order TO service_role;


-- 2. Cria função RPC para marcar pedido como impresso (print-server.html)
CREATE OR REPLACE FUNCTION mark_order_printed(p_order_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE orders 
    SET printed = true, 
        printed_at = NOW(),
        print_attempts = COALESCE(print_attempts, 0) + 1
    WHERE id = p_order_id;
END;
$$;

-- Permissoes para mark_order_printed
GRANT EXECUTE ON FUNCTION mark_order_printed TO anon;
GRANT EXECUTE ON FUNCTION mark_order_printed TO authenticated;
GRANT EXECUTE ON FUNCTION mark_order_printed TO service_role;


-- 3. Policy "Printer Friendly" (Permite que ANON veja pedidos não impressos para o Realtime funcionar)
CREATE POLICY "Printer read unprinted" ON orders
FOR SELECT
TO anon
USING (printed = false);

CREATE POLICY "Printer read items unprinted" ON order_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.printed = false
  )
);
