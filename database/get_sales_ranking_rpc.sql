-- Drop previous versions to avoid ambiguity
DROP FUNCTION IF EXISTS get_sales_ranking(text, text);
DROP FUNCTION IF EXISTS get_sales_ranking(timestamptz, timestamptz);

-- Create with TIMESTAMPTZ parameters and correct return types including category
CREATE OR REPLACE FUNCTION get_sales_ranking(start_date timestamptz, end_date timestamptz)
RETURNS TABLE (
    product_name text,
    category text,  -- Added category column
    quantity_sold numeric,
    total_revenue numeric,
    rank integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name as product_name,
        p.category as category, -- Select category from products table
        CAST(SUM(oi.quantity) AS numeric) as quantity_sold,
        CAST(SUM(oi.quantity * oi.unit_price) AS numeric) as total_revenue,
        CAST(RANK() OVER (ORDER BY SUM(oi.quantity) DESC) AS INTEGER) as rank
    FROM 
        order_items oi
    JOIN 
        orders o ON oi.order_id = o.id
    JOIN 
        products p ON oi.product_id = p.id
    WHERE 
        o.status != 'canceled'
        AND o.created_at >= start_date
        AND o.created_at <= end_date
    GROUP BY 
        p.name, p.category -- Group by category as well
    ORDER BY 
        quantity_sold DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sales_ranking(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_ranking(timestamptz, timestamptz) TO anon;
