-- RLS cleanup & admin-aware policies for core tables
set check_function_bodies = off;

-- 1. Helper function to detect admin users based on profiles.role = 'admin'
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin () to authenticated;

-- 2. Ensure RLS is enabled on all relevant tables
alter table public.profiles enable row level security;

alter table public.customers enable row level security;

alter table public.orders enable row level security;

alter table public.order_items enable row level security;

alter table public.payments enable row level security;

-- 3. Drop existing policies to avoid duplication / conflicting semantics

-- profiles
drop policy if exists "Users can view own profile" on public.profiles;

drop policy if exists "Users can update own profile" on public.profiles;

-- customers
drop policy if exists "Sales can only see their own customers" on public.customers;

drop policy if exists "Sales can insert their own customers" on public.customers;

drop policy if exists "Sales can delete their own customers" on public.customers;

drop policy if exists "Sales can update their own customers" on public.customers;

-- orders
drop policy if exists "Sales can view own orders" on public.orders;

drop policy if exists "Sales can insert own orders" on public.orders;

drop policy if exists "Sales can delete own orders" on public.orders;

drop policy if exists "Sales can update own orders" on public.orders;

-- order_items
drop policy if exists "Sales can view itemms of their own orders" on public.order_items;

drop policy if exists "Sales can delete items of their own orders" on public.order_items;

drop policy if exists "Sales can insert items to their own orders" on public.order_items;

drop policy if exists "Sales can update items of their own orders" on public.order_items;

-- payments
drop policy if exists "Sales can view payments of their own orders" on public.payments;

drop policy if exists "Sales can delete payments of their own orders" on public.payments;

drop policy if exists "Sales can insert payments for their own orders" on public.payments;

drop policy if exists "Sales can update payments of their own orders" on public.payments;

-- 4. New, consolidated policies scoped to `authenticated` with admin override

-- 4.1 profiles: user can see/update own profile; admin can manage all
create policy "Profiles: user can view own or admin all" on public.profiles as permissive for
select to authenticated using (
        id = auth.uid ()
        or public.is_admin ()
    );

create policy "Profiles: user can update own or admin all" on public.profiles as permissive
for update
    to authenticated using (
        id = auth.uid ()
        or public.is_admin ()
    )
with
    check (
        id = auth.uid ()
        or public.is_admin ()
    );

-- 4.2 customers: sales manage own customers; admin can manage all
create policy "Customers: sales manage own or admin all" on public.customers as permissive for all to authenticated using (
    sales_id = auth.uid ()
    or public.is_admin ()
)
with
    check (
        sales_id = auth.uid ()
        or public.is_admin ()
    );

-- 4.3 orders: sales manage own orders; admin can manage all
create policy "Orders: sales manage own or admin all" on public.orders as permissive for all to authenticated using (
    sales_id = auth.uid ()
    or public.is_admin ()
)
with
    check (
        sales_id = auth.uid ()
        or public.is_admin ()
    );

-- 4.4 order_items: tied to ownership of parent order
create policy "OrderItems: sales manage items of own orders or admin all" on public.order_items as permissive for all to authenticated using (
    exists (
        select 1
        from public.orders o
        where
            o.id = order_items.order_id
            and (
                o.sales_id = auth.uid ()
                or public.is_admin ()
            )
    )
)
with
    check (
        exists (
            select 1
            from public.orders o
            where
                o.id = order_items.order_id
                and (
                    o.sales_id = auth.uid ()
                    or public.is_admin ()
                )
        )
    );

-- 4.5 payments: tied to ownership of parent order
create policy "Payments: sales manage payments of own orders or admin all" on public.payments as permissive for all to authenticated using (
    exists (
        select 1
        from public.orders o
        where
            o.id = payments.order_id
            and (
                o.sales_id = auth.uid ()
                or public.is_admin ()
            )
    )
)
with
    check (
        exists (
            select 1
            from public.orders o
            where
                o.id = payments.order_id
                and (
                    o.sales_id = auth.uid ()
                    or public.is_admin ()
                )
        )
    );