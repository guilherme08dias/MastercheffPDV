-- RENUMBER CURRENT OPEN SHIFT (Fix 1320 Issue)
WITH current_shift_orders AS (
    SELECT 
        o.id, 
        ROW_NUMBER() OVER (ORDER BY o.created_at ASC) as new_seq
    FROM public.orders o
    JOIN public.shifts s ON o.shift_id = s.id
    WHERE s.status = 'open'
)
UPDATE public.orders
SET daily_number = cso.new_seq
FROM current_shift_orders cso
WHERE public.orders.id = cso.id;
