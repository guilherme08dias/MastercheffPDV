
-- Função para buscar pedidos para impressão (Poll invisível)
CREATE OR REPLACE FUNCTION get_printable_orders()
RETURNS TABLE (
    id bigint,
    daily_number integer,
    created_at timestamptz,
    customer_name text,
    customer_phone text,
    type text,
    payment_method text,
    total numeric,
    delivery_fee_snapshot numeric,
    neighborhood_id uuid,
    address_street text,
    address_number text,
    address_complement text,
    print_attempts integer, -- Importante para retry logica
    items jsonb -- Retorna itens já aninhados para facilitar
)
LANGUAGE plpgsql
SECURITY DEFINER -- Security Definer para bypass RLS e ler orders
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.daily_number,
        o.created_at,
        o.customer_name,
        o.customer_phone,
        o.type,
        o.payment_method,
        o.total,
        o.delivery_fee_snapshot,
        o.neighborhood_id,
        o.address_street,
        o.address_number,
        o.address_complement,
        o.print_attempts,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'notes', oi.notes,
                    'product_name', p.name
                )
            )
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = o.id
        ) as items
    FROM orders o
    WHERE o.printed = false
    ORDER BY o.created_at ASC;
END;
$$;

-- Função para marcar como impresso
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

-- Permissoes
GRANT EXECUTE ON FUNCTION get_printable_orders TO anon;
GRANT EXECUTE ON FUNCTION get_printable_orders TO authenticated;
GRANT EXECUTE ON FUNCTION mark_order_printed TO anon;
GRANT EXECUTE ON FUNCTION mark_order_printed TO authenticated;
