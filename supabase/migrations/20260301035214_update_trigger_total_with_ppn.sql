-- Add ppn_percentage column (0 = no PPN, >0 = PPN percentage)
ALTER TABLE public.orders
ADD COLUMN ppn_percentage integer NOT NULL DEFAULT 0;

-- Migrate existing data: set ppn_percentage = 11 where include_ppn was true
UPDATE public.orders
SET
    ppn_percentage = 11
WHERE
    include_ppn = true;

UPDATE public.orders
SET
    ppn_percentage = 0
WHERE
    include_ppn = false;

-- Update calculate_total_price to use ppn_percentage
CREATE OR REPLACE FUNCTION public.calculate_total_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_subtotal bigint;
  v_ppn_percentage integer;
  v_total bigint;
begin
  select sum(quantity * price_per_unit) into v_subtotal
  from public.order_items
  where order_id = new.order_id;

  select ppn_percentage into v_ppn_percentage
  from public.orders
  where id = new.order_id;

  if v_ppn_percentage > 0 then
    v_total := v_subtotal + (v_subtotal * v_ppn_percentage / 100);
  else
    v_total := v_subtotal;
  end if;

  update public.orders
  set total_price = v_total
  where id = new.order_id;
  return new;
end;
$function$;

-- Add trigger to recalculate total when ppn_percentage changes on orders table
CREATE OR REPLACE FUNCTION public.recalc_total_on_ppn_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_subtotal bigint;
  v_total bigint;
begin
  select coalesce(sum(quantity * price_per_unit), 0) into v_subtotal
  from public.order_items
  where order_id = new.id;

  if new.ppn_percentage > 0 then
    v_total := v_subtotal + (v_subtotal * new.ppn_percentage / 100);
  else
    v_total := v_subtotal;
  end if;

  new.total_price := v_total;
  return new;
end;
$function$;

-- Create trigger for ppn_percentage changes
DROP TRIGGER IF EXISTS recalc_total_on_ppn_change ON public.orders;

CREATE TRIGGER recalc_total_on_ppn_change
  BEFORE UPDATE OF ppn_percentage ON public.orders
  FOR EACH ROW
  WHEN (OLD.ppn_percentage IS DISTINCT FROM NEW.ppn_percentage)
  EXECUTE FUNCTION public.recalc_total_on_ppn_change();