CREATE OR REPLACE FUNCTION public.calculate_total_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_subtotal bigint;
  v_include_ppn boolean;
  v_total bigint;
begin
  select sum(quantity * price_per_unit) into v_subtotal
  from public.order_items
  where order_id = new.order_id;

  select include_ppn into v_include_ppn
  from public.orders
  where id = new.order_id;

  if v_include_ppn then
    v_total := v_subtotal + (v_subtotal * 11 / 100);
  else
    v_total := v_subtotal;
  end if;

  update public.orders
  set total_price = v_total
  where id = new.order_id;
  return new;
end;
$function$;