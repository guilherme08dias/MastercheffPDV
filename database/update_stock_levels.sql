-- Update stock for all items to 1000
UPDATE stock_items SET current_quantity = 1000;

-- Ensure all products are marked as available
UPDATE products SET is_available = true;
