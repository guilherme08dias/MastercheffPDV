-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create the Deduction Function
CREATE OR REPLACE FUNCTION fn_decrement_stock()
RETURNS TRIGGER AS $$
DECLARE
    ing RECORD;
    addon_ing RECORD;
    addon JSONB;
    current_stock NUMERIC;
BEGIN
    -- 1. Deduct Product Ingredients
    FOR ing IN 
        SELECT stock_item_id, quantity 
        FROM product_ingredients 
        WHERE product_id = NEW.product_id
    LOOP
        -- Perform Update
        UPDATE stock_items
        SET current_quantity = current_quantity - (ing.quantity * NEW.quantity)
        WHERE id = ing.stock_item_id
        RETURNING current_quantity INTO current_stock;

        -- Integrity Check
        IF current_stock < 0 THEN
            RAISE EXCEPTION 'Estoque insuficiente para o insumo ID % (Saldo: %)', ing.stock_item_id, current_stock;
        END IF;
    END LOOP;

    -- 2. Deduct Addon Ingredients (if any)
    -- Verify if addons_detail exists and is an array
    IF NEW.addons_detail IS NOT NULL AND jsonb_typeof(NEW.addons_detail) = 'array' THEN
        FOR addon IN SELECT * FROM jsonb_array_elements(NEW.addons_detail)
        LOOP
            -- Loop through ingredients for this addon module
            FOR addon_ing IN 
                SELECT stock_item_id, quantity 
                FROM addon_ingredients 
                WHERE addon_id = (addon->>'id')::uuid
            LOOP
                UPDATE stock_items
                SET current_quantity = current_quantity - (addon_ing.quantity * NEW.quantity)
                WHERE id = addon_ing.stock_item_id
                RETURNING current_quantity INTO current_stock;

                 -- Integrity Check for Addons
                IF current_stock < 0 THEN
                    RAISE EXCEPTION 'Estoque insuficiente para o adicional ID % (Saldo: %)', addon_ing.stock_item_id, current_stock;
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS tr_decrement_stock ON order_items;

CREATE TRIGGER tr_decrement_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION fn_decrement_stock();
