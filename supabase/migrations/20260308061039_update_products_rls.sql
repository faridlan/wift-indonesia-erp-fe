-- 1. Aktifkan Row Level Security pada tabel products
alter table public.products enable row level security;

-- 2. Policy: Semua orang (termasuk anonim/pengunjung landing page) bisa melihat produk
create policy "Products: public can read" on public.products for
select using (true);

-- 3. Policy: Hanya Admin & Superadmin yang bisa Menambah produk
create policy "Products: admin can insert" on public.products for insert to authenticated
with
    check (public.is_admin ());

-- 4. Policy: Hanya Admin & Superadmin yang bisa Mengubah produk
create policy "Products: admin can update" on public.products
for update
    to authenticated using (public.is_admin ())
with
    check (public.is_admin ());

-- 5. Policy: Hanya Admin & Superadmin yang bisa Menghapus produk
create policy "Products: admin can delete" on public.products for delete to authenticated using (public.is_admin ());