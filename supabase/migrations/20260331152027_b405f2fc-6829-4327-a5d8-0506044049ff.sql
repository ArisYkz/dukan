
-- Create report reason enum
CREATE TYPE public.report_reason AS ENUM ('scam', 'inappropriate', 'counterfeit');

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  buyer_phone TEXT NOT NULL,
  reason public.report_reason NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a report
CREATE POLICY "Anyone can submit a report"
  ON public.reports FOR INSERT
  TO public
  WITH CHECK (true);

-- Store owners can view reports on their store
CREATE POLICY "Store owners can view reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = reports.store_id AND stores.user_id = auth.uid()
  ));

-- Add report_count to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0;

-- Trigger function to increment report_count
CREATE OR REPLACE FUNCTION public.increment_report_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stores
  SET report_count = report_count + 1
  WHERE id = NEW.store_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_report_insert
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_report_count();
