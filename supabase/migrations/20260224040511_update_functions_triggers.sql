-- Final consolidated definitions for core functions & triggers
set check_function_bodies = off;

-- 1. Canonical handle_new_user() for auth.users -> public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New Sales'),
    'sales'
  );

  return new;
end;
$$;

-- Ensure trigger on auth.users always points to this canonical function
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 2. Canonical calculate_total_price() for order_items changes
--    Safe for INSERT, UPDATE, and DELETE on public.order_items
create or replace function public.calculate_total_price()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_order_id uuid;
begin
  v_order_id := coalesce(new.order_id, old.order_id);

  if v_order_id is null then
    return null;
  end if;

  update public.orders
  set total_price = coalesce((
    select sum(quantity * price_per_unit)
    from public.order_items
    where order_id = v_order_id
  ), 0)
  where id = v_order_id;

  return null;
end;
$$;

-- Replace any existing trigger with a single unified one
drop trigger if exists update_total_price_after_insert on public.order_items;

drop trigger if exists update_total_price_after_change on public.order_items;

create trigger update_total_price_after_change
after insert or update or delete on public.order_items
for each row
execute function public.calculate_total_price();

-- 3. Canonical update_order_payment_status() for payments changes
--    Safe for INSERT, UPDATE, and DELETE on public.payments
create or replace function public.update_order_payment_status()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_order_id uuid;
  v_total_price bigint;
  v_total_paid bigint;
begin
  v_order_id := coalesce(new.order_id, old.order_id);

  if v_order_id is null then
    return null;
  end if;

  select total_price
  into v_total_price
  from public.orders
  where id = v_order_id;

  select coalesce(sum(amount), 0)
  into v_total_paid
  from public.payments
  where order_id = v_order_id;

  update public.orders
  set
    amount_paid = v_total_paid,
    payment_status = case
      when v_total_price is not null and v_total_paid >= v_total_price then 'paid'
      when v_total_paid > 0 then 'partial'
      else 'unpaid'
    end
  where id = v_order_id;

  return null;
end;
$$;

-- Ensure trigger on payments uses the canonical function and covers all mutations
drop trigger if exists tr_update_payment_status on public.payments;

create trigger tr_update_payment_status
after insert or update or delete on public.payments
for each row
execute function public.update_order_payment_status();