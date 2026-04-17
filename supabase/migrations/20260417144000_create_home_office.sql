CREATE TABLE IF NOT EXISTS public.dias_home_office (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dias_home_office ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to anon users" ON public.dias_home_office;
CREATE POLICY "Allow all access to anon users" ON public.dias_home_office FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.dias_home_office;
CREATE POLICY "Allow all access to authenticated users" ON public.dias_home_office FOR ALL TO authenticated USING (true) WITH CHECK (true);
