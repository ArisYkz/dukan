-- Analytics v2: product images + previous period comparison + store funnel data
-- Overwrites the original analytics_aggregation function
CREATE OR REPLACE FUNCTION analytics_aggregation(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_granularity text DEFAULT 'daily'
) RETURNS jsonb AS $$
DECLARE
  total_orders bigint;
  total_revenue bigint;
  avg_order_value numeric;
  success_rate numeric;
  hourly_data jsonb;
  top_products_json jsonb;
  marketing_stats_json jsonb;
  series_json jsonb;
  daily_series_json jsonb;
  promo_usage_count bigint;
  promo_revenue bigint;
  total_discount bigint;
  avg_order_value_promo numeric;
  avg_order_value_regular numeric;
  prev_revenue bigint;
  prev_orders bigint;
  prev_success_rate numeric;
  store_views bigint;
  store_sales_total bigint;
  interval_dur interval;
  prev_start timestamptz;
  prev_end timestamptz;
BEGIN
  -- Compute previous period bounds
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    interval_dur := p_end_date - p_start_date;
    prev_start := p_start_date - interval_dur;
    prev_end := p_start_date;
  ELSE
    prev_start := NULL;
    prev_end := NULL;
  END IF;

  -- Create temp table for current period orders
  CREATE TEMP TABLE _filtered_orders ON COMMIT DROP AS
  SELECT
    id, total_price, status, created_at, promo_code, discount_amount
  FROM orders
  WHERE
    (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at < p_end_date)
    AND (p_store_id IS NULL OR orders.store_id = p_store_id);

  -- Overall aggregates
  SELECT
    COUNT(*) AS orders,
    SUM(total_price) AS revenue,
    AVG(total_price) AS avg_order_value,
    (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
      NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100) AS success_rate,
    COUNT(CASE WHEN promo_code IS NOT NULL THEN 1 END) AS promo_usage_count,
    SUM(CASE WHEN promo_code IS NOT NULL THEN total_price ELSE 0 END) AS promo_revenue,
    SUM(discount_amount) AS total_discount,
    AVG(CASE WHEN promo_code IS NOT NULL THEN total_price END) AS avg_order_value_promo,
    AVG(CASE WHEN promo_code IS NULL THEN total_price END) AS avg_order_value_regular
  INTO total_orders, total_revenue, avg_order_value, success_rate,
       promo_usage_count, promo_revenue, total_discount,
       avg_order_value_promo, avg_order_value_regular
  FROM _filtered_orders;

  -- Previous period aggregates
  IF prev_start IS NOT NULL AND prev_end IS NOT NULL THEN
    SELECT
      COALESCE(SUM(total_price), 0)::bigint,
      COALESCE(COUNT(*), 0)::bigint,
      COALESCE(
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
         NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100),
        0
      )
    INTO prev_revenue, prev_orders, prev_success_rate
    FROM orders
    WHERE
      created_at >= prev_start
      AND created_at < prev_end
      AND (p_store_id IS NULL OR orders.store_id = p_store_id);
  ELSE
    prev_revenue := 0;
    prev_orders := 0;
    prev_success_rate := 0;
  END IF;

  -- Store funnel data
  SELECT COALESCE(total_views, 0)::bigint, COALESCE(total_sales_count, 0)::bigint
  INTO store_views, store_sales_total
  FROM stores
  WHERE id = p_store_id;

  IF store_views IS NULL THEN
    store_views := 0;
    store_sales_total := 0;
  END IF;

  -- Top products (join with products for image_url)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name', tp.name,
        'units_sold', tp.units_sold,
        'revenue', tp.revenue,
        'share', CASE WHEN total_revenue > 0 THEN (tp.revenue * 100.0 / total_revenue) ELSE 0 END,
        'product_id', tp.product_id,
        'image_url', tp.image_url
      )
    ),
    '[]'::jsonb
  )
  INTO top_products_json
  FROM (
    SELECT
      oi.product_name AS name,
      SUM(oi.quantity) AS units_sold,
      SUM(oi.product_price * oi.quantity) AS revenue,
      oi.product_id,
      p.image_url
    FROM _filtered_orders fo
    JOIN order_items oi ON fo.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_name, oi.product_id, p.image_url
    ORDER BY revenue DESC
    LIMIT 5
  ) tp;

  -- Hourly distribution of order counts (0-23, across all days)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('hour', hd.hour, 'count', hd.count)
    ),
    '[]'::jsonb
  )
  INTO series_json
  FROM (
    SELECT
      EXTRACT(HOUR FROM created_at)::integer AS hour,
      COUNT(*) AS count
    FROM _filtered_orders
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  ) hd;

  -- Daily breakdown: period (date), revenue, orders
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'period', db.period,
        'revenue', db.revenue,
        'orders', db.orders
      )
    ),
    '[]'::jsonb
  )
  INTO daily_series_json
  FROM (
    SELECT
      date_trunc('day', created_at)::date::text AS period,
      SUM(total_price)::bigint AS revenue,
      COUNT(*)::bigint AS orders
    FROM _filtered_orders
    GROUP BY date_trunc('day', created_at)::date::text
    ORDER BY period
  ) db;

  -- Marketing stats
  SELECT jsonb_build_object(
    'promo_usage_count', COALESCE(promo_usage_count, 0),
    'promo_roi', CASE
      WHEN COALESCE(total_discount, 0) > 0
      THEN ((promo_revenue - total_discount) * 100.0 / total_discount)
      ELSE 0
    END,
    'avg_order_value_promo', COALESCE(avg_order_value_promo, 0),
    'avg_order_value_regular', COALESCE(avg_order_value_regular, 0),
    'total_discount', COALESCE(total_discount, 0)
  )
  INTO marketing_stats_json;

  -- Hourly breakdown (only when granularity = 'hourly')
  IF p_granularity = 'hourly' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'hour', hour_bucket,
        'revenue', revenue,
        'orders', orders,
        'avg_order_value', avg_order_value,
        'success_rate', success_rate
      )
    )
    INTO hourly_data
    FROM (
      SELECT
        date_trunc('hour', created_at) AS hour_bucket,
        COUNT(*) AS orders,
        SUM(total_price) AS revenue,
        AVG(total_price) AS avg_order_value,
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
          NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100) AS success_rate
      FROM _filtered_orders
      GROUP BY date_trunc('hour', created_at)
      ORDER BY hour_bucket
    ) h;
  ELSE
    hourly_data := '[]'::jsonb;
  END IF;

  DROP TABLE IF EXISTS _filtered_orders;

  RETURN jsonb_build_object(
    'revenue', COALESCE(total_revenue, 0),
    'orders', COALESCE(total_orders, 0),
    'avg_order_value', COALESCE(avg_order_value, 0),
    'success_rate', COALESCE(success_rate, 0),
    'top_products', COALESCE(top_products_json, '[]'::jsonb),
    'marketing_stats', COALESCE(marketing_stats_json, '{}'::jsonb),
    'series', COALESCE(series_json, '[]'::jsonb),
    'daily_series', COALESCE(daily_series_json, '[]'::jsonb),
    'hourly', COALESCE(hourly_data, '[]'::jsonb),
    'prev_revenue', COALESCE(prev_revenue, 0),
    'prev_orders', COALESCE(prev_orders, 0),
    'prev_success_rate', COALESCE(prev_success_rate, 0),
    'store_views', COALESCE(store_views, 0),
    'store_sales_total', COALESCE(store_sales_total, 0)
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
