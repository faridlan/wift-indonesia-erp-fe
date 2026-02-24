-- Buat tabel profil yang terelasi dengan tabel auth bawaan Supabase
create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    full_name text,
    role text default 'sales', -- Default role sebagai sales
    created_at timestamp with time zone default now()
);

-- Aktifkan Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policy: User bisa melihat profilnya sendiri
create policy "Users can view own profile" on public.profiles for
select using (auth.uid () = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id, 
    -- Mengambil full_name dari raw_user_meta_data (jika diinput saat sign up)
    coalesce(new.raw_user_meta_data->>'full_name', 'New Sales'), 
    'sales'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger berjalan di skema auth, tapi memanggil fungsi di public
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();