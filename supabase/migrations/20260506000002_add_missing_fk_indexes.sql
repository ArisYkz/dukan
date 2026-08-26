-- Add indexes for 9 unindexed foreign-key columns identified in audit H8.
-- These columns are the join targets for the most common dashboard queries.
-- Without them, every join on these FKs triggers a sequential scan.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_contacts_store_id ON public.order_contacts(store_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_promo_codes_store_id ON public.store_promo_codes(store_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_store_id ON public.reviews(store_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_store_id ON public.reports(store_id);
