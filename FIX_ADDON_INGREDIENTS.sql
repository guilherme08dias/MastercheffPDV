-- Fix for missing 'addon_ingredients' table
-- This table is required for the stock tracking trigger to work with addons

CREATE TABLE IF NOT EXISTS public.addon_ingredients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    addon_id UUID REFERENCES public.addons(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Security)
ALTER TABLE public.addon_ingredients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (staff) to view and manage ingredients
CREATE POLICY "Enable all access for authenticated users" 
ON public.addon_ingredients 
FOR ALL 
USING (auth.role() = 'authenticated');
