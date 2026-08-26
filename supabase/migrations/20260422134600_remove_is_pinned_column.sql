-- 1. 删除索引（如果存在）
DROP INDEX IF EXISTS public.idx_products_is_pinned;

-- 2. 删除字段（添加 IF EXISTS 确保不会因为重复运行而报错）
ALTER TABLE public.products 
DROP COLUMN IF EXISTS is_pinned;