-- 1. Create po_periods table
CREATE TABLE public.po_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.po_periods ENABLE ROW LEVEL SECURITY;

-- 3. RLS: Everyone authenticated can read
CREATE POLICY "Authenticated users can view po_periods" ON public.po_periods FOR
SELECT TO authenticated USING (true);

-- 4. RLS: Admin/superadmin can insert
CREATE POLICY "Admin can insert po_periods" ON public.po_periods FOR INSERT TO authenticated
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE
                id = auth.uid ()
                AND role IN ('admin', 'superadmin')
        )
    );

-- 5. RLS: Admin/superadmin can update
CREATE POLICY "Admin can update po_periods" ON public.po_periods
FOR UPDATE
    TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE
                id = auth.uid ()
                AND role IN ('admin', 'superadmin')
        )
    )
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE
                id = auth.uid ()
                AND role IN ('admin', 'superadmin')
        )
    );

-- 6. RLS: Admin/superadmin can delete
CREATE POLICY "Admin can delete po_periods" ON public.po_periods FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE
            id = auth.uid ()
            AND role IN ('admin', 'superadmin')
    )
);

-- 7. Add po_period_id to orders
ALTER TABLE public.orders
ADD COLUMN po_period_id uuid REFERENCES public.po_periods (id) ON DELETE SET NULL;