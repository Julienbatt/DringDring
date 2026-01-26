-- Exclude cancelled deliveries from billing views
DROP VIEW IF EXISTS public.view_city_billing_shops CASCADE;
CREATE OR REPLACE VIEW public.view_city_billing_shops
WITH (security_invoker = true) AS
SELECT
    s.id AS shop_id,
    s.name AS shop_name,
    c.id AS city_id,
    c.name AS city_name,
    date_trunc('month', d.delivery_date)::date AS billing_month,
    COUNT(d.id) AS total_deliveries,
    SUM(f.share_city) AS total_subvention_due,
    SUM(f.total_price) AS total_volume_chf
FROM delivery d
JOIN shop s ON s.id = d.shop_id
JOIN city c ON c.id = s.city_id
JOIN delivery_financial f ON f.delivery_id = d.id
LEFT JOIN LATERAL (
    SELECT status
    FROM delivery_status
    WHERE delivery_id = d.id
    ORDER BY updated_at DESC
    LIMIT 1
) st ON true
WHERE COALESCE(st.status, '') <> 'cancelled'
GROUP BY s.id, s.name, c.id, c.name, date_trunc('month', d.delivery_date)::date;

DROP VIEW IF EXISTS public.view_city_billing CASCADE;
CREATE OR REPLACE VIEW public.view_city_billing
WITH (security_invoker = true) AS
SELECT
    c.id AS city_id,
    c.name AS city_name,
    date_trunc('month', d.delivery_date)::date AS billing_month,
    COUNT(d.id) AS total_deliveries,
    SUM(f.share_city) AS total_amount_due,
    SUM(f.total_price) AS total_volume_chf
FROM delivery d
JOIN shop s ON s.id = d.shop_id
JOIN city c ON c.id = s.city_id
JOIN delivery_financial f ON f.delivery_id = d.id
LEFT JOIN LATERAL (
    SELECT status
    FROM delivery_status
    WHERE delivery_id = d.id
    ORDER BY updated_at DESC
    LIMIT 1
) st ON true
WHERE COALESCE(st.status, '') <> 'cancelled'
GROUP BY c.id, c.name, date_trunc('month', d.delivery_date)::date;

DROP VIEW IF EXISTS public.view_hq_billing_shops CASCADE;
CREATE OR REPLACE VIEW public.view_hq_billing_shops
WITH (security_invoker = true) AS
SELECT
    h.name AS hq_name,
    s.id AS shop_id,
    s.name AS shop_name,
    c.name AS city_name,
    date_trunc('month', d.delivery_date)::date AS billing_month,
    COUNT(d.id) AS total_deliveries,
    SUM(f.share_city + f.share_admin_region) AS total_subvention_due,
    SUM(f.total_price) AS total_volume_chf,
    (bp.id IS NOT NULL) AS is_frozen
FROM delivery d
JOIN shop s ON s.id = d.shop_id
JOIN city c ON c.id = s.city_id
LEFT JOIN hq h ON h.id = s.hq_id
JOIN delivery_financial f ON f.delivery_id = d.id
LEFT JOIN billing_period bp ON bp.shop_id = s.id AND bp.period_month = date_trunc('month', d.delivery_date)::date
LEFT JOIN LATERAL (
    SELECT status
    FROM delivery_status
    WHERE delivery_id = d.id
    ORDER BY updated_at DESC
    LIMIT 1
) st ON true
WHERE COALESCE(st.status, '') <> 'cancelled'
GROUP BY h.name, s.id, s.name, c.name, date_trunc('month', d.delivery_date)::date, bp.id;
