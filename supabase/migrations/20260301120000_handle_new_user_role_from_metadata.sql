-- Allow handle_new_user to set profile.role from raw_user_meta_data (e.g. from invite)
set check_function_bodies = off;

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
    coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'sales')
  );

  return new;
end;
$$;
