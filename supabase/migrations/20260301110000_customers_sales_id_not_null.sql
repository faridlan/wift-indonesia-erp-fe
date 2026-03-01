-- Optional: make customers.sales_id NOT NULL for consistency with orders
-- Assign any existing NULL sales_id to the first available profile (prefer superadmin)
update public.customers
set sales_id = (
  select id from public.profiles
  order by case when role = 'superadmin' then 0 when role = 'admin' then 1 else 2 end
  limit 1
)
where sales_id is null;

alter table public.customers
  alter column sales_id set not null;
