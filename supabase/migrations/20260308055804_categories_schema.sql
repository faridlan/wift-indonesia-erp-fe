-- 1. Tabel Master Kategori
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    created_at timestamp with time zone DEFAULT now(),
    name text NOT NULL, -- 'Tactical', 'Casual', 'Daily Wear'
    slug text UNIQUE NOT NULL, -- 'tactical', 'casual' (untuk filter URL jika butuh)
    description text -- Opsional: Penjelasan singkat kategori
);

-- 2. Update Tabel Produk (Gunakan Foreign Key)
-- Jika tabel products sudah ada, hapus kolom category lama dan tambah category_id
ALTER TABLE public.products DROP COLUMN IF EXISTS category;

ALTER TABLE public.products
ADD COLUMN category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL;

-- 3. RLS untuk Categories (Semua orang bisa baca)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR
SELECT USING (true);

-- 4. Policy agar Admin/Superadmin bisa kelola kategori
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin ())
WITH
    CHECK (public.is_admin ());