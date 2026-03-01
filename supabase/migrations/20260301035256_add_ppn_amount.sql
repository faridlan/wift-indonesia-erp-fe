-- Add ppn_amount column to store the calculated PPN nominal value
ALTER TABLE public.orders
ADD COLUMN ppn_amount bigint NOT NULL DEFAULT 0;

-- Backfill ppn_amount for existing orders
UPDATE public.orders o
SET
    ppn_amount = CASE
        WHEN o.ppn_percentage > 0 THEN (
            SELECT COALESCE(
                    SUM(
                        oi.quantity * oi.price_per_unit
                    ) * o.ppn_percentage / 100, 0
                )
            FROM public.order_items oi
            WHERE
                oi.order_id = o.id
        )
        ELSE 0
    END;

-- Update calculate_total_price to also store ppn_amount
CREATE OR REPLACE FUNCTION public.calculate_total_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_subtotal bigint;
  v_ppn_percentage integer;
  v_ppn_amount bigint;
  v_total bigint;
begin
  select coalesce(sum(quantity * price_per_unit), 0) into v_subtotal
  from public.order_items
  where order_id = new.order_id;

  select ppn_percentage into v_ppn_percentage
  from public.orders
  where id = new.order_id;

  if v_ppn_percentage > 0 then
    v_ppn_amount := v_subtotal * v_ppn_percentage / 100;
    v_total := v_subtotal + v_ppn_amount;
  else
    v_ppn_amount := 0;
    v_total := v_subtotal;
  end if;

  update public.orders
  set total_price = v_total, ppn_amount = v_ppn_amount
  where id = new.order_id;
  return new;
end;
$function$;

-- Update recalc_total_on_ppn_change to also store ppn_amount
CREATE OR REPLACE FUNCTION public.recalc_total_on_ppn_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_subtotal bigint;
  v_ppn_amount bigint;
  v_total bigint;
begin
  select coalesce(sum(quantity * price_per_unit), 0) into v_subtotal
  from public.order_items
  where order_id = new.id;

  if new.ppn_percentage > 0 then
    v_ppn_amount := v_subtotal * new.ppn_percentage / 100;
    v_total := v_subtotal + v_ppn_amount;
  else
    v_ppn_amount := 0;
    v_total := v_subtotal;
  end if;

  new.total_price := v_total;
  new.ppn_amount := v_ppn_amount;
  return new;
end;
$function$;