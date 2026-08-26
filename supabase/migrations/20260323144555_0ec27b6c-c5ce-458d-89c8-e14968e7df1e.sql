
-- Add missing columns to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hero_image_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hero_title text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hero_subtitle text;

-- Create product_images table if not exists
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  position integer DEFAULT 0,
  is_main boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- RLS for product_images
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view product images' AND tablename = 'product_images') THEN
    CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage product images' AND tablename = 'product_images') THEN
    CREATE POLICY "Store owners can manage product images" ON public.product_images FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
        WHERE p.id = product_images.product_id AND s.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Create store-assets bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true) ON CONFLICT (id) DO NOTHING;

-- Create qr-codes bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true) ON CONFLICT (id) DO NOTHING;

-- RLS for store-assets bucket
CREATE POLICY "Public read store-assets" ON storage.objects FOR SELECT USING (bucket_id = 'store-assets');
CREATE POLICY "Auth upload store-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update store-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete store-assets" ON storage.objects FOR DELETE USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');

-- RLS for qr-codes bucket
CREATE POLICY "Public read qr-codes" ON storage.objects FOR SELECT USING (bucket_id = 'qr-codes');
CREATE POLICY "Auth upload qr-codes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update qr-codes" ON storage.objects FOR UPDATE USING (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete qr-codes" ON storage.objects FOR DELETE USING (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');
