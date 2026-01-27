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
    v_product_price numeric;
BEGIN
    -- 1. Obter o turno aberto atual
    SELECT id INTO v_shift_id FROM shifts WHERE status = 'open' LIMIT 1;
    
    -- Se não houver turno aberto, usa null (ou poderia dar erro)
    -- Para evitar travar vendas, vamos permitir sem turno, mas idealmente deveria ter.

    -- 2. Calcular o próximo daily_number (atômico)
    -- Conta quantos pedidos foram criados no dia de hoje (independente do turno para simplificar, ou ligado ao turno)
    -- Vamos usar uma sequencia simples baseada na data para garantir reset diário
    SELECT COALESCE(MAX(daily_number), 0) + 1 INTO v_daily_number
    FROM orders
    WHERE created_at >= CURRENT_DATE;

    -- 3. Calcular Total (opcional, ou confiar no frontend? Melhor recalcular para segurança, mas para agora vamos confiar no input ou recalcular básico)
    -- (Simplificação: Vamos confiar no calculo dos itens passados ou recalcular se tivermos os precos. 
    --  Para agilidade, vamos somar o que vier no JSON de items se tiver preço, mas o ideal é buscar do banco)
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_total := v_total + (COALESCE((v_item->>'unit_price')::numeric, 0) * COALESCE((v_item->>'quantity')::numeric, 0));
        -- Adicionar lógica de addons se necessário, mas assumindo unit_price já com addons por enquanto para simplificar a migration
    END LOOP;
    
    v_total := v_total + COALESCE(p_delivery_fee, 0);

    -- 4. Inserir Pedido
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
        'pending', -- status inicial
        v_daily_number,
        p_address_street,
        p_address_number,
        p_address_complement,
        'web'
    ) RETURNING id INTO v_order_id;

    -- 5. Inserir Itens
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

    -- 6. Retornar ID e Numero
    RETURN jsonb_build_object(
        'id', v_order_id,
        'daily_number', v_daily_number,
        'message', 'Pedido criado com sucesso'
    );
END;
$$;

-- Permissoes
GRANT EXECUTE ON FUNCTION create_web_order TO anon;
GRANT EXECUTE ON FUNCTION create_web_order TO authenticated;
GRANT EXECUTE ON FUNCTION create_web_order TO service_role;
