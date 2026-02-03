-- 1. Add daily_number column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'daily_number') THEN
        ALTER TABLE public.orders ADD COLUMN daily_number INTEGER;
    END IF;
END $$;

-- 2. Create function to set daily_number based on shift_id
CREATE OR REPLACE FUNCTION public.set_daily_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Force assignment of daily_number based on shift sequence
    -- This fixes the issue where orders were defaulting to 1 or null
    SELECT COALESCE(MAX(daily_number), 0) + 1
    INTO next_number
    FROM public.orders
    WHERE shift_id = NEW.shift_id;
    
    NEW.daily_number := next_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trigger_set_daily_number ON public.orders;
CREATE TRIGGER trigger_set_daily_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_daily_number();

-- 4. Update existing orders (Optional: Set to ID if null to avoid UI gaps, but only for old ones)
UPDATE public.orders SET daily_number = id WHERE daily_number IS NULL;
