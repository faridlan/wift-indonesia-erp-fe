
-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', 'New Sales'), 
    'sales'
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_total_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  update public.orders
  set total_price = (
    select sum(quantity * price_per_unit)
    from public.order_items
    where order_id = new.order_id
  )
  where id = new.order_id;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
declare
    v_total_price bigint;
    v_total_paid bigint;
begin
    select total_price into v_total_price from public.orders where id = new.order_id;
    select sum(amount) into v_total_paid from public.payments where order_id = new.order_id;
    update public.orders
    set 
        amount_paid = v_total_paid,
        payment_status = case 
            when v_total_paid >= v_total_price then 'paid'
            when v_total_paid > 0 then 'partial'
            else 'unpaid'
        end
    where id = new.order_id;
    return new;
end;
$function$;
