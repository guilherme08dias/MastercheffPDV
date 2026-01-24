-- Migration: Add address_complement column for apartment/block information
-- Run this in Supabase SQL Editor

ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_complement TEXT;

-- Comment explaining the column
COMMENT ON COLUMN orders.address_complement IS 'Complemento do endereço (Bloco/Nº Apartamento) para entregas';
