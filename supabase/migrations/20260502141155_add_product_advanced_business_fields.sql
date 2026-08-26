-- Add optional advanced business information fields to products table
ALTER TABLE public.products
  ADD COLUMN barcode_gtin TEXT,
  ADD COLUMN ntin TEXT,
  ADD COLUMN country_of_origin TEXT;
