-- Add a unified categories table and ensure products store a category reference.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT;

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_store_id_name_unique ON public.categories (store_id, name);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Store owners can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Store owners can update categories" ON public.categories;
DROP POLICY IF EXISTS "Store owners can delete categories" ON public.categories;

CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Store owners can insert categories" ON public.categories FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores WHERE stores.id = categories.store_id AND stores.user_id = auth.uid()
  )
);
CREATE POLICY "Store owners can update categories" ON public.categories FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.stores WHERE stores.id = categories.store_id AND stores.user_id = auth.uid()
  )
);
CREATE POLICY "Store owners can delete categories" ON public.categories FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.stores WHERE stores.id = categories.store_id AND stores.user_id = auth.uid()
  )
);
