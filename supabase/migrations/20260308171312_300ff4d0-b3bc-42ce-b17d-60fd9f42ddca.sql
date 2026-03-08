
-- Delete all data in correct order (respecting foreign keys)
TRUNCATE public.payments CASCADE;
TRUNCATE public.order_items CASCADE;
TRUNCATE public.orders CASCADE;
TRUNCATE public.leads CASCADE;
TRUNCATE public.customers CASCADE;
TRUNCATE public.product_images CASCADE;
TRUNCATE public.products CASCADE;
TRUNCATE public.categories CASCADE;
TRUNCATE public.po_periods CASCADE;
TRUNCATE public.profiles CASCADE;
TRUNCATE public.roles CASCADE;

-- Delete all auth users
DELETE FROM auth.users;
