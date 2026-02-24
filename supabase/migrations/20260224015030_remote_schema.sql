drop extension if exists "pg_net";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_total_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_order_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
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
$function$
;


  create policy "Sales can delete their own customers"
  on "public"."customers"
  as permissive
  for delete
  to public
using ((auth.uid() = sales_id));



  create policy "Sales can update their own customers"
  on "public"."customers"
  as permissive
  for update
  to public
using ((auth.uid() = sales_id))
with check ((auth.uid() = sales_id));



  create policy "Sales can delete items of their own orders"
  on "public"."order_items"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.sales_id = auth.uid())))));



  create policy "Sales can insert items to their own orders"
  on "public"."order_items"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.sales_id = auth.uid())))));



  create policy "Sales can update items of their own orders"
  on "public"."order_items"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.sales_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.sales_id = auth.uid())))));



  create policy "Sales can delete own orders"
  on "public"."orders"
  as permissive
  for delete
  to public
using ((auth.uid() = sales_id));



  create policy "Sales can update own orders"
  on "public"."orders"
  as permissive
  for update
  to public
using ((auth.uid() = sales_id))
with check ((auth.uid() = sales_id));



  create policy "Sales can delete payments of their own orders"
  on "public"."payments"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = payments.order_id) AND (orders.sales_id = auth.uid())))));



  create policy "Sales can insert payments for their own orders"
  on "public"."payments"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = payments.order_id) AND (orders.sales_id = auth.uid())))));



  create policy "Sales can update payments of their own orders"
  on "public"."payments"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = payments.order_id) AND (orders.sales_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = payments.order_id) AND (orders.sales_id = auth.uid())))));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id))
with check ((auth.uid() = id));



