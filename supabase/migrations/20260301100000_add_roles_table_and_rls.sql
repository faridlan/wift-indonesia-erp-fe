-- Add roles master table, superadmin constraint, and RLS for roles + profiles
set check_function_bodies = off;

-- 1. Create table public.roles and seed data
create table public.roles (
  code text primary key,
  name text not null
);

insert into public.roles (code, name) values
  ('superadmin', 'Super Admin'),
  ('admin', 'Admin'),
  ('sales', 'Sales');

-- 2. Constraint: only one superadmin allowed
create unique index profiles_one_superadmin
  on public.profiles ((true))
  where role = 'superadmin';

-- 3. Helper: is_superadmin()
create or replace function public.is_superadmin()
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
      and role = 'superadmin'
  );
$$;

grant execute on function public.is_superadmin() to authenticated;

-- 4. Update is_admin() to include superadmin (so superadmin has all admin access)
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
      and role in ('admin', 'superadmin')
  );
$$;

-- 5. RLS on roles table
alter table public.roles enable row level security;

create policy "Roles: authenticated can read"
  on public.roles
  as permissive
  for select
  to authenticated
  using (true);

create policy "Roles: superadmin can insert"
  on public.roles
  as permissive
  for insert
  to authenticated
  with check (public.is_superadmin());

create policy "Roles: superadmin can update"
  on public.roles
  as permissive
  for update
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Roles: superadmin can delete"
  on public.roles
  as permissive
  for delete
  to authenticated
  using (public.is_superadmin());

-- 6. Profiles: allow superadmin to insert (e.g. after inviting user)
create policy "Profiles: superadmin can insert"
  on public.profiles
  as permissive
  for insert
  to authenticated
  with check (public.is_superadmin());

-- 7. Profiles: update policy so only superadmin can set role = 'superadmin'
drop policy if exists "Profiles: user can update own or admin all" on public.profiles;

create policy "Profiles: user can update own or admin all"
  on public.profiles
  as permissive
  for update
  to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
  )
  with check (
    id = auth.uid()
    or (
      public.is_admin()
      and (role <> 'superadmin' or public.is_superadmin())
    )
  );
