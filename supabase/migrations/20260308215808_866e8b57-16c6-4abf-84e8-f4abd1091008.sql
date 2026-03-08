
CREATE TABLE public.bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank accounts"
  ON public.bank_accounts FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

CREATE POLICY "Users can manage own bank accounts"
  ON public.bank_accounts FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
