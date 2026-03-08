-- 1. Tabel Produk (Jika belum ada)
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    created_at timestamp with time zone DEFAULT now(),
    name text NOT NULL,
    category text, -- 'Tactical', 'Casual', 'Workwear', dll
    price numeric,
    image_url text,
    slug text UNIQUE NOT NULL -- Contoh: 'kemeja-tactical-w-tac'
);

-- 2. Tabel Leads (Terintegrasi dengan Profiles)
CREATE TABLE public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    created_at timestamp with time zone DEFAULT now(),

-- Relasi ke Sales (Profiles)
sales_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE NOT NULL,

-- Relasi ke Produk
product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,

-- Metadata untuk Behavior & Tracking
utm_source text,
utm_campaign text,
fbp text, -- Meta Browser ID
fbc text, -- Meta Click ID
device_info text,
time_spent_seconds integer,

-- Tambahkan metadata JSONB untuk fleksibilitas masa depan
metadata jsonb DEFAULT '{}'::jsonb );

-- 3. Aktifkan RLS pada Leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Sales hanya bisa melihat lead milik mereka sendiri
CREATE POLICY "Sales can view own leads" ON public.leads FOR
SELECT TO authenticated USING (sales_id = auth.uid ());

-- 5. Policy: Admin & Superadmin bisa melihat semua lead
CREATE POLICY "Admins can view all leads" ON public.leads FOR
SELECT TO authenticated USING (public.is_admin ());

-- 6. Policy: Publik (Landing Page) bisa insert lead (Tanpa Auth)
-- Karena landing page diakses calon buyer, mereka tidak login.
CREATE POLICY "Public can insert leads" ON public.leads FOR INSERT TO anon,
authenticated
WITH
    CHECK (true);