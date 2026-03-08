
-- Add shipping fields to orders
ALTER TABLE public.orders ADD COLUMN shipping_type text NOT NULL DEFAULT 'cod';
ALTER TABLE public.orders ADD COLUMN shipping_cost bigint NOT NULL DEFAULT 0;

-- Add work type to order_items
ALTER TABLE public.order_items ADD COLUMN work_type text NOT NULL DEFAULT 'wift';
